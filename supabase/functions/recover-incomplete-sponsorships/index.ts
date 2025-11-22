import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => ["admin", "owner"].includes(r.role));
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get Stripe mode
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "stripe_mode")
      .single();

    const stripeMode = settings?.setting_value === "live" ? "live" : "test";
    const stripeKey = stripeMode === "live" 
      ? Deno.env.get("STRIPE_SECRET_KEY")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    const stripe = new Stripe(stripeKey!, {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Finding incomplete sponsorships...");

    // Find sponsorships with missing critical fields
    const { data: incompleteSponsorships, error: fetchError } = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .not("stripe_subscription_id", "is", null)
      .or("sponsor_email.is.null,bestie_id.is.null,stripe_customer_id.is.null");

    if (fetchError) {
      throw new Error(`Error fetching sponsorships: ${fetchError.message}`);
    }

    console.log(`Found ${incompleteSponsorships?.length || 0} incomplete sponsorships`);

    const results = {
      checked: 0,
      fixed: 0,
      skipped: 0,
      errors: [] as any[],
    };

    for (const sponsorship of incompleteSponsorships || []) {
      try {
        results.checked++;
        console.log(`\nProcessing sponsorship ${sponsorship.id}...`);

        // Skip if wrong Stripe mode
        if (sponsorship.stripe_mode !== stripeMode) {
          console.log(`  Skipped: Wrong Stripe mode (${sponsorship.stripe_mode} vs ${stripeMode})`);
          results.skipped++;
          continue;
        }

        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(sponsorship.stripe_subscription_id);
        console.log(`  Found subscription: ${subscription.id}`);

        // Fetch customer from Stripe
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) {
          console.log(`  Skipped: Customer not found or deleted`);
          results.skipped++;
          continue;
        }

        const customerEmail = (customer as Stripe.Customer).email;
        const customerId = customer.id;

        console.log(`  Customer: ${customerId} (${customerEmail})`);

        // Prepare update data
        const updateData: any = {};
        let needsUpdate = false;

        if (!sponsorship.sponsor_email && customerEmail) {
          updateData.sponsor_email = customerEmail;
          needsUpdate = true;
          console.log(`  Will add sponsor_email: ${customerEmail}`);
        }

        if (!sponsorship.stripe_customer_id) {
          updateData.stripe_customer_id = customerId;
          needsUpdate = true;
          console.log(`  Will add stripe_customer_id: ${customerId}`);
        }

        // Try to get bestie_id from metadata or receipts
        if (!sponsorship.bestie_id) {
          let bestieId = subscription.metadata?.bestie_id;

          // If not in metadata, try to get from sponsor_bestie_id lookup
          if (!bestieId && sponsorship.sponsor_bestie_id) {
            const { data: sponsorBestie } = await supabaseAdmin
              .from("sponsor_besties")
              .select("bestie_id")
              .eq("id", sponsorship.sponsor_bestie_id)
              .single();

            if (sponsorBestie?.bestie_id) {
              bestieId = sponsorBestie.bestie_id;
              console.log(`  Found bestie_id from sponsor_bestie: ${bestieId}`);
            }
          }

          // If not found, try to get from receipts
          if (!bestieId) {
            const { data: receipt } = await supabaseAdmin
              .from("sponsorship_receipts")
              .select("bestie_name")
              .eq("sponsorship_id", sponsorship.id)
              .limit(1)
              .single();

            if (receipt?.bestie_name && receipt.bestie_name !== 'Bestie') {
              console.log(`  Found bestie_name from receipt: ${receipt.bestie_name}`);
              // Could potentially match to profiles here if needed
            }
          }

          if (bestieId) {
            updateData.bestie_id = bestieId;
            needsUpdate = true;
            console.log(`  Will add bestie_id: ${bestieId}`);
          }
        }

        // Update sponsorship if needed
        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update(updateData)
            .eq("id", sponsorship.id);

          if (updateError) {
            console.log(`  Error updating: ${updateError.message}`);
            results.errors.push({
              sponsorship_id: sponsorship.id,
              error: updateError.message,
              subscription_id: sponsorship.stripe_subscription_id
            });
          } else {
            console.log(`  ✅ Updated successfully`);
            results.fixed++;
          }
        } else {
          console.log(`  Skipped: No missing data found`);
          results.skipped++;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  Error: ${message}`);
        results.errors.push({
          sponsorship_id: sponsorship.id,
          error: message,
          subscription_id: sponsorship.stripe_subscription_id
        });
      }
    }

    console.log("\n=== Recovery Complete ===");
    console.log(`Checked: ${results.checked}`);
    console.log(`Fixed: ${results.fixed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recovery error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
