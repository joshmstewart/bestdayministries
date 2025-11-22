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
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const body = await req.text();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Detect if this is a test or live webhook based on the signature
    const isTestWebhook = signature.startsWith("whsec_test_");
    const stripeMode = isTestWebhook ? "test" : "live";
    
    const webhookSecret = stripeMode === "live"
      ? Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE")
      : Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    
    const stripeKey = stripeMode === "live"
      ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
      : Deno.env.get("STRIPE_SECRET_KEY_TEST");

    if (!webhookSecret || !stripeKey) {
      throw new Error(`Stripe ${stripeMode} webhook secret or API key not configured`);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Processing ${stripeMode} webhook:`, event.type);

    // Create webhook log entry
    const { data: logEntry } = await supabaseAdmin
      .from("stripe_webhook_logs")
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_mode: stripeMode,
        processing_status: "processing",
        event_data: event.data,
      })
      .select()
      .single();

    const logId = logEntry?.id || null;

    const logStep = async (step: string, status: string, details?: any) => {
      console.log(`[${event.type}] ${step}:`, status, details || "");
    };

    try {
      await processWebhookEvent(event, stripe, supabaseAdmin, stripeMode, logStep, logId);

      if (logId) {
        await supabaseAdmin
          .from("stripe_webhook_logs")
          .update({ processing_status: "success" })
          .eq("id", logId);
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (error) {
      console.error("Error processing webhook:", error);

      if (logId) {
        await supabaseAdmin
          .from("stripe_webhook_logs")
          .update({
            processing_status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", logId);
      }

      throw error;
    }
  } catch (error) {
    console.error("Fatal error in webhook handler:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function processWebhookEvent(
  event: Stripe.Event,
  stripe: Stripe,
  supabaseAdmin: any,
  stripeMode: string,
  logStep: Function,
  logId: string | null
) {
  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await logStep("processing_subscription_change", "info");
      
      const subscription = event.data.object as Stripe.Subscription;
      const newStatus = subscription.status === "canceled" ? "cancelled" : 
                       subscription.status === "paused" ? "paused" : "active";

      await logStep("subscription_status_change", "info", {
        subscription_id: subscription.id,
        new_status: newStatus,
      });

      const { data: sponsorshipData } = await supabaseAdmin
        .from("sponsorships")
        .update({ status: newStatus })
        .eq("stripe_subscription_id", subscription.id)
        .eq("stripe_mode", stripeMode)
        .select()
        .single();

      if (sponsorshipData) {
        await logStep("sponsorship_updated", "success", {
          sponsorship_id: sponsorshipData.id,
          status: newStatus,
        });
        
        if (logId) {
          await supabaseAdmin
            .from("stripe_webhook_logs")
            .update({
              related_record_type: "sponsorship",
              related_record_id: sponsorshipData.id,
            })
            .eq("id", logId);
        }
      } else {
        await logStep("sponsorship_not_found", "info", {
          subscription_id: subscription.id,
        });
      }
      break;
    }

    case "checkout.session.completed": {
      await logStep("processing_checkout_session", "info");
      
      const session = event.data.object as Stripe.Checkout.Session;
      
      // PHASE 3: CRITICAL FIX - Prioritize bestie_id check for sponsorships
      // Classification logic:
      // 1. If bestie_id exists → SPONSORSHIP (highest priority)
      // 2. If metadata.type === 'donation' → DONATION
      // 3. Otherwise → SKIP (unknown type)
      
      const hasBestieId = !!session.metadata?.bestie_id;
      const isDonation = session.metadata?.type === 'donation';
      
      await logStep("classification_check", "info", {
        has_bestie_id: hasBestieId,
        is_donation: isDonation,
        metadata: session.metadata
      });
      
      if (hasBestieId) {
        // SPONSORSHIP: bestie_id present means this is a sponsorship
        await logStep("classified_as_sponsorship", "info");
        
        // PHASE 3: Cross-check - verify no donation exists with same Stripe ID
        if (session.subscription) {
          const { data: existingDonation } = await supabaseAdmin
            .from("donations")
            .select("id")
            .eq("stripe_subscription_id", session.subscription)
            .eq("stripe_mode", stripeMode)
            .maybeSingle();
          
          if (existingDonation) {
            await logStep("duplicate_prevention", "warning", {
              message: "Donation already exists for this subscription - skipping sponsorship creation",
              donation_id: existingDonation.id,
              subscription_id: session.subscription
            });
            return;
          }
        }
        
        if (session.mode === "subscription" && session.subscription) {
          await processSponsorshipCheckout(session, stripe, supabaseAdmin, stripeMode, logStep, logId);
        }
      } else if (isDonation) {
        // DONATION: metadata.type === 'donation' and NO bestie_id
        await logStep("classified_as_donation", "info");
        
        // PHASE 3: Cross-check - verify no sponsorship exists with same Stripe ID
        if (session.subscription) {
          const { data: existingSponsorship } = await supabaseAdmin
            .from("sponsorships")
            .select("id")
            .eq("stripe_subscription_id", session.subscription)
            .eq("stripe_mode", stripeMode)
            .maybeSingle();
          
          if (existingSponsorship) {
            await logStep("duplicate_prevention", "warning", {
              message: "Sponsorship already exists for this subscription - skipping donation creation",
              sponsorship_id: existingSponsorship.id,
              subscription_id: session.subscription
            });
            return;
          }
        }
        
        await processDonationCheckout(session, supabaseAdmin, stripeMode, logStep, logId);
      } else {
        await logStep("classification_failed", "warning", {
          message: "Could not classify checkout - missing both bestie_id and donation type",
          metadata: session.metadata
        });
      }
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.paid": {
      await logStep("processing_invoice_payment", "info");
      
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.billing_reason === "subscription_create") {
        await logStep("skipping_initial_invoice", "info", {
          reason: "Handled by checkout.session.completed",
        });
        return;
      }
      
      const subscriptionId = getSubscriptionFromInvoice(invoice);
      
      if (!subscriptionId) {
        await logStep("invoice_not_subscription", "info");
        return;
      }
      
      await logStep("found_subscription_id", "info", {
        subscription_id: subscriptionId,
      });

      await processRecurringPayment(
        invoice,
        stripe,
        supabaseAdmin,
        stripeMode,
        logStep,
        logId,
        subscriptionId
      );
      break;
    }

    default:
      await logStep("unhandled_event_type", "info", {
        event_type: event.type,
      });
      
      if (logId) {
        await supabaseAdmin
          .from("stripe_webhook_logs")
          .update({ processing_status: "skipped" })
          .eq("id", logId);
      }
  }
}

async function processDonationCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: any,
  stripeMode: string,
  logStep: Function,
  logId: string | null
) {
  const customerEmail = session.customer_details?.email;
  if (!customerEmail) {
    await logStep("customer_email_missing", "error");
    throw new Error("No customer email in donation checkout session");
  }

  await logStep("fetching_user_for_donation", "info", {
    email: customerEmail,
  });
  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("email", customerEmail)
    .maybeSingle();
  
  const user = profileData ? { id: profileData.id, email: profileData.email } : null;
  const amountCharged = session.amount_total ? session.amount_total / 100 : 0;
  
  if (session.mode === "payment") {
    await logStep("processing_one_time_donation", "info", {
      amount_charged: amountCharged,
      session_id: session.id,
    });
    
    const { data: donation, error: donationError } = await supabaseAdmin
      .from("donations")
      .insert({
        donor_id: user?.id,
        donor_email: customerEmail,
        amount: amountCharged,
        currency: session.currency,
        status: "succeeded",
        payment_method: "stripe",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (donationError) {
      await logStep("donation_creation_failed", "error", {
        error: donationError.message,
      });
      throw donationError;
    }

    await logStep("one_time_donation_created", "success", {
      donation_id: donation.id,
    });

    if (logId) {
      await supabaseAdmin
        .from("stripe_webhook_logs")
        .update({
          related_record_type: "donation",
          related_record_id: donation.id,
        })
        .eq("id", logId);
    }
  } else if (session.mode === "subscription" && session.subscription) {
    await logStep("processing_monthly_donation", "info", {
      amount_charged: amountCharged,
      subscription_id: session.subscription,
    });

    const { data: donation, error: donationError } = await supabaseAdmin
      .from("donations")
      .insert({
        donor_id: user?.id,
        donor_email: customerEmail,
        amount: amountCharged,
        currency: session.currency,
        frequency: "monthly",
        status: "active",
        payment_method: "stripe",
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer as string,
        stripe_checkout_session_id: session.id,
        stripe_mode: stripeMode,
      })
      .select()
      .single();

    if (donationError) {
      await logStep("monthly_donation_creation_failed", "error", {
        error: donationError.message,
      });
      throw donationError;
    }

    await logStep("monthly_donation_created", "success", {
      donation_id: donation.id,
    });

    if (logId) {
      await supabaseAdmin
        .from("stripe_webhook_logs")
        .update({
          related_record_type: "donation",
          related_record_id: donation.id,
        })
        .eq("id", logId);
    }
  }
}

async function processSponsorshipCheckout(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabaseAdmin: any,
  stripeMode: string,
  logStep: Function,
  logId: string | null
) {
  const subscriptionId = session.subscription as string;
  
  await logStep("fetching_subscription", "info", {
    subscription_id: subscriptionId,
  });
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerEmail = session.customer_details?.email || session.customer_email;
  
  if (!customerEmail) {
    await logStep("customer_email_missing", "error");
    throw new Error("No customer email in session");
  }

  await logStep("fetching_user", "info", { email: customerEmail });
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const user = usersData.users.find(
    (u: any) => u.email?.toLowerCase() === customerEmail.toLowerCase()
  );
  const userId = user?.id || null;

  const sponsorBestieId = session.metadata?.bestie_id;
  if (!sponsorBestieId) {
    await logStep("bestie_id_missing", "error");
    throw new Error("No bestie_id in sponsorship session metadata");
  }

  // Check if sponsorship already exists
  const { data: existingSponsorship } = await supabaseAdmin
    .from("sponsorships")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("stripe_mode", stripeMode)
    .maybeSingle();

  if (existingSponsorship) {
    await logStep("sponsorship_already_exists", "info", {
      sponsorship_id: existingSponsorship.id,
    });
    return;
  }

  // Get bestie details
  const { data: sponsorBestieData } = await supabaseAdmin
    .from("sponsor_besties")
    .select("bestie_id, bestie_name")
    .eq("id", sponsorBestieId)
    .single();

  if (!sponsorBestieData) {
    await logStep("sponsor_bestie_not_found", "error");
    throw new Error("Sponsor bestie not found");
  }

  const amount = subscription.items.data[0]?.price?.unit_amount
    ? subscription.items.data[0].price.unit_amount / 100
    : 0;

  await logStep("creating_sponsorship", "info", {
    amount,
    bestie_id: sponsorBestieData.bestie_id,
  });

  const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
    .from("sponsorships")
    .insert({
      sponsor_id: userId,
      sponsor_email: userId ? null : customerEmail,
      sponsor_bestie_id: sponsorBestieId,
      bestie_id: sponsorBestieData.bestie_id,
      amount: amount,
      frequency: "monthly",
      status: "active",
      started_at: new Date().toISOString(),
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      stripe_checkout_session_id: session.id,
      stripe_mode: stripeMode,
    })
    .select()
    .single();

  if (sponsorshipError) {
    await logStep("sponsorship_creation_failed", "error", {
      error: sponsorshipError.message,
    });
    throw sponsorshipError;
  }

  await logStep("sponsorship_created", "success", {
    sponsorship_id: sponsorship.id,
  });

  if (logId) {
    await supabaseAdmin
      .from("stripe_webhook_logs")
      .update({
        related_record_type: "sponsorship",
        related_record_id: sponsorship.id,
      })
      .eq("id", logId);
  }

  // Generate receipt
  await generateSponsorshipReceipt(
    sponsorship,
    customerEmail,
    sponsorBestieData.bestie_name,
    session.id,
    stripeMode,
    supabaseAdmin,
    logStep
  );
}

async function processRecurringPayment(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabaseAdmin: any,
  stripeMode: string,
  logStep: Function,
  logId: string | null,
  subscriptionId: string
) {
  const customerEmail = invoice.customer_email;
  if (!customerEmail) {
    await logStep("customer_email_missing", "error");
    throw new Error("No customer email in invoice");
  }

  const { data: sponsorship } = await supabaseAdmin
    .from("sponsorships")
    .select("id, status, bestie_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("stripe_mode", stripeMode)
    .single();

  if (!sponsorship) {
    await logStep("sponsorship_not_found", "error", { subscriptionId });
    return;
  }

  if (sponsorship.status !== "active") {
    await logStep("sponsorship_not_active", "info", {
      sponsorshipId: sponsorship.id,
      status: sponsorship.status,
    });
    return;
  }

  const { data: bestieData } = await supabaseAdmin
    .from("besties")
    .select("bestie_name")
    .eq("id", sponsorship.bestie_id)
    .single();

  if (!bestieData) {
    await logStep("bestie_not_found", "error", {
      bestieId: sponsorship.bestie_id,
    });
    return;
  }

  const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;

  await logStep("processing_payment", "info", {
    amount_paid: amountPaid,
    invoice_id: invoice.id,
  });

  await generateSponsorshipReceipt(
    sponsorship,
    customerEmail,
    bestieData.bestie_name,
    invoice.id,
    stripeMode,
    supabaseAdmin,
    logStep
  );
}

async function generateSponsorshipReceipt(
  sponsorship: any,
  customerEmail: string,
  bestieName: string,
  transactionId: string,
  stripeMode: string,
  supabaseAdmin: any,
  logStep: Function
) {
  await logStep("generating_receipt", "info", {
    sponsorship_id: sponsorship.id,
    email: customerEmail,
  });

  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from("sponsorship_receipts")
    .insert({
      sponsorship_id: sponsorship.id,
      email: customerEmail,
      bestie_name: bestieName,
      transaction_id: transactionId,
      stripe_mode: stripeMode,
    })
    .select()
    .single();

  if (receiptError) {
    await logStep("receipt_generation_failed", "error", {
      error: receiptError.message,
    });
    throw receiptError;
  }

  await logStep("receipt_generated", "success", { receipt_id: receipt.id });
}

function getSubscriptionFromInvoice(invoice: Stripe.Invoice): string | null {
  if (typeof invoice.subscription === "string") {
    return invoice.subscription;
  }
  return null;
}
