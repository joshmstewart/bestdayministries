import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

        // Check if donation already exists for this specific charge
        // Extract payment intent ID (could be string or object)
        const paymentIntentId = typeof charge.payment_intent === 'string' 
          ? charge.payment_intent 
          : charge.payment_intent?.id || null;
        
        logStep("Checking for existing donation", { 
          chargeId: txn.charge_id, 
          paymentIntentId,
          mode 
        });
        
        // Only check for duplicates if we have a valid payment intent ID
        let existingDonation = null;
        let existingError = null;
        
        if (paymentIntentId) {
          const result = await supabaseAdmin
            .from("donations")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .eq("stripe_mode", mode)
            .maybeSingle();
          
          existingDonation = result.data;
          existingError = result.error;
        } else {
          logStep("No payment intent ID - skipping duplicate check");
        }

        if (existingError) {
          logStep("ERROR checking existing donation", { error: existingError.message, code: existingError.code });
          result.error = `Database error checking duplicates: ${existingError.message}`;
          results.push(result);
          continue;
        }

        if (existingDonation) {
          logStep("Duplicate donation found", { existingId: existingDonation.id });
          result.error = "Donation already exists for this charge";
          results.push(result);
          continue;
        }
        
        logStep("No duplicate found, proceeding with donation creation");

        // Check if user exists
        logStep("Looking up user profile", { email: customer.email });
        
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name")
          .eq("email", customer.email)
          .maybeSingle();
        
        if (profileError) {
          logStep("ERROR fetching profile", { error: profileError.message, code: profileError.code });
        } else if (profile) {
          logStep("Profile found", { 
            profileId: profile.id, 
            displayName: profile.display_name,
            hasValidId: !!profile.id 
          });
        } else {
          logStep("No profile found - will create guest donation");
        }

        // CRITICAL: Validate profile has a valid ID before using it
        const hasValidProfile = profile && profile.id;
        logStep("Profile validation", { 
          profileExists: !!profile, 
          profileId: profile?.id,
          hasValidProfile 
        });

        // Determine if this is a subscription payment
        logStep("Checking for subscription", { customerId, hasInvoice: !!charge.invoice });
        
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
        });
        const isSubscription = !!charge.invoice;
        const subscription = isSubscription ? subscriptions.data[0] : null;
        
        logStep("Subscription check complete", { 
          isSubscription, 
          subscriptionId: subscription?.id || null 
        });

        // Check if this is a sponsorship by looking at payment intent metadata
        if (paymentIntentId) {
          logStep("Checking if charge is a sponsorship", { paymentIntentId });
          
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.metadata?.bestie_id) {
              logStep("SKIPPING: This is a sponsorship charge", { 
                bestieId: paymentIntent.metadata.bestie_id,
                chargeId: txn.charge_id 
              });
              result.error = "Skipped: This is a sponsorship, not a general fund donation";
              results.push(result);
              continue;
            }
            
            logStep("Confirmed: This is a general fund donation (no bestie_id in metadata)");
          } catch (piError) {
            const errorMessage = piError instanceof Error ? piError.message : 'Unknown error';
            logStep("ERROR retrieving payment intent", { error: errorMessage });
            result.error = `Failed to retrieve payment intent: ${errorMessage}`;
            results.push(result);
            continue;
          }
        } else {
          logStep("WARNING: No payment intent ID - cannot verify if sponsorship");
        }

        // Phase 2: Create donation record
        const chargeDate = new Date(charge.created * 1000); // Stripe timestamps are in seconds
        
        // CRITICAL: donor_identifier_check constraint requires EXACTLY ONE of donor_id OR donor_email
        // If profile exists AND has valid ID, use donor_id and set donor_email to null
        // Otherwise, use donor_email and set donor_id to null
        const donationData = {
          donor_id: hasValidProfile ? profile.id : null,
          donor_email: hasValidProfile ? null : customer.email,
          amount: charge.amount / 100, // Convert cents to dollars
          amount_charged: charge.amount / 100,
          frequency: isSubscription ? "monthly" : "one-time",
          status: isSubscription ? "active" : "completed",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription?.id || null,
          stripe_payment_intent_id: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || null,
          stripe_mode: mode,
          created_at: chargeDate.toISOString(),
          started_at: chargeDate.toISOString(),
          ended_at: isSubscription ? null : chargeDate.toISOString(),
        };

        logStep("Inserting donation record", { 
          donor_id: donationData.donor_id,
          donor_email: donationData.donor_email,
          amount: donationData.amount,
          frequency: donationData.frequency,
          status: donationData.status,
          stripe_customer_id: donationData.stripe_customer_id,
          stripe_payment_intent_id: donationData.stripe_payment_intent_id
        });

        const { data: donation, error: donationError } = await supabaseAdmin
          .from("donations")
          .insert(donationData)
          .select()
          .single();

        if (donationError) {
          logStep("ERROR creating donation", { 
            error: donationError.message, 
            code: donationError.code,
            details: donationError.details,
            hint: donationError.hint,
            chargeId: txn.charge_id
          });
          result.error = `Failed to create donation: ${donationError.message} (Code: ${donationError.code})`;
          results.push(result);
          continue;
        }

        result.donationCreated = true;
        logStep("Donation created successfully", { donationId: donation.id, amount: donation.amount });

        // Phase 3: Generate and send receipt
        const receiptYear = chargeDate.getFullYear();
        
        logStep("Starting receipt generation", { donationId: donation.id, year: receiptYear });
        
        // Get receipt settings
        const { data: receiptSettings, error: settingsError } = await supabaseAdmin
          .from("receipt_settings")
          .select("*")
          .single();

        if (settingsError) {
          logStep("ERROR fetching receipt settings", { 
            error: settingsError.message, 
            code: settingsError.code 
          });
          result.error = `Receipt settings error: ${settingsError.message}`;
          results.push(result);
          continue;
        }

        if (!receiptSettings) {
          logStep("ERROR: No receipt settings configured");
          result.error = "Receipt settings not configured";
          results.push(result);
          continue;
        }
        
        logStep("Receipt settings loaded", { 
          orgName: receiptSettings.organization_name,
          ein: receiptSettings.organization_ein 
        });

        // Generate receipt number
        logStep("Counting existing receipts for year", { year: receiptYear });
        
        const { count: receiptCount, error: countError } = await supabaseAdmin
          .from("sponsorship_receipts")
          .select("*", { count: "exact", head: true })
          .eq("tax_year", receiptYear);
        
        if (countError) {
          logStep("ERROR counting receipts", { error: countError.message });
        }

        const receiptNumber = `${receiptYear}-${String((receiptCount || 0) + 1).padStart(6, "0")}`;
        logStep("Generated receipt number", { receiptNumber, count: receiptCount });

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
          created_at: new Date().toISOString(), // Use created_at, not generated_at
        };
        
        logStep("Inserting receipt record", { 
          transactionId: receiptData.transaction_id,
          amount: receiptData.amount,
          receiptNumber: receiptData.receipt_number
        });

        const { data: receipt, error: receiptError } = await supabaseAdmin
          .from("sponsorship_receipts")
          .insert(receiptData)
          .select()
          .single();

        if (receiptError) {
          logStep("ERROR creating receipt", { 
            error: receiptError.message, 
            code: receiptError.code,
            details: receiptError.details,
            hint: receiptError.hint,
            transactionId: charge.id
          });
          result.error = `Failed to create receipt: ${receiptError.message} (Code: ${receiptError.code})`;
          results.push(result);
          continue;
        }

        result.receiptGenerated = true;
        logStep("Receipt created successfully", { receiptId: receipt.id, receiptNumber });

        // Send receipt email
        logStep("Attempting to send receipt email", { 
          receiptId: receipt.id,
          email: customer.email,
          recipientName: profile?.display_name || "Donor"
        });
        
        try {
          const { data: emailData, error: sendError } = await supabaseAdmin.functions.invoke(
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
            logStep("ERROR sending receipt email", { 
              error: sendError.message,
              receiptId: receipt.id,
              email: customer.email
            });
            result.error = `Receipt created but email failed: ${sendError.message}`;
          } else {
            result.receiptSent = true;
            logStep("Receipt email sent successfully", { 
              receiptId: receipt.id,
              email: customer.email,
              responseData: emailData
            });
          }
        } catch (emailError: any) {
          logStep("EXCEPTION sending receipt email", { 
            error: emailError?.message || 'Unknown error',
            stack: emailError?.stack,
            receiptId: receipt.id
          });
          result.error = `Receipt created but email failed: ${emailError?.message || 'Unknown error'}`;
        }

        results.push(result);
      } catch (error: any) {
        logStep("EXCEPTION processing transaction", { 
          chargeId: txn.charge_id,
          error: error?.message || 'Unknown error',
          code: error?.code,
          stack: error?.stack,
          name: error?.name
        });
        result.error = error?.message || 'Unknown error';
        results.push(result);
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
    
    // Log failures with details
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
      logStep("Failed transactions summary", {
        count: failures.length,
        errors: failures.map(f => ({
          chargeId: f.chargeId,
          customerId: f.customerId,
          email: f.email,
          error: f.error
        }))
      });
    }

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("FATAL ERROR in recovery function", { 
      error: error?.message || 'Unknown error',
      code: error?.code,
      stack: error?.stack,
      name: error?.name
    });
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error',
        code: error?.code,
        name: error?.name
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
