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

    console.log('🔍 Starting donation email backfill...');

    // Two types of fixes needed:
    // 1. User donations (donor_id set) with placeholder emails → set donor_email to NULL
    //    (UI will display email from profiles table)
    // 2. Guest donations (donor_id NULL) with placeholder emails → can't fix these
    
    // Get user donations with placeholder emails
    const { data: userDonations, error: userDonationsError } = await supabaseClient
      .from("donations")
      .select("id, donor_id, donor_email")
      .not("donor_id", "is", null)
      .or("donor_email.like.%unknown%,donor_email.like.%test%,donor_email.like.%example.com%");

    if (userDonationsError) {
      console.error("Error fetching user donations:", userDonationsError);
      throw userDonationsError;
    }

    if (!userDonations || userDonations.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No user donations found with placeholder emails", 
          cleared: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📧 Found ${userDonations.length} user donations with placeholder emails`);

    const results = {
      cleared: 0,
      failed: 0,
      details: [] as any[]
    };

    // Clear placeholder emails from user donations
    for (const donation of userDonations) {
      try {
        console.log(`🔍 Clearing placeholder email from donation ${donation.id}, donor_id: ${donation.donor_id}`);
        
        // Set donor_email to NULL so UI displays email from profiles
        const { error: updateError } = await supabaseClient
          .from("donations")
          .update({ donor_email: null })
          .eq("id", donation.id);

        if (updateError) {
          console.error(`   ❌ Clear failed:`, updateError);
          results.failed++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            oldEmail: donation.donor_email,
            status: 'failed',
            reason: `Clear error: ${updateError.message}`
          });
        } else {
          console.log(`   ✅ Successfully cleared placeholder email`);
          results.cleared++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            oldEmail: donation.donor_email,
            status: 'success'
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Exception:`, error);
        results.failed++;
        results.details.push({
          donationId: donation.id,
          donorId: donation.donor_id,
          oldEmail: donation.donor_email,
          status: 'failed',
          reason: `Exception: ${error.message}`
        });
      }
    }

    const message = `Backfill complete: ${results.cleared} placeholder email${results.cleared !== 1 ? 's' : ''} cleared${results.failed > 0 ? `, ${results.failed} failed` : ''}`;
    console.log(`✅ ${message}`);

    return new Response(
      JSON.stringify({
        message,
        cleared: results.cleared,
        failed: results.failed,
        details: results.details
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in backfill-donation-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
