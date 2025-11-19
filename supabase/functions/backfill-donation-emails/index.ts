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

    console.log('🔍 Starting donation email backfill...');

    // Find all donations where donor_id is set but donor_email is null
    const { data: donationsWithoutEmail, error: donationsError } = await supabaseClient
      .from("donations")
      .select("id, donor_id, donor_email")
      .not("donor_id", "is", null)
      .is("donor_email", null);

    if (donationsError) {
      console.error("Error fetching donations:", donationsError);
      throw donationsError;
    }

    if (!donationsWithoutEmail || donationsWithoutEmail.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No donations found with missing emails", 
          updated: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📧 Found ${donationsWithoutEmail.length} donations with missing emails`);

    const results = {
      updated: 0,
      failed: 0,
      details: [] as any[]
    };

    // Process each donation
    for (const donation of donationsWithoutEmail) {
      try {
        // Fetch the donor's email from profiles
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", donation.donor_id)
          .maybeSingle();

        if (profileError || !profile?.email) {
          console.log(`⚠️ No profile email found for donation ${donation.id}, donor ${donation.donor_id}`);
          results.failed++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            status: 'failed',
            reason: profileError ? profileError.message : 'Profile email not found'
          });
          continue;
        }

        // Update the donation with the correct email
        const { error: updateError } = await supabaseClient
          .from("donations")
          .update({ donor_email: profile.email })
          .eq("id", donation.id);

        if (updateError) {
          console.error(`❌ Failed to update donation ${donation.id}:`, updateError);
          results.failed++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            email: profile.email,
            status: 'failed',
            reason: updateError.message
          });
        } else {
          console.log(`✅ Updated donation ${donation.id} with email ${profile.email}`);
          results.updated++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            email: profile.email,
            status: 'success'
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing donation ${donation.id}:`, error);
        results.failed++;
        results.details.push({
          donationId: donation.id,
          donorId: donation.donor_id,
          status: 'failed',
          reason: error.message
        });
      }
    }

    const message = `Backfill complete: ${results.updated} email${results.updated !== 1 ? 's' : ''} updated${results.failed > 0 ? `, ${results.failed} failed` : ''}`;
    console.log(`✅ ${message}`);

    return new Response(
      JSON.stringify({
        message,
        updated: results.updated,
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
