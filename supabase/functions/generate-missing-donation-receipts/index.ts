import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if this is a single payment intent recovery
    const { paymentIntentId } = await req.json().catch(() => ({}));
    
    if (paymentIntentId) {
      console.log(`Recovering receipt for payment intent: ${paymentIntentId}`);
      return await recoverSingleReceipt(supabaseClient, paymentIntentId);
    }

    console.log('Starting bulk donation receipt generation...');

    // Get all active and completed donations from the donations table
    // Join with profiles to get real email addresses for logged-in donors
    const { data: donations, error: donationsError } = await supabaseClient
      .from("donations")
      .select(`
        id,
        donor_id,
        donor_email,
        amount,
        amount_charged,
        frequency,
        started_at,
        status,
        stripe_subscription_id,
        stripe_payment_intent_id,
        stripe_mode,
        profiles!donations_donor_id_fkey(email)
      `)
      .in("status", ["active", "completed"]);

    if (donationsError) {
      console.error("Error fetching donations:", donationsError);
      throw donationsError;
    }

    if (!donations || donations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No donations found", receiptsGenerated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${donations.length} donations to check`);

    // Check which donations already have receipts
    const donationIds = donations.map(d => `donation_${d.id}`);
    const { data: existingReceipts, error: receiptsError } = await supabaseClient
      .from("sponsorship_receipts")
      .select("transaction_id")
      .in("transaction_id", donationIds);

    if (receiptsError) {
      console.error("Error checking existing receipts:", receiptsError);
      throw receiptsError;
    }

    const existingReceiptTransactionIds = new Set(
      existingReceipts?.map(r => r.transaction_id) || []
    );

    // Filter to only donations without receipts
    const donationsNeedingReceipts = donations.filter(
      d => !existingReceiptTransactionIds.has(`donation_${d.id}`)
    );

    console.log(`${donationsNeedingReceipts.length} donations need receipts`);

    if (donationsNeedingReceipts.length === 0) {
      return new Response(
        JSON.stringify({ message: "All donations already have receipts", receiptsGenerated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get donor profiles for names
    const donorIds = donationsNeedingReceipts
      .filter(d => d.donor_id)
      .map(d => d.donor_id);

    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, display_name")
      .in("id", donorIds);

    const profilesMap = new Map(
      profiles?.map(p => [p.id, p.display_name]) || []
    );

    const receiptsToCreate: any[] = [];
    const failedReceipts: any[] = [];

    // Generate receipts for each donation
    for (const donation of donationsNeedingReceipts) {
      const transactionDate = new Date(donation.started_at);
      const taxYear = transactionDate.getFullYear();
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      // Use amount_charged if available (includes fees), otherwise use amount
      const receiptAmount = donation.amount_charged || donation.amount;
      
      // Get donor name from profile or use email
      const donorName = donation.donor_id 
        ? (profilesMap.get(donation.donor_id) || "Donor")
        : "Donor";
      
      // CRITICAL FIX: Get real email address, NEVER use placeholder
      // Priority 1: donor_email field
      // Priority 2: email from joined profiles table (first element)
      // If neither exists, skip this receipt (can't email without address)
      let donorEmail = donation.donor_email;
      
      if (!donorEmail && donation.profiles && Array.isArray(donation.profiles) && donation.profiles[0]?.email) {
        donorEmail = donation.profiles[0].email;
      }
      
      if (!donorEmail) {
        console.log(`⚠️ Skipping donation ${donation.id} - no email available`);
        failedReceipts.push({
          donationId: donation.id,
          reason: 'No email address available',
          donorId: donation.donor_id
        });
        continue;
      }
      
      receiptsToCreate.push({
        transaction_id: `donation_${donation.id}`,
        user_id: donation.donor_id,
        sponsor_email: donorEmail,
        sponsor_name: donorName,
        bestie_name: "General Support",
        amount: receiptAmount,
        frequency: donation.frequency,
        transaction_date: donation.started_at,
        receipt_number: receiptNumber,
        tax_year: taxYear,
        stripe_mode: donation.stripe_mode || 'test',
        donationId: donation.id, // Keep for logging later
      });
    }

    if (receiptsToCreate.length === 0) {
      const message = failedReceipts.length > 0
        ? `No receipts to generate. ${failedReceipts.length} donations skipped due to missing email.`
        : "All donations already have receipts";
      return new Response(
        JSON.stringify({ message, receiptsGenerated: 0, emailsSent: 0, skippedDonations: failedReceipts.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Creating ${receiptsToCreate.length} receipt records...`);

    // Insert all receipts (strip donationId field before insert)
    const { data: createdReceipts, error: insertError } = await supabaseClient
      .from("sponsorship_receipts")
      .insert(receiptsToCreate.map(({ donationId, ...receipt }) => receipt))
      .select();

    if (insertError) {
      console.error("Error creating receipts:", insertError);
      throw insertError;
    }

    console.log(`Successfully created ${createdReceipts?.length || 0} receipts`);

    // Create receipt_generation_logs for all created receipts
    const logsToCreate = (createdReceipts || []).map((receipt, index) => ({
      donation_id: receiptsToCreate[index].donationId,
      receipt_id: receipt.id,
      stage: 'backfill_receipt_created',
      status: 'success'
    }));
    if (logsToCreate.length > 0) {
      await supabaseClient.from('receipt_generation_logs').insert(logsToCreate);
    }

    // Send emails
    let emailsSent = 0;
    const emailFailures = [];

    for (let i = 0; i < (createdReceipts || []).length; i++) {
      const receipt = createdReceipts![i];
      try {
        const { error: emailError } = await supabaseClient.functions.invoke('send-sponsorship-receipt', {
          body: { receiptId: receipt.id }
        });

        if (emailError) {
          emailFailures.push({ receiptNumber: receipt.receipt_number, error: emailError.message });
          await supabaseClient.from('receipt_generation_logs').insert({
            donation_id: receiptsToCreate[i].donationId,
            receipt_id: receipt.id,
            stage: 'backfill_email_failed',
            status: 'error',
            error_message: emailError.message
          });
        } else {
          emailsSent++;
          await supabaseClient.from('receipt_generation_logs').insert({
            donation_id: receiptsToCreate[i].donationId,
            receipt_id: receipt.id,
            stage: 'backfill_email_sent',
            status: 'success'
          });
        }
      } catch (error: any) {
        emailFailures.push({ receiptNumber: receipt.receipt_number, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${createdReceipts?.length || 0} receipts, sent ${emailsSent} emails. ${failedReceipts.length} skipped (no email). ${emailFailures.length} email failures.`,
        receiptsGenerated: createdReceipts?.length || 0,
        emailsSent,
        emailsFailed: emailFailures.length,
        skippedDonations: failedReceipts.length,
        failures: emailFailures.length > 0 ? emailFailures : undefined,
        skippedDetails: failedReceipts.length > 0 ? failedReceipts : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in generate-missing-donation-receipts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Recovery function for single payment intent
async function recoverSingleReceipt(supabaseAdmin: any, paymentIntentId: string) {
  try {
    // Check if receipt already exists
    const { data: existingReceipt } = await supabaseAdmin
      .from("sponsorship_receipts")
      .select("id")
      .eq("transaction_id", paymentIntentId)
      .maybeSingle();

    if (existingReceipt) {
      return new Response(
        JSON.stringify({ 
          message: "Receipt already exists", 
          receipt_id: existingReceipt.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get payment intent details from Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY_LIVE not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent.invoice) throw new Error("Payment intent has no associated invoice");

    const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
    if (!invoice.subscription) throw new Error("Invoice has no associated subscription");

    const subscriptionId = invoice.subscription as string;
    const customerEmail = invoice.customer_email;
    if (!customerEmail) throw new Error("No customer email found on invoice");

    // Find the sponsorship
    const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
      .from("sponsorships")
      .select("id, bestie_id, amount, stripe_mode")
      .eq("stripe_subscription_id", subscriptionId)
      .eq("stripe_mode", "live")
      .maybeSingle();

    if (sponsorshipError || !sponsorship) {
      throw new Error(`Sponsorship not found for subscription ${subscriptionId}`);
    }

    // Get bestie name
    const { data: sponsorBestieData } = await supabaseAdmin
      .from("sponsor_besties")
      .select("bestie_name")
      .eq("bestie_id", sponsorship.bestie_id)
      .maybeSingle();

    const bestieName = sponsorBestieData?.bestie_name || "Bestie";

    // Get organization info
    const { data: receiptSettings } = await supabaseAdmin
      .from("receipt_settings")
      .select("organization_name, organization_ein")
      .limit(1)
      .maybeSingle();

    const orgName = receiptSettings?.organization_name || "Best Day Ministries";
    const orgEin = receiptSettings?.organization_ein || "00-0000000";

    // Get user info
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData.users.find(
      (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : sponsorship.amount;
    const transactionDate = new Date(paymentIntent.created * 1000).toISOString();
    const taxYear = new Date(paymentIntent.created * 1000).getFullYear();
    const receiptNumber = `RCP-RECOVERY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create the receipt
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from("sponsorship_receipts")
      .insert({
        sponsorship_id: sponsorship.id,
        user_id: user?.id || null,
        sponsor_email: customerEmail,
        sponsor_name: user?.user_metadata?.display_name || customerEmail.split('@')[0],
        bestie_name: bestieName,
        amount: amountPaid,
        frequency: "monthly",
        transaction_id: paymentIntentId,
        transaction_date: transactionDate,
        receipt_number: receiptNumber,
        tax_year: taxYear,
        organization_name: orgName,
        organization_ein: orgEin,
        stripe_mode: "live",
        status: "generated"
      })
      .select()
      .single();

    if (receiptError) throw receiptError;

    return new Response(
      JSON.stringify({
        message: "Receipt recovered successfully",
        receipt_id: receipt.id,
        sponsorship_id: sponsorship.id,
        amount: amountPaid,
        customer_email: customerEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error recovering receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
