import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-STRIPE-CONNECT] ${step}${detailsStr}`);
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
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for optional vendor_id
    let requestedVendorId: string | null = null;
    try {
      const body = await req.json();
      requestedVendorId = body.vendor_id || null;
    } catch {
      // No body or invalid JSON
    }

    logStep("Requested vendor_id", { requestedVendorId });

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
        const { data: teamMember, error: teamError } = await supabaseClient
          .from("vendor_team_members")
          .select("*")
          .eq("vendor_id", requestedVendorId)
          .eq("user_id", user.id)
          .not("accepted_at", "is", null)
          .single();

        if (teamError || !teamMember) {
          throw new Error("User is not authorized to manage this vendor's Stripe account");
        }

        vendor = vendorData;
        logStep("User is team member", { teamMemberId: teamMember.id });
      }
    } else {
      // Fall back to finding user's own vendor account
      const { data: vendorData, error: vendorError } = await supabaseClient
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (vendorError || !vendorData) {
        // Check if they're a team member of any vendor
        const { data: teamMemberData, error: teamMemberError } = await supabaseClient
          .from("vendor_team_members")
          .select("vendor_id")
          .eq("user_id", user.id)
          .not("accepted_at", "is", null)
          .limit(1)
          .single();

        if (teamMemberError || !teamMemberData) {
          throw new Error("Vendor account not found. Please ensure you have a vendor account or are a team member of one.");
        }

        // Get the vendor they're a team member of
        const { data: teamVendor, error: teamVendorError } = await supabaseClient
          .from("vendors")
          .select("*")
          .eq("id", teamMemberData.vendor_id)
          .single();

        if (teamVendorError || !teamVendor) {
          throw new Error("Team vendor not found");
        }

        vendor = teamVendor;
        logStep("Found vendor via team membership", { vendorId: vendor.id });
      } else {
        vendor = vendorData;
        logStep("Found vendor via ownership", { vendorId: vendor.id });
      }
    }

    // Get Stripe mode from app_settings
    const { data: modeSetting } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_mode')
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

    // If vendor already has a Stripe account, return account status
    if (vendor.stripe_account_id) {
      logStep("Vendor already has Stripe account", { accountId: vendor.stripe_account_id });

      try {
        const account = await stripe.accounts.retrieve(vendor.stripe_account_id);
        
        // If onboarding not complete, generate new onboarding link
        if (!account.details_submitted) {
          const origin = req.headers.get("origin") || "http://localhost:3000";
          const accountLink = await stripe.accountLinks.create({
            account: vendor.stripe_account_id,
            refresh_url: `${origin}/vendor-dashboard`,
            return_url: `${origin}/vendor-dashboard`,
            type: "account_onboarding",
          });

          return new Response(
            JSON.stringify({ 
              accountId: vendor.stripe_account_id,
              onboardingUrl: accountLink.url,
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
              detailsSubmitted: account.details_submitted,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            accountId: vendor.stripe_account_id,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (stripeError) {
        logStep("Error retrieving Stripe account, may need to recreate", { error: stripeError });
        // Account may have been deleted, continue to create new one
      }
    }

    // Create new Stripe Connect Express account
    logStep("Creating new Stripe account");
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: vendor.business_name,
      },
    });

    logStep("Created Stripe account", { accountId: account.id });

    // Save account ID to vendor
    const { error: updateError } = await supabaseClient
      .from("vendors")
      .update({ stripe_account_id: account.id })
      .eq("id", vendor.id);

    if (updateError) {
      logStep("Error updating vendor", { error: updateError });
      throw updateError;
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/vendor-dashboard`,
      return_url: `${origin}/vendor-dashboard`,
      type: "account_onboarding",
    });

    logStep("Created account link");

    return new Response(
      JSON.stringify({ 
        accountId: account.id,
        onboardingUrl: accountLink.url,
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
