import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[RECOVER-ALL] ${step}`, details || '');
};

interface RecoveryResult {
  receiptId: string;
  email: string;
  amount: number;
  transactionId: string;
  donationCreated: boolean;
  donationId?: string;
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
    logStep("Starting comprehensive recovery");

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

    // Get mode from request or default to live
    const { mode = "live" } = await req.json().catch(() => ({ mode: "live" }));

    // Initialize Stripe
    const stripeKey = mode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");
    
    if (!stripeKey) throw new Error(`Stripe ${mode} key not configured`);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find all orphaned receipts (receipts with no matching donation)
    const { data: orphanedReceipts, error: receiptError } = await supabaseAdmin
      .from('sponsorship_receipts')
      .select('*')
      .is('sponsorship_id', null)
      .eq('stripe_mode', mode);

    if (receiptError) throw receiptError;

    logStep("Found orphaned receipts", { count: orphanedReceipts?.length || 0 });

    const results: RecoveryResult[] = [];

    // Process each orphaned receipt
    for (const receipt of orphanedReceipts || []) {
      const result: RecoveryResult = {
        receiptId: receipt.id,
        email: receipt.sponsor_email,
        amount: receipt.amount,
        transactionId: receipt.transaction_id,
        donationCreated: false,
      };

      try {
        // Check if matching donation already exists
        const { data: existingDonations } = await supabaseAdmin
          .from('donations')
          .select('id')
          .eq('donor_email', receipt.sponsor_email)
          .eq('stripe_mode', mode)
          .eq('amount', receipt.amount);

        const matchingDonation = existingDonations?.find(d => {
          // Check if creation times are close (within 1 day)
          const timeDiff = Math.abs(
            new Date(receipt.created_at).getTime() - 
            new Date(receipt.transaction_date || receipt.created_at).getTime()
          );
          return timeDiff < 86400000; // 24 hours in ms
        });

        if (matchingDonation) {
          logStep("Donation already exists", { receiptId: receipt.id, donationId: matchingDonation.id });
          result.donationId = matchingDonation.id;
          results.push(result);
          continue;
        }

        // Try to get customer info from Stripe based on transaction ID
        let customerEmail = receipt.sponsor_email;
        let customerId: string | null = null;
        let paymentIntentId: string | null = null;
        let subscriptionId: string | null = null;

        // Handle different transaction ID formats
        if (receipt.transaction_id.startsWith('cs_')) {
          // Checkout Session
          try {
            const session = await stripe.checkout.sessions.retrieve(receipt.transaction_id);
            customerEmail = session.customer_email || customerEmail;
            customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
            paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
            subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;
          } catch (e) {
            logStep("Failed to retrieve checkout session", { error: e instanceof Error ? e.message : String(e) });
          }
        } else if (receipt.transaction_id.startsWith('pi_')) {
          // Payment Intent
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(receipt.transaction_id);
            customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id || null;
            paymentIntentId = paymentIntent.id;
            
            if (customerId) {
              const customer = await stripe.customers.retrieve(customerId);
              if ('email' in customer) {
                customerEmail = customer.email || customerEmail;
              }
            }
          } catch (e) {
            logStep("Failed to retrieve payment intent", { error: e instanceof Error ? e.message : String(e) });
          }
        } else if (receipt.transaction_id.startsWith('in_')) {
          // Invoice
          try {
            const invoice = await stripe.invoices.retrieve(receipt.transaction_id);
            customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;
            subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
            customerEmail = invoice.customer_email || customerEmail;
          } catch (e) {
            logStep("Failed to retrieve invoice", { error: e instanceof Error ? e.message : String(e) });
          }
        } else if (receipt.transaction_id.startsWith('ch_')) {
          // Charge
          try {
            const charge = await stripe.charges.retrieve(receipt.transaction_id);
            customerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id || null;
            paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null;
            
            if (customerId) {
              const customer = await stripe.customers.retrieve(customerId);
              if ('email' in customer) {
                customerEmail = customer.email || customerEmail;
              }
            }
          } catch (e) {
            logStep("Failed to retrieve charge", { error: e instanceof Error ? e.message : String(e) });
          }
        }

        // Look up user by email (skip if email is empty)
        const { data: profileData } = customerEmail && customerEmail.trim()
          ? await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', customerEmail)
              .maybeSingle()
          : { data: null };

        logStep("Profile lookup result", { email: customerEmail, foundProfile: !!profileData, profileId: profileData?.id });

        // Prepare donation data with constraint logic
        // CRITICAL: donor_identifier_check requires EITHER donor_id OR donor_email (not both, not neither)
        // Empty strings must be converted to null
        const donationData = {
          donor_email: profileData?.id ? null : (customerEmail?.trim() || null),
          donor_id: profileData?.id || null,
          amount: receipt.amount,
          amount_charged: receipt.amount,
          frequency: receipt.frequency || 'one-time',
          status: receipt.frequency === 'monthly' ? 'active' : 'completed',
          stripe_mode: mode,
          stripe_customer_id: customerId,
          stripe_payment_intent_id: paymentIntentId,
          stripe_subscription_id: subscriptionId,
          created_at: receipt.transaction_date || receipt.created_at,
          started_at: receipt.transaction_date || receipt.created_at,
        };

        logStep("Inserting donation with data", { 
          receiptId: receipt.id,
          donor_email: donationData.donor_email,
          donor_id: donationData.donor_id,
          amount: donationData.amount,
          hasEmail: !!donationData.donor_email,
          hasId: !!donationData.donor_id
        });

        // Create the missing donation record
        // IMPORTANT: donor_identifier_check constraint requires EITHER donor_id OR donor_email, not both
        const { data: newDonation, error: donationError } = await supabaseAdmin
          .from('donations')
          .insert(donationData)
          .select()
          .single();

        if (donationError) {
          result.error = donationError.message;
          logStep("Failed to create donation", { receiptId: receipt.id, error: donationError });
        } else {
          result.donationCreated = true;
          result.donationId = newDonation.id;
          logStep("Created donation", { receiptId: receipt.id, donationId: newDonation.id });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.error = errorMsg;
        logStep("Error processing receipt", { receiptId: receipt.id, error: errorMsg });
      }

      results.push(result);
    }

    logStep("Recovery complete", { 
      total: results.length,
      created: results.filter(r => r.donationCreated).length,
      errors: results.filter(r => r.error).length
    });

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          created: results.filter(r => r.donationCreated).length,
          alreadyExists: results.filter(r => r.donationId && !r.donationCreated).length,
          errors: results.filter(r => r.error).length,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep("Fatal error", { error: errorMsg });
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
