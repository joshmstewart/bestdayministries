import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auth check - admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role !== "admin" && roleRow?.role !== "owner") {
      throw new Error("Only admins/owners can create donations from Stripe data");
    }

    const body = await req.json();
    const { stripeItems, email, stripeMode } = body;

    if (!stripeItems || !Array.isArray(stripeItems) || stripeItems.length === 0) {
      throw new Error("stripeItems array is required");
    }
    if (!email) throw new Error("email is required");
    if (!stripeMode) throw new Error("stripeMode is required");

    console.log("[CREATE-DONATION-FROM-STRIPE] Input", { 
      email, 
      stripeMode, 
      itemCount: stripeItems.length,
      itemTypes: stripeItems.map((i: any) => i.type)
    });

    // Extract data from Stripe items
    const invoice = stripeItems.find((i: any) => i.type === "invoice");
    const charge = stripeItems.find((i: any) => i.type === "charge");
    const paymentIntent = stripeItems.find((i: any) => i.type === "payment_intent");
    const checkoutSession = stripeItems.find((i: any) => i.type === "checkout_session");

    // Get metadata from invoice line items (most reliable source)
    let metadata: Record<string, any> = {};
    let amount: number | undefined;
    let frequency = "one-time";
    let subscriptionId: string | undefined;
    let customerId: string | undefined;
    let paymentIntentId: string | undefined;
    let checkoutSessionId: string | undefined;
    let invoiceId: string | undefined;
    let chargeId: string | undefined;
    let createdAt: string | undefined;

    // Priority: invoice > checkout_session > charge > payment_intent
    if (invoice?.raw) {
      const inv = invoice.raw;
      invoiceId = inv.id;
      customerId = inv.customer;
      paymentIntentId = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id;
      amount = typeof inv.amount_paid === 'number' ? inv.amount_paid / 100 : undefined;
      createdAt = inv.created ? new Date(inv.created * 1000).toISOString() : undefined;
      
      // Get subscription info
      if (inv.subscription) {
        subscriptionId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id;
      }
      if (inv.parent?.subscription_details?.subscription) {
        subscriptionId = inv.parent.subscription_details.subscription;
        metadata = { ...inv.parent.subscription_details.metadata, ...metadata };
      }
      
      // Get metadata from line items
      const lineItems = inv.lines?.data || [];
      for (const line of lineItems) {
        if (line.metadata) {
          metadata = { ...line.metadata, ...metadata };
        }
      }
      
      // Check billing reason for frequency
      if (inv.billing_reason === 'subscription_cycle' || inv.billing_reason === 'subscription_create') {
        frequency = 'monthly';
      }
    }

    if (checkoutSession?.raw) {
      const sess = checkoutSession.raw;
      if (!customerId) customerId = sess.customer;
      if (!paymentIntentId) paymentIntentId = typeof sess.payment_intent === 'string' ? sess.payment_intent : sess.payment_intent?.id;
      if (!amount) amount = typeof sess.amount_total === 'number' ? sess.amount_total / 100 : undefined;
      if (!createdAt) createdAt = sess.created ? new Date(sess.created * 1000).toISOString() : undefined;
      checkoutSessionId = sess.id;
      if (!subscriptionId && sess.subscription) {
        subscriptionId = typeof sess.subscription === 'string' ? sess.subscription : sess.subscription.id;
      }
      if (sess.metadata) {
        metadata = { ...sess.metadata, ...metadata };
      }
      if (sess.mode === 'subscription') {
        frequency = 'monthly';
      }
    }

    if (charge?.raw) {
      const ch = charge.raw;
      chargeId = ch.id;
      if (!customerId) customerId = ch.customer;
      if (!paymentIntentId) paymentIntentId = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
      if (!amount) amount = typeof ch.amount === 'number' ? ch.amount / 100 : undefined;
      if (!createdAt) createdAt = ch.created ? new Date(ch.created * 1000).toISOString() : undefined;
      if (ch.metadata) {
        metadata = { ...ch.metadata, ...metadata };
      }
    }

    if (paymentIntent?.raw) {
      const pi = paymentIntent.raw;
      if (!customerId) customerId = pi.customer;
      if (!paymentIntentId) paymentIntentId = pi.id;
      if (!amount) amount = typeof pi.amount === 'number' ? pi.amount / 100 : undefined;
      if (!createdAt) createdAt = pi.created ? new Date(pi.created * 1000).toISOString() : undefined;
      if (pi.metadata) {
        metadata = { ...pi.metadata, ...metadata };
      }
    }

    // Override frequency from metadata if present
    if (metadata.frequency === 'monthly') {
      frequency = 'monthly';
    }

    // Check if this is a donation (not a sponsorship or marketplace order)
    const donationType = metadata.type || metadata.donation_type;
    if (donationType && donationType !== 'donation' && donationType !== 'general') {
      console.log("[CREATE-DONATION-FROM-STRIPE] Skipping - not a donation type", { donationType, metadata });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `This appears to be a ${donationType}, not a general donation`,
          metadata 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!amount) {
      throw new Error("Could not extract amount from Stripe data");
    }

    // Determine transaction key for combined record (invoice > PI > charge)
    const transactionKey = invoiceId || paymentIntentId || chargeId;
    if (!transactionKey) {
      throw new Error("Could not determine transaction key from Stripe data");
    }

    // Look up user by email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    const donorId = profile?.id || null;
    const donorEmail = donorId ? null : email; // Only set email if no user ID

    // Determine status
    const status = frequency === 'monthly' ? 'active' : 'completed';

    console.log("[CREATE-DONATION-FROM-STRIPE] Processing", {
      donorId,
      donorEmail,
      amount,
      frequency,
      status,
      stripeMode,
      customerId,
      subscriptionId,
      paymentIntentId,
      invoiceId,
      chargeId,
      transactionKey,
      metadata
    });

    // Check if combined transaction already exists (idempotency)
    let existingTransaction: any = null;
    
    if (invoiceId) {
      const { data } = await supabaseAdmin
        .from("donation_stripe_transactions")
        .select("*")
        .eq("stripe_mode", stripeMode)
        .eq("stripe_invoice_id", invoiceId)
        .maybeSingle();
      existingTransaction = data;
    }
    
    if (!existingTransaction && paymentIntentId) {
      const { data } = await supabaseAdmin
        .from("donation_stripe_transactions")
        .select("*")
        .eq("stripe_mode", stripeMode)
        .eq("stripe_payment_intent_id", paymentIntentId)
        .is("stripe_invoice_id", null)
        .maybeSingle();
      existingTransaction = data;
    }

    if (existingTransaction) {
      console.log("[CREATE-DONATION-FROM-STRIPE] Combined transaction already exists", { id: existingTransaction.id });
      return new Response(
        JSON.stringify({
          success: true,
          action: "already_exists",
          message: "Combined transaction already exists for this payment",
          combinedTransaction: existingTransaction,
          donationId: existingTransaction.donation_id,
          receiptId: existingTransaction.receipt_id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find existing donation (for subscription renewals, don't create a new one)
    let existingDonation: any = null;
    
    if (subscriptionId) {
      const { data } = await supabaseAdmin
        .from("donations")
        .select("*")
        .eq("stripe_mode", stripeMode)
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      existingDonation = data;
    }
    
    if (!existingDonation && paymentIntentId) {
      const { data } = await supabaseAdmin
        .from("donations")
        .select("*")
        .eq("stripe_mode", stripeMode)
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();
      existingDonation = data;
    }

    let donationRecord = existingDonation;

    // If no existing donation, create one
    if (!existingDonation) {
      const donationData: any = {
        donor_id: donorId,
        donor_email: donorEmail,
        amount,
        amount_charged: amount,
        frequency,
        status,
        stripe_mode: stripeMode,
        stripe_customer_id: customerId || null,
        stripe_subscription_id: subscriptionId || null,
        stripe_payment_intent_id: paymentIntentId || null,
        stripe_checkout_session_id: checkoutSessionId || null,
        created_at: createdAt || new Date().toISOString(),
        started_at: createdAt || new Date().toISOString(),
      };

      const { data: newDonation, error: insertError } = await supabaseAdmin
        .from("donations")
        .insert(donationData)
        .select()
        .single();

      if (insertError) {
        console.error("[CREATE-DONATION-FROM-STRIPE] Insert error", insertError);
        throw new Error(`Failed to create donation: ${insertError.message}`);
      }

      donationRecord = newDonation;
      console.log("[CREATE-DONATION-FROM-STRIPE] Created donation", { id: newDonation.id });
    } else {
      console.log("[CREATE-DONATION-FROM-STRIPE] Using existing donation", { id: existingDonation.id });
    }

    // Create receipt for this specific transaction (keyed by invoice_id or PI)
    const receiptTransactionId = invoiceId || `pi_${paymentIntentId}` || `ch_${chargeId}`;
    
    // Check if receipt already exists
    const { data: existingReceipt } = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("*")
      .eq("transaction_id", receiptTransactionId)
      .eq("stripe_mode", stripeMode)
      .maybeSingle();

    let receiptRecord = existingReceipt;

    if (!existingReceipt) {
      const { data: receiptSettings } = await supabaseAdmin
        .from("receipt_settings")
        .select("organization_name, organization_ein")
        .limit(1)
        .maybeSingle();

      const receiptData = {
        sponsor_email: email,
        sponsor_name: email.split('@')[0],
        user_id: donorId,
        bestie_name: 'General Support',
        amount,
        frequency,
        transaction_id: receiptTransactionId,
        transaction_date: createdAt || new Date().toISOString(),
        stripe_mode: stripeMode,
        organization_name: receiptSettings?.organization_name || 'Best Day Ministries',
        organization_ein: receiptSettings?.organization_ein || '00-0000000',
        receipt_number: `RCP-API-${Date.now()}-${donationRecord.id.substring(0, 8)}`,
        tax_year: new Date(createdAt || new Date()).getFullYear(),
      };

      const { data: newReceipt, error: receiptError } = await supabaseAdmin
        .from("sponsorship_receipts")
        .insert(receiptData)
        .select()
        .single();

      if (receiptError) {
        console.warn("[CREATE-DONATION-FROM-STRIPE] Receipt creation failed", receiptError);
      } else {
        receiptRecord = newReceipt;
        console.log("[CREATE-DONATION-FROM-STRIPE] Created receipt", { id: newReceipt.id });
      }
    } else {
      console.log("[CREATE-DONATION-FROM-STRIPE] Using existing receipt", { id: existingReceipt.id });
    }

    // Create the combined transaction record
    const combinedData = {
      stripe_mode: stripeMode,
      email: email.toLowerCase(),
      donor_id: donorId,
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId || null,
      stripe_invoice_id: invoiceId || null,
      stripe_payment_intent_id: paymentIntentId || null,
      stripe_charge_id: chargeId || null,
      amount,
      currency: 'usd',
      status,
      frequency,
      transaction_date: createdAt || new Date().toISOString(),
      raw_invoice: invoice?.raw || null,
      raw_payment_intent: paymentIntent?.raw || null,
      raw_charge: charge?.raw || null,
      raw_checkout_session: checkoutSession?.raw || null,
      merged_metadata: metadata,
      donation_id: donationRecord?.id || null,
      receipt_id: receiptRecord?.id || null,
    };

    const { data: combinedTransaction, error: combinedError } = await supabaseAdmin
      .from("donation_stripe_transactions")
      .insert(combinedData)
      .select()
      .single();

    if (combinedError) {
      console.warn("[CREATE-DONATION-FROM-STRIPE] Combined transaction creation failed", combinedError);
    } else {
      console.log("[CREATE-DONATION-FROM-STRIPE] Created combined transaction", { id: combinedTransaction.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: existingDonation ? "receipt_and_transaction_created" : "all_created",
        message: existingDonation 
          ? "Created receipt and combined transaction for existing donation" 
          : "Created donation, receipt, and combined transaction",
        donation: donationRecord,
        receipt: receiptRecord || null,
        combinedTransaction: combinedTransaction || null,
        existingDonation: !!existingDonation,
        extractedData: {
          amount,
          frequency,
          status,
          customerId,
          subscriptionId,
          paymentIntentId,
          invoiceId,
          chargeId,
          transactionKey,
          metadata
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CREATE-DONATION-FROM-STRIPE] Error", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
