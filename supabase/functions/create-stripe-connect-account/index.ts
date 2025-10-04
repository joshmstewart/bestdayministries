import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    console.log("Creating Stripe Connect account for user:", user.id);

    // Check if user has a vendor account
    const { data: vendor, error: vendorError } = await supabaseClient
      .from("vendors")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (vendorError || !vendor) {
      throw new Error("Vendor account not found");
    }

    // If vendor already has a Stripe account, return account status
    if (vendor.stripe_account_id) {
      console.log("Vendor already has Stripe account:", vendor.stripe_account_id);
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const account = await stripe.accounts.retrieve(vendor.stripe_account_id);
      
      return new Response(
        JSON.stringify({ 
          accountId: vendor.stripe_account_id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new Stripe Connect Express account
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

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

    console.log("Created Stripe account:", account.id);

    // Save account ID to vendor
    const { error: updateError } = await supabaseClient
      .from("vendors")
      .update({ stripe_account_id: account.id })
      .eq("id", vendor.id);

    if (updateError) {
      console.error("Error updating vendor:", updateError);
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

    console.log("Created account link");

    return new Response(
      JSON.stringify({ 
        accountId: account.id,
        onboardingUrl: accountLink.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});