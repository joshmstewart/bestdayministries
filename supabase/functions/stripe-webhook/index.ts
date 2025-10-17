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
    
    // Determine which mode to use based on which webhook secret is configured
    let event;
    let stripe;
    let stripeMode = 'test';
    
    // Try live webhook secret first if available
    if (liveWebhookSecret) {
      try {
        stripe = new Stripe(stripeLiveKey, { apiVersion: "2025-08-27.basil" });
        event = await stripe.webhooks.constructEventAsync(body, signature, liveWebhookSecret);
        stripeMode = 'live';
        console.log('✅ Live webhook signature verified');
      } catch (liveError) {
        console.log('Live webhook verification failed, trying test...');
        // If live fails and test secret exists, try test
        if (testWebhookSecret) {
          stripe = new Stripe(stripeTestKey, { apiVersion: "2025-08-27.basil" });
          event = await stripe.webhooks.constructEventAsync(body, signature, testWebhookSecret);
          stripeMode = 'test';
          console.log('✅ Test webhook signature verified');
        } else {
          console.error('❌ Live webhook verification failed:', liveError);
          throw liveError;
        }
      }
    } else if (testWebhookSecret) {
      // Only test secret available
      stripe = new Stripe(stripeTestKey, { apiVersion: "2025-08-27.basil" });
      event = await stripe.webhooks.constructEventAsync(body, signature, testWebhookSecret);
      stripeMode = 'test';
      console.log('✅ Test webhook signature verified');
    } else {
      throw new Error('No webhook secrets configured');
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

        // Check if this is a donation subscription (has donation metadata)
        const isDonation = subscription.metadata?.type === 'donation';
        
        if (isDonation) {
          // Update donation status
          const { error: updateError } = await supabaseAdmin
            .from("donations")
            .update({
              status: newStatus,
              ended_at: endDate,
            })
            .eq("stripe_subscription_id", subscription.id);

          if (updateError) {
            console.error("Error updating donation:", updateError);
          } else {
            console.log(`Updated donation subscription ${subscription.id} to status: ${newStatus}, end date: ${endDate}`);
          }
        } else {
          // Handle sponsorship subscription
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
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Check if this is a donation (has donation metadata)
        const isDonation = session.metadata?.type === 'donation';
        
        if (isDonation) {
          // Handle donation checkout completion
          const customerEmail = session.customer_details?.email;
          if (!customerEmail) {
            console.log("No customer email in donation checkout session");
            break;
          }

          // Find the user by email in auth.users
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
          if (authError) {
            console.error("Error fetching users:", authError);
            break;
          }

          const user = authData.users.find(u => u.email === customerEmail);
          
          // Calculate amount (Stripe amounts are in cents)
          const amount = session.amount_total ? session.amount_total / 100 : 0;
          
          if (session.mode === "payment") {
            // One-time donation
            const { error: updateError } = await supabaseAdmin
              .from("donations")
              .update({
                status: "completed",
              })
              .eq("donor_email", customerEmail)
              .eq("amount", amount)
              .eq("frequency", "one-time")
              .eq("status", "pending");

            if (updateError) {
              console.error("Error updating one-time donation:", updateError);
            } else {
              console.log(`Completed one-time donation for ${customerEmail}, amount: $${amount}`);
            }
          } else if (session.mode === "subscription" && session.subscription) {
            // Monthly donation
            const subscriptionId = session.subscription as string;
            
            const { error: updateError } = await supabaseAdmin
              .from("donations")
              .update({
                status: "active",
                stripe_subscription_id: subscriptionId,
                started_at: new Date().toISOString(),
              })
              .eq("donor_email", customerEmail)
              .eq("amount", amount)
              .eq("frequency", "monthly")
              .eq("status", "pending");

            if (updateError) {
              console.error("Error updating monthly donation:", updateError);
            } else {
              console.log(`Activated monthly donation for ${customerEmail}, amount: $${amount}/month`);
            }
          }
        } else if (session.mode === "subscription" && session.subscription) {
          // Handle sponsorship subscription checkout completion
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
            stripe_subscription_id: subscriptionId,
            stripe_mode: stripeMode,
          }, {
            onConflict: "sponsor_id,sponsor_bestie_id",
          });

        if (upsertError) {
          console.error("Error creating sponsorship:", upsertError);
        } else {
          console.log(`Created/updated sponsorship for user ${user.id}, sponsor_bestie ${sponsorBestieId}`);
          
          // Send receipt email
          const { data: bestieData } = await supabaseAdmin
            .from('sponsor_besties')
            .select('bestie_name')
            .eq('id', sponsorBestieId)
            .single();

          // Get sponsor name from user metadata
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();

          if (bestieData) {
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                },
              body: JSON.stringify({
                sponsorshipId: upsertError ? undefined : sponsorBestieId, // Pass sponsorship context
                sponsorEmail: customerEmail,
                sponsorName: profileData?.display_name || null,
                bestieName: bestieData.bestie_name,
                amount: amount,
                frequency: frequency,
                transactionId: session.id,
                transactionDate: new Date().toISOString(),
                stripeMode: stripeMode,
              }),
              });
              console.log('Receipt email sent for webhook sponsorship');
            } catch (emailError) {
              console.error('Failed to send receipt email:', emailError);
            }
          }
        }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Handle recurring subscription payments (SKIP initial invoice - already handled by checkout.session.completed)
        const invoice = event.data.object as Stripe.Invoice;
        
        // Skip if this is the first invoice (billing_reason: 'subscription_create')
        // These are already handled by checkout.session.completed
        if (invoice.billing_reason === 'subscription_create') {
          console.log('Skipping initial subscription invoice - already handled by checkout.session.completed');
          break;
        }
        
        if (!invoice.subscription) {
          console.log("Invoice not related to a subscription");
          break;
        }

        const customerEmail = invoice.customer_email;
        if (!customerEmail) {
          console.log("No customer email in invoice");
          break;
        }

        // Find the user by email
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

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const sponsorBestieId = subscription.metadata?.bestie_id;
        
        if (!sponsorBestieId) {
          console.log("No bestie_id in subscription metadata");
          break;
        }

        // Get bestie data and sponsor name
        const { data: bestieData } = await supabaseAdmin
          .from('sponsor_besties')
          .select('bestie_name')
          .eq('id', sponsorBestieId)
          .single();

        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        if (bestieData) {
          const amount = invoice.amount_paid / 100; // Convert cents to dollars
          const frequency = subscription.items.data[0]?.price.recurring?.interval === "month" ? "monthly" : "yearly";

          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                sponsorshipId: sponsorBestieId, // Pass sponsorship context
                sponsorEmail: customerEmail,
                sponsorName: profileData?.display_name || null,
                bestieName: bestieData.bestie_name,
                amount: amount,
                frequency: frequency,
                transactionId: invoice.id,
                transactionDate: new Date(invoice.created * 1000).toISOString(),
                stripeMode: stripeMode,
              }),
            });
            console.log('Receipt email sent for recurring payment');
          } catch (emailError) {
            console.error('Failed to send receipt email:', emailError);
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
    console.error("❌ Webhook error:", err);
    
    // CRITICAL: Return 200 even for errors so Stripe doesn't keep retrying
    // Most webhook errors are non-retryable (signature mismatch, missing data, etc.)
    // We log the error for debugging but tell Stripe the webhook was received
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: (err as Error).message,
        note: "Error logged but returning 200 to prevent Stripe retries"
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );
  }
});