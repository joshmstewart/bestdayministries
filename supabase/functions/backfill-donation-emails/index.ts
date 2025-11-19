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

    // Find all donations where:
    // 1. donor_id is set but donor_email is null, OR
    // 2. donor_email contains placeholder values like unknown@, test@, example.com
    const { data: donationsWithoutEmail, error: donationsError } = await supabaseClient
      .from("donations")
      .select("id, donor_id, donor_email")
      .not("donor_id", "is", null)
      .or("donor_email.is.null,donor_email.like.%unknown%,donor_email.like.%test%,donor_email.like.%example.com%");

    if (donationsError) {
      console.error("Error fetching donations:", donationsError);
      throw donationsError;
    }

    if (!donationsWithoutEmail || donationsWithoutEmail.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No donations found with missing or placeholder emails", 
          updated: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📧 Found ${donationsWithoutEmail.length} donations with missing/placeholder emails`);

    const results = {
      updated: 0,
      failed: 0,
      details: [] as any[]
    };

    // Process each donation
    for (const donation of donationsWithoutEmail) {
      try {
        console.log(`🔍 Processing donation ${donation.id}, donor_id: ${donation.donor_id}`);
        
        // Fetch the donor's email from profiles
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", donation.donor_id)
          .maybeSingle();

        console.log(`   Profile lookup result:`, { 
          found: !!profile, 
          hasEmail: !!profile?.email,
          email: profile?.email,
          error: profileError?.message 
        });

        if (profileError || !profile?.email) {
          const reason = profileError 
            ? `Profile query error: ${profileError.message}` 
            : profile 
              ? 'Profile found but email is null/empty'
              : 'Profile not found';
          
          console.log(`   ⚠️ Failed: ${reason}`);
          results.failed++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            status: 'failed',
            reason
          });
          continue;
        }

        console.log(`   ✅ Found email: ${profile.email}`);

        // Update the donation with the correct email
        const { error: updateError } = await supabaseClient
          .from("donations")
          .update({ donor_email: profile.email })
          .eq("id", donation.id);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError);
          results.failed++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            email: profile.email,
            status: 'failed',
            reason: `Update error: ${updateError.message}`
          });
        } else {
          console.log(`   ✅ Successfully updated with ${profile.email}`);
          results.updated++;
          results.details.push({
            donationId: donation.id,
            donorId: donation.donor_id,
            email: profile.email,
            status: 'success'
          });
        }
      } catch (error: any) {
        console.error(`   ❌ Exception:`, error);
        results.failed++;
        results.details.push({
          donationId: donation.id,
          donorId: donation.donor_id,
          status: 'failed',
          reason: `Exception: ${error.message}`
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
