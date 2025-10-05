import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Note: Webhooks will receive events from the mode they were created in
// Configure separate webhook endpoints in Stripe for test and live modes
const stripeTestKey = Deno.env.get('STRIPE_SECRET_KEY_TEST') || "";
const stripeLiveKey = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || "";
const testWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
const liveWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Try to construct event with test key first, then live
    // Only one will succeed based on which mode created the webhook event
    let event;
    let stripe;
    let stripeMode = 'test'; // Track which mode we're in
    
    try {
      if (testWebhookSecret) {
        stripe = new Stripe(stripeTestKey, { apiVersion: "2025-08-27.basil" });
        event = await stripe.webhooks.constructEventAsync(body, signature, testWebhookSecret);
        stripeMode = 'test';
      }
    } catch (e) {
      // If test fails, try live
      if (!liveWebhookSecret) {
        throw new Error('No valid webhook secret found');
      }
      stripe = new Stripe(stripeLiveKey, { apiVersion: "2025-08-27.basil" });
      event = await stripe.webhooks.constructEventAsync(body, signature, liveWebhookSecret);
      stripeMode = 'live';
    }

    console.log(`Received event: ${event.type}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle subscription events
    switch (event.type) {
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get the customer's email
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) {
          console.log("Customer not found or deleted");
          break;
        }

        const customerEmail = (customer as Stripe.Customer).email;
        if (!customerEmail) {
          console.log("Customer email not found");
          break;
        }

        // Find the user by email in auth.users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching users:", authError);
          break;
        }

        const user = authData.users.find(u => u.email === customerEmail);
        if (!user) {
          console.log("User not found for email:", customerEmail);
          break;
        }

        // Determine the new status based on subscription state
        let newStatus: string;
        let endDate: string | null = null;
        
        if (subscription.status === "active" && subscription.cancel_at_period_end) {
          // Subscription is active but scheduled to cancel
          newStatus = "active";
          endDate = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null;
          console.log(`Subscription scheduled to cancel at period end: ${endDate}`);
        } else if (subscription.status === "active") {
          // Subscription is fully active
          newStatus = "active";
          endDate = null;
        } else {
          // Subscription is cancelled or in other terminal state
          newStatus = "cancelled";
          endDate = new Date().toISOString();
        }

        // Get the sponsor_bestie_id from subscription metadata if available
        const sponsorBestieId = subscription.metadata?.bestie_id;

        if (sponsorBestieId) {
          // Update the specific sponsorship
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({
              status: newStatus,
              ended_at: endDate,
            })
            .eq("sponsor_id", user.id)
            .eq("sponsor_bestie_id", sponsorBestieId);

          if (updateError) {
            console.error("Error updating sponsorship:", updateError);
          } else {
            console.log(`Updated sponsorship for user ${user.id}, sponsor_bestie ${sponsorBestieId} to status: ${newStatus}, end date: ${endDate}`);
          }
        } else {
          // Update all sponsorships for this user (fallback if metadata not available)
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({
              status: newStatus,
              ended_at: endDate,
            })
            .eq("sponsor_id", user.id);

          if (updateError) {
            console.error("Error updating sponsorships:", updateError);
          } else {
            console.log(`Updated all sponsorships for user ${user.id} to status: ${newStatus}, end date: ${endDate}`);
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Handle subscription checkout completion
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          const customerEmail = session.customer_details?.email;
          if (!customerEmail) {
            console.log("No customer email in checkout session");
            break;
          }

          // Find the user by email in auth.users
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (authError) {
            console.error("Error fetching users:", authError);
            break;
          }

          const user = authData.users.find(u => u.email === customerEmail);
          if (!user) {
          console.log("User not found for email:", customerEmail);
          break;
        }

        // Get sponsor_bestie_id from metadata
        const sponsorBestieId = session.metadata?.bestie_id;
        if (!sponsorBestieId) {
          console.log("No bestie_id in session metadata");
          break;
        }

          // Calculate amount (Stripe amounts are in cents)
          const amount = session.amount_total ? session.amount_total / 100 : 0;
          const frequency = subscription.items.data[0]?.price.recurring?.interval === "month" ? "monthly" : "yearly";

        // Create or update sponsorship record
        const { error: upsertError } = await supabaseAdmin
          .from("sponsorships")
          .upsert({
            sponsor_id: user.id,
            sponsor_bestie_id: sponsorBestieId,
            amount: amount,
            frequency: frequency,
            status: "active",
            started_at: new Date().toISOString(),
            stripe_mode: stripeMode,
          }, {
            onConflict: "sponsor_id,sponsor_bestie_id",
          });

        if (upsertError) {
          console.error("Error creating sponsorship:", upsertError);
        } else {
          console.log(`Created/updated sponsorship for user ${user.id}, sponsor_bestie ${sponsorBestieId}`);
        }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400 }
    );
  }
});