import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-LOGIN-LINK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body for optional vendor_id
    let requestedVendorId: string | null = null;
    try {
      const body = await req.json();
      requestedVendorId = body.vendor_id || null;
    } catch {
      // No body or invalid JSON
    }

    let vendor = null;

    if (requestedVendorId) {
      // Check if user is the owner or a team member of this specific vendor
      const { data: vendorData, error: vendorError } = await supabaseClient
        .from("vendors")
        .select("*")
        .eq("id", requestedVendorId)
        .single();

      if (vendorError || !vendorData) {
        throw new Error("Vendor not found");
      }

      // Check if user is the owner
      if (vendorData.user_id === user.id) {
        vendor = vendorData;
        logStep("User is vendor owner");
      } else {
        // Check if user is a team member
        const { data: teamMember } = await supabaseClient
          .from("vendor_team_members")
          .select("*")
          .eq("vendor_id", requestedVendorId)
          .eq("user_id", user.id)
          .not("accepted_at", "is", null)
          .single();

        if (!teamMember) {
          throw new Error("User is not authorized to access this vendor's Stripe account");
        }

        vendor = vendorData;
        logStep("User is team member");
      }
    } else {
      // Get vendor account (check ownership first, then team membership)
      const { data: vendorData, error: vendorError } = await supabaseClient
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (vendorError || !vendorData) {
        // Check if they're a team member of any vendor
        const { data: teamMemberData } = await supabaseClient
          .from("vendor_team_members")
          .select("vendor_id")
          .eq("user_id", user.id)
          .not("accepted_at", "is", null)
          .limit(1)
          .single();

        if (!teamMemberData) {
          throw new Error("Vendor account not found");
        }

        // Get the vendor they're a team member of
        const { data: teamVendor } = await supabaseClient
          .from("vendors")
          .select("*")
          .eq("id", teamMemberData.vendor_id)
          .single();

        if (!teamVendor) {
          throw new Error("Vendor account not found");
        }

        vendor = teamVendor;
        logStep("Found vendor via team membership", { vendorId: vendor.id });
      } else {
        vendor = vendorData;
        logStep("Found vendor via ownership", { vendorId: vendor.id });
      }
    }

    if (!vendor.stripe_account_id) {
      throw new Error("No Stripe account connected");
    }

    // Get Stripe mode from app_settings
    const { data: modeSetting } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'marketplace_stripe_mode')
      .single();
    
    const mode = modeSetting?.setting_value || 'test';
    const stripeKey = mode === 'live' 
      ? Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('MARKETPLACE_STRIPE_SECRET_KEY_TEST');
    
    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
    }

    logStep("Using Stripe mode", { mode });

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Create a login link for the connected account's Express dashboard
    const loginLink = await stripe.accounts.createLoginLink(vendor.stripe_account_id);

    logStep("Created Stripe login link", { vendorId: vendor.id });

    return new Response(
      JSON.stringify({
        url: loginLink.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
