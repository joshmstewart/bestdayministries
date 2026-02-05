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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('🔍 Starting receipt email correction...');

    // STEP 1: Find all receipts with placeholder emails (both types)
    const { data: receiptsWithFakeEmails, error: receiptsError } = await supabaseClient
      .from("sponsorship_receipts")
      .select("*")
      .in("sponsor_email", ["unknown@donor.com", "unknown@example.com"]);

    if (receiptsError) {
      console.error("Error fetching receipts:", receiptsError);
      throw receiptsError;
    }

    if (!receiptsWithFakeEmails || receiptsWithFakeEmails.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No receipts found with placeholder emails", 
          corrected: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📧 Found ${receiptsWithFakeEmails.length} receipts with placeholder emails`);

    const results = {
      corrected: 0,
      failed: 0,
      details: [] as any[]
    };

    // STEP 2: Process each receipt - ONLY FIX EMAILS, DON'T SEND
    for (const receipt of receiptsWithFakeEmails) {
      try {
        const transactionId = receipt.transaction_id;
        let realEmail: string | null = null;
        let receiptType = 'unknown';

        // Branch 1: Donation receipts (transaction_id starts with "donation_")
        if (transactionId?.startsWith("donation_")) {
          receiptType = 'donation';
          const donationId = transactionId.substring(9);

          const { data: donation, error: donationError } = await supabaseClient
            .from("donations")
            .select("donor_id, donor_email")
            .eq("id", donationId)
            .maybeSingle();

          if (donationError || !donation) {
            console.log(`⚠️ Donation receipt ${receipt.id} - donation not found for ID: ${donationId}`);
            results.failed++;
            results.details.push({
              receiptId: receipt.id,
              receiptNumber: receipt.receipt_number,
              type: receiptType,
              status: 'failed',
              reason: `Donation not found: ${donationId}`
            });
            continue;
          }

          // Prefer donor_email, fallback to profile
          realEmail = donation.donor_email;
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
        }
        // Branch 2: Sponsorship receipts (transaction_id starts with "backfill_" and has sponsorship_id)
        else if (transactionId?.startsWith("backfill_") && receipt.sponsorship_id) {
          receiptType = 'sponsorship';

          const { data: sponsorship, error: sponsorshipError } = await supabaseClient
            .from("sponsorships")
            .select("sponsor_id, sponsor_email")
            .eq("id", receipt.sponsorship_id)
            .maybeSingle();

          if (sponsorshipError || !sponsorship) {
            console.log(`⚠️ Sponsorship receipt ${receipt.id} - sponsorship not found for ID: ${receipt.sponsorship_id}`);
            results.failed++;
            results.details.push({
              receiptId: receipt.id,
              receiptNumber: receipt.receipt_number,
              type: receiptType,
              status: 'failed',
              reason: `Sponsorship not found: ${receipt.sponsorship_id}`
            });
            continue;
          }

          // Prefer sponsorship.sponsor_email, fallback to profile
          realEmail = sponsorship.sponsor_email;
          if (!realEmail && sponsorship.sponsor_id) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("email")
              .eq("id", sponsorship.sponsor_id)
              .maybeSingle();

            if (profile?.email) {
              realEmail = profile.email;
            }
          }
        }
        // Branch 3: Unknown type
        else {
          console.log(`⚠️ Skipping receipt ${receipt.id} - unrecognized transaction_id pattern: ${transactionId}`);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            type: 'unknown',
            status: 'failed',
            reason: `Unrecognized transaction_id pattern: ${transactionId}`
          });
          continue;
        }

        // Final check: did we find an email?
        if (!realEmail) {
          console.log(`⚠️ Skipping receipt ${receipt.id} (${receiptType}) - no email available`);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            type: receiptType,
            status: 'failed',
            reason: 'No email address available'
          });
          continue;
        }

        // STEP 3: Update the receipt with the real email - BUT DON'T SEND YET
        console.log(`✏️ Updating ${receiptType} receipt ${receipt.id} with real email: ${realEmail.substring(0, 3)}***`);
        
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
            type: receiptType,
            status: 'failed',
            reason: `Update failed: ${updateError.message}`
          });
          continue;
        }

        results.corrected++;
        results.details.push({
          receiptId: receipt.id,
          receiptNumber: receipt.receipt_number,
          type: receiptType,
          email: realEmail,
          status: 'corrected'
        });
        console.log(`✅ Successfully updated ${receiptType} receipt ${receipt.receipt_number} with email ${realEmail.substring(0, 3)}***`);

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

    console.log(`✅ Email correction complete: ${results.corrected} corrected, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Email correction complete: ${results.corrected} emails corrected, ${results.failed} failures`,
        corrected: results.corrected,
        failed: results.failed,
        details: results.details
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("❌ Fatal error in fix-receipt-emails:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
