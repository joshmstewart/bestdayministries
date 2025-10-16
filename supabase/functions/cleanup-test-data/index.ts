import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupOptions {
  removeTestProfiles?: boolean;
  removeTestSponsorships?: boolean;
  removeTestBesties?: boolean;
  removeTestPosts?: boolean;
  removeTestVendors?: boolean;
}

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

    const options: CleanupOptions = await req.json();
    const results: Record<string, any> = {};

    console.log("🧹 Starting test data cleanup with options:", options);

    // Clean up test sponsorships
    if (options.removeTestSponsorships !== false) {
      const { error: sponsorError } = await supabaseClient
        .from("sponsorships")
        .delete()
        .or(
          'sponsor_id.in.(select id from profiles where display_name like \'%Test%\'),' +
          'bestie_id.in.(select id from profiles where display_name like \'%Test%\')'
        );
      
      if (sponsorError) {
        console.error("Error cleaning sponsorships:", sponsorError);
        results.sponsorships = { success: false, error: sponsorError.message };
      } else {
        console.log("✅ Cleaned up test sponsorships");
        results.sponsorships = { success: true };
      }
    }

    // Clean up test featured besties
    if (options.removeTestBesties !== false) {
      const { error: bestieError } = await supabaseClient
        .from("featured_besties")
        .delete()
        .or("bestie_name.ilike.%Test%,bestie_name.ilike.%E2E%");
      
      if (bestieError) {
        console.error("Error cleaning featured_besties:", bestieError);
        results.featured_besties = { success: false, error: bestieError.message };
      } else {
        console.log("✅ Cleaned up test featured besties");
        results.featured_besties = { success: true };
      }
    }

    // Clean up test discussion posts
    if (options.removeTestPosts !== false) {
      const { error: postError } = await supabaseClient
        .from("discussion_posts")
        .delete()
        .or("title.ilike.%Test%,title.ilike.%E2E%");
      
      if (postError) {
        console.error("Error cleaning discussion_posts:", postError);
        results.discussion_posts = { success: false, error: postError.message };
      } else {
        console.log("✅ Cleaned up test discussion posts");
        results.discussion_posts = { success: true };
      }
    }

    // Clean up test vendors
    if (options.removeTestVendors !== false) {
      const { error: vendorError } = await supabaseClient
        .from("vendors")
        .delete()
        .or("business_name.ilike.%Test%,business_name.ilike.%E2E%");
      
      if (vendorError) {
        console.error("Error cleaning vendors:", vendorError);
        results.vendors = { success: false, error: vendorError.message };
      } else {
        console.log("✅ Cleaned up test vendors");
        results.vendors = { success: true };
      }
    }

    // Clean up test profiles (do this last to avoid FK constraints)
    if (options.removeTestProfiles !== false) {
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .delete()
        .or("display_name.ilike.%Test%,display_name.ilike.%E2E%,email.ilike.%test@%");
      
      if (profileError) {
        console.error("Error cleaning profiles:", profileError);
        results.profiles = { success: false, error: profileError.message };
      } else {
        console.log("✅ Cleaned up test profiles");
        results.profiles = { success: true };
      }
    }

    console.log("🎉 Test data cleanup completed:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test data cleanup completed",
        results 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error during cleanup:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
