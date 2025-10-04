import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature || !endpointSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

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

        // Find the user by email from auth.users using service role
        const { data: authUsers } = await supabaseAdmin
          .from('auth.users')
          .select('id')
          .eq('email', customerEmail)
          .limit(1);
        
        if (!authUsers || authUsers.length === 0) {
          console.log("User not found for email:", customerEmail);
          break;
        }

        const userId = authUsers[0].id;

        // Determine the new status
        const newStatus = subscription.status === "active" ? "active" : "cancelled";

        // Get the bestie_id from subscription metadata if available
        const bestieId = subscription.metadata?.bestie_id;

        if (bestieId) {
          // Update the specific sponsorship
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({
              status: newStatus,
              ended_at: newStatus === "cancelled" ? new Date().toISOString() : null,
            })
            .eq("sponsor_id", userId)
            .eq("bestie_id", bestieId);

          if (updateError) {
            console.error("Error updating sponsorship:", updateError);
          } else {
            console.log(`Updated sponsorship for user ${userId}, bestie ${bestieId} to status: ${newStatus}`);
          }
        } else {
          // Update all sponsorships for this user (fallback if metadata not available)
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({
              status: newStatus,
              ended_at: newStatus === "cancelled" ? new Date().toISOString() : null,
            })
            .eq("sponsor_id", userId);

          if (updateError) {
            console.error("Error updating sponsorships:", updateError);
          } else {
            console.log(`Updated all sponsorships for user ${userId} to status: ${newStatus}`);
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

          // Find the user by email from auth.users using service role
          const { data: authUsers } = await supabaseAdmin
            .from('auth.users')
            .select('id')
            .eq('email', customerEmail)
            .limit(1);
          
          if (!authUsers || authUsers.length === 0) {
            console.log("User not found for email:", customerEmail);
            break;
          }

          const userId = authUsers[0].id;

          // Get bestie_id from metadata
          const bestieId = session.metadata?.bestie_id;
          if (!bestieId) {
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
              sponsor_id: userId,
              bestie_id: bestieId,
              amount: amount,
              frequency: frequency,
              status: "active",
              started_at: new Date().toISOString(),
            }, {
              onConflict: "sponsor_id,bestie_id",
            });

          if (upsertError) {
            console.error("Error creating sponsorship:", upsertError);
          } else {
            console.log(`Created/updated sponsorship for user ${userId}, bestie ${bestieId}`);
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
