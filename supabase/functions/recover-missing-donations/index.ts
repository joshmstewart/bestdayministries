import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[RECOVER-DONATIONS] ${step}`, details || '');
};

interface TransactionData {
  charge_id: string;
  amount?: number; // Optional since we can get from charge
  created?: string; // Optional since we can get from charge
  currency?: string; // Optional since we can get from charge
  description?: string;
}

interface RecoveryResult {
  chargeId: string;
  customerId: string;
  email: string | null;
  amount: number;
  donationCreated: boolean;
  receiptGenerated: boolean;
  receiptSent: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Starting recovery process");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .single();

    if (!roleData) throw new Error("Admin access required");

    logStep("Admin verified", { userId: user.id });

    // Parse request body
    const { transactions, mode = "live" } = await req.json();
    if (!transactions || !Array.isArray(transactions)) {
      throw new Error("Invalid transactions data");
    }

    logStep("Processing transactions", { count: transactions.length, mode });

    // Initialize Stripe
    const stripeKey = mode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) throw new Error(`Stripe ${mode} key not configured`);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const results: RecoveryResult[] = [];

    // Process each transaction
    for (const txn of transactions as TransactionData[]) {
      const result: RecoveryResult = {
        chargeId: txn.charge_id,
        customerId: '',
        email: null,
        amount: 0,
        donationCreated: false,
        receiptGenerated: false,
        receiptSent: false,
      };

      try {
        logStep("Processing charge", { chargeId: txn.charge_id });

        // Phase 1: Retrieve charge from Stripe to get all transaction details
        const charge = await stripe.charges.retrieve(txn.charge_id);
        
        if (!charge) {
          result.error = "Charge not found in Stripe";
          results.push(result);
          continue;
        }

        // Extract customer ID from charge
        const customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
        if (!customerId) {
          result.error = "No customer ID found on charge";
          results.push(result);
          continue;
        }

        result.customerId = customerId;
        result.amount = charge.amount / 100; // Convert to dollars
        
        logStep("Charge retrieved", { 
          chargeId: charge.id,
          customerId,
          amount: charge.amount,
          created: charge.created 
        });

        // Get customer details for email
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          result.error = "Customer deleted in Stripe";
          results.push(result);
          continue;
        }

        result.email = customer.email || null;
        
        if (!customer.email) {
          result.error = "No email found for customer";
          results.push(result);
          continue;
        }

        logStep("Customer fetched", { email: customer.email });

        // Check if donation already exists
        const { data: existingDonation } = await supabaseAdmin
          .from("donations")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .eq("stripe_mode", mode)
          .maybeSingle();

        if (existingDonation) {
          result.error = "Donation already exists";
          results.push(result);
          continue;
        }

        // Check if user exists
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name")
          .eq("email", customer.email)
          .maybeSingle();

        // Determine if this is a subscription payment
        // If charge has an invoice, it's likely a subscription payment
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
        });
        const isSubscription = !!charge.invoice;
        const subscription = isSubscription ? subscriptions.data[0] : null;

        // Phase 2: Create donation record
        const chargeDate = new Date(charge.created * 1000); // Stripe timestamps are in seconds
        const donationData = {
          donor_id: profile?.id || null,
          donor_email: customer.email,
          amount: charge.amount / 100, // Convert cents to dollars
          amount_charged: charge.amount / 100,
          frequency: isSubscription ? "monthly" : "one-time",
          status: isSubscription ? "active" : "completed",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription?.id || null,
          stripe_mode: mode,
          created_at: chargeDate.toISOString(),
          started_at: chargeDate.toISOString(),
          ended_at: isSubscription ? null : chargeDate.toISOString(),
        };

        const { data: donation, error: donationError } = await supabaseAdmin
          .from("donations")
          .insert(donationData)
          .select()
          .single();

        if (donationError) {
          result.error = `Failed to create donation: ${donationError.message}`;
          results.push(result);
          continue;
        }

        result.donationCreated = true;
        logStep("Donation created", { donationId: donation.id });

        // Phase 3: Generate and send receipt
        const receiptYear = chargeDate.getFullYear();
        
        // Get receipt settings
        const { data: receiptSettings } = await supabaseAdmin
          .from("receipt_settings")
          .select("*")
          .single();

        if (!receiptSettings) {
          result.error = "Receipt settings not configured";
          results.push(result);
          continue;
        }

        // Generate receipt number
        const { count: receiptCount } = await supabaseAdmin
          .from("sponsorship_receipts")
          .select("*", { count: "exact", head: true })
          .eq("tax_year", receiptYear);

        const receiptNumber = `${receiptYear}-${String((receiptCount || 0) + 1).padStart(6, "0")}`;

        // Create receipt record using charge ID as transaction ID
        const receiptData = {
          transaction_id: charge.id, // Use actual Stripe charge ID
          sponsorship_id: null,
          user_id: profile?.id || null,
          sponsor_email: customer.email,
          amount: charge.amount / 100,
          organization_name: receiptSettings.organization_name,
          organization_ein: receiptSettings.organization_ein,
          receipt_number: receiptNumber,
          tax_year: receiptYear,
          status: "generated",
          generated_at: new Date().toISOString(),
        };

        const { data: receipt, error: receiptError } = await supabaseAdmin
          .from("sponsorship_receipts")
          .insert(receiptData)
          .select()
          .single();

        if (receiptError) {
          result.error = `Failed to create receipt: ${receiptError.message}`;
          results.push(result);
          continue;
        }

        result.receiptGenerated = true;
        logStep("Receipt created", { receiptId: receipt.id });

        // Send receipt email
        try {
          const { error: sendError } = await supabaseAdmin.functions.invoke(
            "send-sponsorship-receipt",
            {
              body: {
                receiptId: receipt.id,
                recipientEmail: customer.email,
                recipientName: profile?.display_name || "Donor",
              },
            }
          );

          if (sendError) {
            result.error = `Receipt created but email failed: ${sendError.message}`;
          } else {
            result.receiptSent = true;
            logStep("Receipt sent", { receiptId: receipt.id });
          }
        } catch (emailError: any) {
          result.error = `Receipt created but email failed: ${emailError?.message || 'Unknown error'}`;
        }

        results.push(result);
      } catch (error: any) {
        result.error = error?.message || 'Unknown error';
        results.push(result);
        logStep("Error processing transaction", { error: error?.message || 'Unknown error' });
      }
    }

    // Generate summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.donationCreated && r.receiptGenerated).length,
      donationsCreated: results.filter(r => r.donationCreated).length,
      receiptsGenerated: results.filter(r => r.receiptGenerated).length,
      receiptsSent: results.filter(r => r.receiptSent).length,
      failed: results.filter(r => r.error).length,
    };

    logStep("Recovery complete", summary);

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { error: error?.message || 'Unknown error' });
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
