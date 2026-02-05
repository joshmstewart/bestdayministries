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

    console.log("Finding donations with receipts but no emails sent...");

    // Find all donations with receipts but no receipt email sent
    const { data: donationsNeedingEmails, error: queryError } = await supabaseClient
      .from('donations')
      .select(`
        id,
        donor_email,
        donor_id,
        amount,
        amount_charged,
        frequency,
        created_at,
        stripe_mode,
        status
      `)
      .in('status', ['completed', 'active'])
      .not('donor_email', 'is', null);

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    console.log(`Found ${donationsNeedingEmails?.length || 0} completed/active donations`);

    const results: any[] = [];
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const donation of donationsNeedingEmails || []) {
      // Check if receipt exists for this donation
      const { data: receipt } = await supabaseClient
        .from('sponsorship_receipts')
        .select('id, receipt_number')
        .eq('transaction_id', `donation_${donation.id}`)
        .single();

      if (!receipt) {
        console.log(`No receipt for donation ${donation.id}, skipping`);
        skipped++;
        continue;
      }

      // Check if email was already sent
      const { data: emailLog } = await supabaseClient
        .from('email_audit_log')
        .select('id')
        .eq('recipient_email', donation.donor_email)
        .eq('email_type', 'sponsorship_receipt')
        .eq('related_id', receipt.id)
        .single();

      if (emailLog) {
        console.log(`Email already sent for donation ${donation.id}, skipping`);
        skipped++;
        continue;
      }

      // Get donor name from profile if available
      let sponsorName = 'Donor';
      if (donation.donor_id) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('display_name')
          .eq('id', donation.donor_id)
          .single();
        if (profile?.display_name) {
          sponsorName = profile.display_name;
        }
      }

      // Send the receipt email
      try {
        const { error: sendError } = await supabaseClient.functions.invoke('send-sponsorship-receipt', {
          body: {
            sponsorEmail: donation.donor_email,
            sponsorName: sponsorName,
            bestieName: 'General Support',
            amount: donation.amount_charged || donation.amount,
            frequency: donation.frequency,
            transactionId: `donation_${donation.id}`,
            transactionDate: donation.created_at,
            stripeMode: donation.stripe_mode
          }
        });

        if (sendError) {
          console.error(`Error sending to ${donation.donor_email}:`, sendError);
          errors++;
          results.push({ 
            email: donation.donor_email, 
            status: 'error', 
            error: sendError.message 
          });
        } else {
          console.log(`✉️ Sent receipt to ${donation.donor_email}`);
          sent++;
          results.push({ 
            email: donation.donor_email, 
            status: 'sent',
            amount: donation.amount_charged || donation.amount
          });
        }
      } catch (e: any) {
        console.error(`Exception sending to ${donation.donor_email}:`, e);
        errors++;
        results.push({ 
          email: donation.donor_email, 
          status: 'error', 
          error: e.message 
        });
      }
    }

    const summary = {
      total: donationsNeedingEmails?.length || 0,
      sent,
      skipped,
      errors
    };

    console.log("Complete:", summary);

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
