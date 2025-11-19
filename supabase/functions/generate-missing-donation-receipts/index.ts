import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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

    console.log('Starting donation receipt generation...');

    // Get all active and completed donations from the donations table
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
        stripe_mode
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

    // Generate receipts for each donation
    const receiptsToCreate = donationsNeedingReceipts.map((donation: any) => {
      const transactionDate = new Date(donation.started_at);
      const taxYear = transactionDate.getFullYear();
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      // Use amount_charged if available (includes fees), otherwise use amount
      const receiptAmount = donation.amount_charged || donation.amount;
      
      // Get donor name from profile or use email
      const donorName = donation.donor_id 
        ? (profilesMap.get(donation.donor_id) || "Donor")
        : "Donor";
      
      // Get donor email - either from donor_email field or from donor_id lookup
      const donorEmail = donation.donor_email || "unknown@donor.com";
      
      return {
        transaction_id: `donation_${donation.id}`,
        user_id: donation.donor_id,
        sponsor_email: donorEmail,
        sponsor_name: donorName,
        bestie_name: "General Donation", // Donations are not tied to specific besties
        amount: receiptAmount,
        frequency: donation.frequency,
        transaction_date: donation.started_at,
        receipt_number: receiptNumber,
        tax_year: taxYear,
        stripe_mode: donation.stripe_mode || 'test',
      };
    });

    console.log(`Creating ${receiptsToCreate.length} receipt records...`);

    // Insert all receipts
    const { data: createdReceipts, error: insertError } = await supabaseClient
      .from("sponsorship_receipts")
      .insert(receiptsToCreate)
      .select();

    if (insertError) {
      console.error("Error creating receipts:", insertError);
      throw insertError;
    }

    console.log(`Successfully created ${createdReceipts?.length || 0} receipts`);

    // Now send emails for the newly created receipts
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const receipt of createdReceipts || []) {
      try {
        console.log(`Sending receipt email to ${receipt.sponsor_email}...`);
        
        const { error: emailError } = await supabaseClient.functions.invoke(
          'send-sponsorship-receipt',
          {
            body: {
              sponsorEmail: receipt.sponsor_email,
              sponsorName: receipt.sponsor_name,
              bestieName: receipt.bestie_name,
              amount: receipt.amount,
              frequency: receipt.frequency,
              transactionId: receipt.transaction_id,
              transactionDate: receipt.transaction_date,
              stripeMode: receipt.stripe_mode,
            }
          }
        );

        if (emailError) {
          console.error(`Failed to send email to ${receipt.sponsor_email}:`, emailError);
          emailsFailed++;
        } else {
          console.log(`✓ Email sent to ${receipt.sponsor_email}`);
          emailsSent++;
        }
      } catch (emailError) {
        console.error(`Error sending email to ${receipt.sponsor_email}:`, emailError);
        emailsFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully generated ${createdReceipts?.length || 0} receipt(s) and sent ${emailsSent} email(s)`,
        receiptsGenerated: createdReceipts?.length || 0,
        emailsSent,
        emailsFailed,
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
