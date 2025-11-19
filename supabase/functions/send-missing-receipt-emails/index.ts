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

    console.log('🔍 Starting missing receipt email recovery...');

    // STEP 1: Find all receipts with placeholder email
    const { data: receiptsWithFakeEmails, error: receiptsError } = await supabaseClient
      .from("sponsorship_receipts")
      .select("*")
      .eq("sponsor_email", "unknown@donor.com");

    if (receiptsError) {
      console.error("Error fetching receipts:", receiptsError);
      throw receiptsError;
    }

    if (!receiptsWithFakeEmails || receiptsWithFakeEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No receipts found with placeholder emails", 
          corrected: 0,
          sent: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📧 Found ${receiptsWithFakeEmails.length} receipts with placeholder emails`);

    const results = {
      corrected: 0,
      sent: 0,
      failed: 0,
      details: [] as any[]
    };

    // STEP 2: Process each receipt
    for (const receipt of receiptsWithFakeEmails) {
      try {
        // Extract donation ID from transaction_id (format: "donation_{uuid}")
        const transactionId = receipt.transaction_id;
        const donationId = transactionId?.startsWith("donation_") 
          ? transactionId.substring(9) 
          : transactionId;

        if (!donationId) {
          console.log(`⚠️ Skipping receipt ${receipt.id} - no transaction_id`);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            status: 'failed',
            reason: 'No transaction_id found'
          });
          continue;
        }

        // Look up the donation record
        const { data: donation, error: donationError } = await supabaseClient
          .from("donations")
          .select("donor_id, donor_email")
          .eq("id", donationId)
          .maybeSingle();

        if (donationError || !donation) {
          console.log(`⚠️ Skipping receipt ${receipt.id} - donation not found for ID: ${donationId}`);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            status: 'failed',
            reason: `Donation not found: ${donationId}`
          });
          continue;
        }

        // Get the real email address
        let realEmail = donation.donor_email;

        // If donor_email is NULL, look up from profiles via donor_id
        if (!realEmail && donation.donor_id) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("email")
            .eq("id", donation.donor_id)
            .maybeSingle();

          if (profile?.email) {
            realEmail = profile.email;
          }
        }

        if (!realEmail) {
          console.log(`⚠️ Skipping receipt ${receipt.id} - no email available for donor`);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            status: 'failed',
            reason: 'No email address available'
          });
          continue;
        }

        // STEP 3: Update the receipt with the real email
        console.log(`✏️ Updating receipt ${receipt.id} with real email: ${realEmail.substring(0, 3)}***`);
        
        const { error: updateError } = await supabaseClient
          .from("sponsorship_receipts")
          .update({ sponsor_email: realEmail })
          .eq("id", receipt.id);

        if (updateError) {
          console.error(`❌ Failed to update receipt ${receipt.id}:`, updateError);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            status: 'failed',
            reason: `Update failed: ${updateError.message}`
          });
          continue;
        }

        results.corrected++;

        // STEP 4: Send the receipt email
        console.log(`📤 Sending receipt email to: ${realEmail.substring(0, 3)}***`);
        
        const { error: sendError } = await supabaseClient.functions.invoke('send-sponsorship-receipt', {
          body: { receiptId: receipt.id }
        });

        if (sendError) {
          console.error(`❌ Failed to send email for receipt ${receipt.id}:`, sendError);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            email: realEmail,
            status: 'corrected_but_email_failed',
            reason: sendError.message
          });
        } else {
          results.sent++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            email: realEmail,
            status: 'sent'
          });
          console.log(`✅ Successfully sent receipt ${receipt.receipt_number} to ${realEmail.substring(0, 3)}***`);
        }

      } catch (error: any) {
        console.error(`❌ Error processing receipt ${receipt.id}:`, error);
        results.failed++;
        results.details.push({
          receiptId: receipt.id,
          receiptNumber: receipt.receipt_number,
          status: 'failed',
          reason: error.message
        });
      }
    }

    console.log(`✅ Recovery complete: ${results.corrected} corrected, ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Recovery complete: ${results.corrected} emails corrected, ${results.sent} emails sent, ${results.failed} failures`,
        corrected: results.corrected,
        sent: results.sent,
        failed: results.failed,
        details: results.details
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("❌ Fatal error in send-missing-receipt-emails:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
