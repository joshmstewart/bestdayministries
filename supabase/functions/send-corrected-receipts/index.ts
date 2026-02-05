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

    const { receiptIds } = await req.json();

    console.log('📤 Starting to send corrected receipt emails...');
    console.log(`Sending ${receiptIds?.length || 'all'} receipt(s)`);

    let receiptsToSend;

    if (receiptIds && receiptIds.length > 0) {
      // Send specific receipts
      const { data, error } = await supabaseClient
        .from("sponsorship_receipts")
        .select("*")
        .in("id", receiptIds);

      if (error) throw error;
      receiptsToSend = data;
    } else {
      // Send all receipts that were previously corrected
      // (have transaction_id starting with 'donation_' and sponsor_email is NOT 'unknown@donor.com')
      const { data, error } = await supabaseClient
        .from("sponsorship_receipts")
        .select("*")
        .like("transaction_id", "donation_%")
        .neq("sponsor_email", "unknown@donor.com");

      if (error) throw error;
      receiptsToSend = data;
    }

    if (!receiptsToSend || receiptsToSend.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No receipts found to send",
          sent: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      details: [] as any[]
    };

    // Send each receipt
    for (const receipt of receiptsToSend) {
      try {
        console.log(`📤 Sending receipt ${receipt.receipt_number} to ${receipt.sponsor_email.substring(0, 3)}***`);
        
        const { error: sendError } = await supabaseClient.functions.invoke('send-sponsorship-receipt', {
          body: { receiptId: receipt.id }
        });

        if (sendError) {
          console.error(`❌ Failed to send email for receipt ${receipt.id}:`, sendError);
          results.failed++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            email: receipt.sponsor_email,
            status: 'failed',
            reason: sendError.message
          });
        } else {
          results.sent++;
          results.details.push({
            receiptId: receipt.id,
            receiptNumber: receipt.receipt_number,
            email: receipt.sponsor_email,
            status: 'sent'
          });
          console.log(`✅ Successfully sent receipt ${receipt.receipt_number}`);
        }
      } catch (error: any) {
        console.error(`❌ Error sending receipt ${receipt.id}:`, error);
        results.failed++;
        results.details.push({
          receiptId: receipt.id,
          receiptNumber: receipt.receipt_number,
          email: receipt.sponsor_email,
          status: 'failed',
          reason: error.message
        });
      }
    }

    console.log(`✅ Sending complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Sending complete: ${results.sent} emails sent, ${results.failed} failures`,
        sent: results.sent,
        failed: results.failed,
        details: results.details
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("❌ Fatal error in send-corrected-receipts:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
