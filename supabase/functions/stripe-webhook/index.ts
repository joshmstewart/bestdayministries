import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Webhook handler with comprehensive logging - Updated 2025-11-06
const stripeTestKey = Deno.env.get('STRIPE_SECRET_KEY_TEST') || "";
const stripeLiveKey = Deno.env.get('STRIPE_SECRET_KEY_LIVE') || "";
const testWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
const liveWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");

// Helper function to add processing steps to the log
async function addProcessingStep(
  supabase: any,
  logId: string,
  step: string,
  status: 'success' | 'error' | 'info',
  details?: any
) {
  const stepEntry = {
    timestamp: new Date().toISOString(),
    step,
    status,
    details: details || {}
  };
  
  await supabase.rpc('jsonb_array_append', {
    target_table: 'stripe_webhook_logs',
    target_id: logId,
    target_column: 'processing_steps',
    new_element: stepEntry
  }).catch((err: Error) => {
    console.error('Failed to add processing step:', err);
  });
}

serve(async (req) => {
  const startTime = Date.now();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let logId: string | null = null;
  let event: Stripe.Event;
  let stripe: Stripe;
  let stripeMode = 'test';

  try {
    const body = await req.text();
    
    // Try live webhook secret first if available
    if (liveWebhookSecret) {
      try {
        stripe = new Stripe(stripeLiveKey, { apiVersion: "2025-08-27.basil" });
        event = await stripe.webhooks.constructEventAsync(body, signature, liveWebhookSecret);
        stripeMode = 'live';
        console.log('✅ Live webhook signature verified');
      } catch (liveError) {
        console.log('Live webhook verification failed, trying test...');
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
      stripe = new Stripe(stripeTestKey, { apiVersion: "2025-08-27.basil" });
      event = await stripe.webhooks.constructEventAsync(body, signature, testWebhookSecret);
      stripeMode = 'test';
      console.log('✅ Test webhook signature verified');
    } else {
      throw new Error('No webhook secrets configured');
    }

    console.log(`📥 Received event: ${event.type} (${event.id})`);

    // Extract customer info for logging
    let customerId: string | null = null;
    let customerEmail: string | null = null;
    
    if ('customer' in event.data.object && event.data.object.customer) {
      customerId = event.data.object.customer as string;
    }
    if ('customer_email' in event.data.object && event.data.object.customer_email) {
      customerEmail = event.data.object.customer_email as string;
    }
    if ('customer_details' in event.data.object && event.data.object.customer_details) {
      customerEmail = (event.data.object.customer_details as any)?.email || customerEmail;
    }

    // Create initial log entry
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('stripe_webhook_logs')
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_mode: stripeMode,
        raw_event: event,
        processing_status: 'processing',
        customer_id: customerId,
        customer_email: customerEmail,
        http_status_code: 200,
        processing_steps: [{
          timestamp: new Date().toISOString(),
          step: 'webhook_received',
          status: 'success',
          details: { mode: stripeMode }
        }]
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to create webhook log:', logError);
      // Continue processing even if logging fails
    } else {
      logId = logEntry.id;
      console.log(`📝 Created webhook log: ${logId}`);
    }

    // Process the event with comprehensive logging
    try {
      await processWebhookEvent(event, stripe, stripeMode, supabaseAdmin, logId);

      // Mark as successful
      if (logId) {
        const processingDuration = Date.now() - startTime;
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({
            processing_status: 'success',
            completed_at: new Date().toISOString(),
            processing_duration_ms: processingDuration
          })
          .eq('id', logId);
      }

      console.log(`✅ Webhook processed successfully in ${Date.now() - startTime}ms`);
      
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (processingError) {
      // Log processing error
      const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
      const errorStack = processingError instanceof Error ? processingError.stack : undefined;
      
      console.error("❌ Error processing webhook:", errorMessage);
      
      if (logId) {
        const processingDuration = Date.now() - startTime;
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({
            processing_status: 'failed',
            error_message: errorMessage,
            error_stack: errorStack,
            completed_at: new Date().toISOString(),
            processing_duration_ms: processingDuration
          })
          .eq('id', logId);
      }

      // Return 200 to prevent Stripe retries (most errors are non-retryable)
      return new Response(
        JSON.stringify({ 
          received: true, 
          error: errorMessage,
          note: "Error logged but returning 200 to prevent Stripe retries"
        }),
        { 
          headers: { "Content-Type": "application/json" },
          status: 200 
        }
      );
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    // Log signature verification failure
    if (logId) {
      await supabaseAdmin
        .from('stripe_webhook_logs')
        .update({
          processing_status: 'failed',
          error_message: errorMessage,
          error_stack: errorStack,
          completed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime
        })
        .eq('id', logId);
    }
    
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: errorMessage,
        note: "Error logged but returning 200 to prevent Stripe retries"
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200 
      }
    );
  }
});

// Helper function to extract subscription ID from invoice (handles nested structures)
function getSubscriptionFromInvoice(invoice: Stripe.Invoice): string | null {
  // Check top-level subscription field
  if (invoice.subscription) {
    return typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;
  }
  
  // Check line items for subscription
  if (invoice.lines?.data?.[0]?.subscription) {
    const lineSub = invoice.lines.data[0].subscription;
    return typeof lineSub === 'string' ? lineSub : lineSub;
  }
  
  // Check parent.subscription_details (for newer Stripe API versions)
  const parent = invoice as any;
  if (parent.parent?.subscription_details?.subscription) {
    return parent.parent.subscription_details.subscription;
  }
  
  return null;
}

async function processWebhookEvent(
  event: Stripe.Event,
  stripe: Stripe,
  stripeMode: string,
  supabaseAdmin: any,
  logId: string | null
) {
  const logStep = async (step: string, status: 'success' | 'error' | 'info', details?: any) => {
    console.log(`  ${status === 'error' ? '❌' : status === 'success' ? '✅' : 'ℹ️'} ${step}`, details || '');
    if (logId) {
      const stepEntry = {
        timestamp: new Date().toISOString(),
        step,
        status,
        details: details || {}
      };
      
      const { data: currentLog } = await supabaseAdmin
        .from('stripe_webhook_logs')
        .select('processing_steps')
        .eq('id', logId)
        .single();
      
      if (currentLog) {
        const steps = currentLog.processing_steps || [];
        steps.push(stepEntry);
        
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({ processing_steps: steps })
          .eq('id', logId);
      }
    }
  };

  switch (event.type) {
    case "customer.subscription.deleted":
    case "customer.subscription.updated": {
      await logStep('processing_subscription_event', 'info', { event_type: event.type });
      
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await logStep('fetching_customer', 'info', { customer_id: customerId });
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        await logStep('customer_not_found', 'info', { customer_id: customerId });
        return;
      }

      const customerEmail = (customer as Stripe.Customer).email;
      if (!customerEmail) {
        await logStep('customer_email_missing', 'info');
        return;
      }

      await logStep('fetching_user', 'info', { email: customerEmail });
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        await logStep('user_fetch_failed', 'error', { error: authError.message });
        throw new Error(`Error fetching users: ${authError.message}`);
      }

      const user = authData.users.find((u: any) => u.email === customerEmail);
      if (!user) {
        await logStep('user_not_found', 'info', { email: customerEmail });
        return;
      }

      let newStatus: string;
      let endDate: string | null = null;
      
      if (subscription.status === "active" && subscription.cancel_at_period_end) {
        newStatus = "active";
        endDate = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null;
        await logStep('subscription_canceling', 'info', { end_date: endDate });
      } else if (subscription.status === "active") {
        newStatus = "active";
        endDate = null;
        await logStep('subscription_active', 'success');
      } else {
        newStatus = "cancelled";
        endDate = new Date().toISOString();
        await logStep('subscription_cancelled', 'info', { status: subscription.status });
      }

      const isDonation = subscription.metadata?.type === 'donation';
      
      if (isDonation) {
        await logStep('updating_donation', 'info', { subscription_id: subscription.id });
        const { error: updateError, data: donationData } = await supabaseAdmin
          .from("donations")
          .update({ status: newStatus, ended_at: endDate })
          .eq("stripe_subscription_id", subscription.id)
          .select('id')
          .single();

        if (updateError) {
          await logStep('donation_update_failed', 'error', { error: updateError.message });
          throw new Error(`Error updating donation: ${updateError.message}`);
        }
        
        await logStep('donation_updated', 'success', { donation_id: donationData.id, status: newStatus });
        
        if (logId) {
          await supabaseAdmin
            .from('stripe_webhook_logs')
            .update({ 
              related_record_type: 'donation',
              related_record_id: donationData.id 
            })
            .eq('id', logId);
        }
      } else {
        const sponsorBestieId = subscription.metadata?.bestie_id;
        
        if (sponsorBestieId) {
          await logStep('updating_sponsorship', 'info', { bestie_id: sponsorBestieId });
          const { error: updateError, data: sponsorshipData } = await supabaseAdmin
            .from("sponsorships")
            .update({ status: newStatus, ended_at: endDate })
            .eq("sponsor_id", user.id)
            .eq("sponsor_bestie_id", sponsorBestieId)
            .select('id')
            .single();

          if (updateError) {
            await logStep('sponsorship_update_failed', 'error', { error: updateError.message });
            throw new Error(`Error updating sponsorship: ${updateError.message}`);
          }
          
          await logStep('sponsorship_updated', 'success', { sponsorship_id: sponsorshipData.id, status: newStatus });
          
          if (logId) {
            await supabaseAdmin
              .from('stripe_webhook_logs')
              .update({ 
                related_record_type: 'sponsorship',
                related_record_id: sponsorshipData.id 
              })
              .eq('id', logId);
          }
        } else {
          await logStep('updating_all_sponsorships', 'info', { user_id: user.id });
          const { error: updateError } = await supabaseAdmin
            .from("sponsorships")
            .update({ status: newStatus, ended_at: endDate })
            .eq("sponsor_id", user.id);

          if (updateError) {
            await logStep('sponsorships_update_failed', 'error', { error: updateError.message });
            throw new Error(`Error updating sponsorships: ${updateError.message}`);
          }
          
          await logStep('sponsorships_updated', 'success', { user_id: user.id, status: newStatus });
        }
      }
      break;
    }

    case "checkout.session.completed": {
      await logStep('processing_checkout_session', 'info');
      
      const session = event.data.object as Stripe.Checkout.Session;
      const isDonation = session.metadata?.type === 'donation';
      
      if (isDonation) {
        await processDonationCheckout(session, supabaseAdmin, stripeMode, logStep, logId);
      } else if (session.mode === "subscription" && session.subscription) {
        await processSponsorshipCheckout(session, stripe, supabaseAdmin, stripeMode, logStep, logId);
      }
      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.paid": {
      await logStep('processing_invoice_payment', 'info');
      
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.billing_reason === 'subscription_create') {
        await logStep('skipping_initial_invoice', 'info', { reason: 'Handled by checkout.session.completed' });
        return;
      }
      
      const subscriptionId = getSubscriptionFromInvoice(invoice);
      
      if (!subscriptionId) {
        await logStep('invoice_not_subscription', 'info');
        return;
      }
      
      await logStep('found_subscription_id', 'info', { subscription_id: subscriptionId });

      await processRecurringPayment(invoice, stripe, supabaseAdmin, stripeMode, logStep, logId, subscriptionId);
      break;
    }

    default:
      await logStep('unhandled_event_type', 'info', { event_type: event.type });
      
      if (logId) {
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({ processing_status: 'skipped' })
          .eq('id', logId);
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
    await logStep('customer_email_missing', 'error');
    throw new Error("No customer email in donation checkout session");
  }

  await logStep('fetching_user_for_donation', 'info', { email: customerEmail });
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    await logStep('user_fetch_failed', 'error', { error: authError.message });
    throw new Error(`Error fetching users: ${authError.message}`);
  }

  const user = authData.users.find((u: any) => u.email === customerEmail);
  const amount = session.amount_total ? session.amount_total / 100 : 0;
  
  if (session.mode === "payment") {
    await logStep('processing_one_time_donation', 'info', { amount });
    
    const { data: donationData, error: updateError } = await supabaseAdmin
      .from("donations")
      .update({ status: "completed" })
      .eq("donor_email", customerEmail)
      .eq("amount", amount)
      .eq("frequency", "one-time")
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      await logStep('donation_update_failed', 'error', { error: updateError.message });
      throw new Error(`Error updating one-time donation: ${updateError.message}`);
    }
    
    await logStep('donation_completed', 'success', { donation_id: donationData.id });
    
    if (logId) {
      await supabaseAdmin
        .from('stripe_webhook_logs')
        .update({ 
          related_record_type: 'donation',
          related_record_id: donationData.id 
        })
        .eq('id', logId);
    }
    
    await createAndSendReceipt(
      supabaseAdmin,
      {
        sponsor_email: customerEmail,
        sponsor_name: customerEmail.split('@')[0],
        bestie_name: 'General Support',
        amount,
        frequency: 'one-time',
        transaction_id: session.id,
        transaction_date: new Date().toISOString(),
        stripe_mode: donationData.stripe_mode || 'live',
        user_id: user?.id,
      },
      logStep,
      donationData.id,
      'donation'
    );
  } else if (session.mode === "subscription" && session.subscription) {
    const subscriptionId = session.subscription as string;
    
    await logStep('processing_monthly_donation', 'info', { amount, subscription_id: subscriptionId });
    
    const { data: donationData, error: updateError } = await supabaseAdmin
      .from("donations")
      .update({
        status: "active",
        stripe_subscription_id: subscriptionId,
        started_at: new Date().toISOString(),
      })
      .eq("donor_email", customerEmail)
      .eq("amount", amount)
      .eq("frequency", "monthly")
      .eq("status", "pending")
      .select()
      .single();

    if (updateError) {
      await logStep('donation_update_failed', 'error', { error: updateError.message });
      throw new Error(`Error updating monthly donation: ${updateError.message}`);
    }
    
    await logStep('donation_activated', 'success', { donation_id: donationData.id });
    
    if (logId) {
      await supabaseAdmin
        .from('stripe_webhook_logs')
        .update({ 
          related_record_type: 'donation',
          related_record_id: donationData.id 
        })
        .eq('id', logId);
    }
    
    await createAndSendReceipt(
      supabaseAdmin,
      {
        sponsor_email: customerEmail,
        sponsor_name: customerEmail.split('@')[0],
        bestie_name: 'General Support',
        amount,
        frequency: 'monthly',
        transaction_id: session.id,
        transaction_date: new Date().toISOString(),
        stripe_mode: donationData.stripe_mode || 'live',
        user_id: user?.id,
      },
      logStep,
      donationData.id,
      'donation'
    );
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
  
  await logStep('retrieving_subscription', 'info', { subscription_id: subscriptionId });
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const customerEmail = session.customer_details?.email;
  if (!customerEmail) {
    await logStep('customer_email_missing', 'error');
    throw new Error("No customer email in checkout session");
  }

  await logStep('fetching_user_for_sponsorship', 'info', { email: customerEmail });
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authError) {
    await logStep('user_fetch_failed', 'error', { error: authError.message });
    throw new Error(`Error fetching users: ${authError.message}`);
  }

  const user = authData.users.find((u: any) => u.email === customerEmail);
  if (!user) {
    await logStep('user_not_found', 'error', { email: customerEmail });
    throw new Error("User not found for email: " + customerEmail);
  }

  const sponsorBestieId = session.metadata?.bestie_id;
  if (!sponsorBestieId) {
    await logStep('bestie_id_missing', 'error');
    throw new Error("No bestie_id in session metadata");
  }

  const amount = session.amount_total ? session.amount_total / 100 : 0;
  const frequency = subscription.items.data[0]?.price.recurring?.interval === "month" ? "monthly" : "yearly";

  await logStep('creating_sponsorship', 'info', { bestie_id: sponsorBestieId, amount, frequency });
  
  const { data: sponsorshipData, error: upsertError } = await supabaseAdmin
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
    })
    .select('id')
    .single();

  if (upsertError) {
    await logStep('sponsorship_creation_failed', 'error', { error: upsertError.message });
    throw new Error(`Error creating sponsorship: ${upsertError.message}`);
  }
  
  await logStep('sponsorship_created', 'success', { sponsorship_id: sponsorshipData.id });
  
  if (logId) {
    await supabaseAdmin
      .from('stripe_webhook_logs')
      .update({ 
        related_record_type: 'sponsorship',
        related_record_id: sponsorshipData.id 
      })
      .eq('id', logId);
  }
  
  await createAndSendReceipt(
    supabaseAdmin,
    {
      sponsorship_id: sponsorshipData.id,
      sponsor_email: customerEmail,
      sponsor_name: customerEmail.split('@')[0],
      bestie_name: 'Bestie',
      amount,
      frequency,
      transaction_id: session.id,
      transaction_date: new Date().toISOString(),
      stripe_mode: stripeMode,
      user_id: user.id,
    },
    logStep,
    sponsorshipData.id,
    'sponsorship'
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
    await logStep('customer_email_missing', 'info');
    return;
  }

  await logStep('fetching_user_for_recurring', 'info', { email: customerEmail });
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    await logStep('user_fetch_failed', 'error', { error: authError.message });
    throw new Error(`Error fetching users: ${authError.message}`);
  }

  const user = authData.users.find((u: any) => u.email === customerEmail);
  if (!user) {
    await logStep('user_not_found', 'info', { email: customerEmail });
    return;
  }

  await logStep('retrieving_subscription', 'info', { subscription_id: subscriptionId });
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const sponsorBestieId = subscription.metadata?.bestie_id;
  
  const amount = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
  
  if (sponsorBestieId) {
    await logStep('processing_sponsorship_recurring', 'info', { bestie_id: sponsorBestieId });
    
    const { data: sponsorshipData } = await supabaseAdmin
      .from('sponsorships')
      .select('id')
      .eq('sponsor_id', user.id)
      .eq('sponsor_bestie_id', sponsorBestieId)
      .single();

    if (sponsorshipData) {
      await createAndSendReceipt(
        supabaseAdmin,
        {
          sponsorship_id: sponsorshipData.id,
          sponsor_email: customerEmail,
          sponsor_name: customerEmail.split('@')[0],
          bestie_name: 'Bestie',
          amount,
          frequency: 'monthly',
          transaction_id: invoice.id,
          transaction_date: new Date(invoice.created * 1000).toISOString(),
          stripe_mode: stripeMode,
          user_id: user.id,
        },
        logStep,
        sponsorshipData.id,
        'sponsorship'
      );
      
      if (logId) {
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({ 
            related_record_type: 'sponsorship',
            related_record_id: sponsorshipData.id 
          })
          .eq('id', logId);
      }
    }
  } else {
    await logStep('processing_donation_recurring', 'info');
    
    const { data: donationData } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('donor_email', customerEmail)
      .eq('stripe_subscription_id', subscriptionId)
      .eq('status', 'active')
      .single();

    if (donationData) {
      await createAndSendReceipt(
        supabaseAdmin,
        {
          sponsor_email: customerEmail,
          sponsor_name: customerEmail.split('@')[0],
          bestie_name: 'General Support',
          amount,
          frequency: 'monthly',
          transaction_id: invoice.id,
          transaction_date: new Date(invoice.created * 1000).toISOString(),
          stripe_mode: donationData.stripe_mode || 'live',
          user_id: user.id,
        },
        logStep,
        donationData.id,
        'donation'
      );
      
      if (logId) {
        await supabaseAdmin
          .from('stripe_webhook_logs')
          .update({ 
            related_record_type: 'donation',
            related_record_id: donationData.id 
          })
          .eq('id', logId);
      }
    }
  }
}

async function createAndSendReceipt(
  supabaseAdmin: any,
  receiptData: any,
  logStep: Function,
  relatedId: string,
  relatedType: 'donation' | 'sponsorship'
) {
  await logStep('creating_receipt', 'info', { transaction_id: receiptData.transaction_id });
  
  const receiptRecord = {
    ...receiptData,
    receipt_number: `RCP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    tax_year: new Date().getFullYear(),
  };
  
  const { data: insertedReceipt, error: insertError } = await supabaseAdmin
    .from('sponsorship_receipts')
    .insert(receiptRecord)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      await logStep('receipt_already_exists', 'info', { transaction_id: receiptData.transaction_id });
      return;
    }
    await logStep('receipt_creation_failed', 'error', { error: insertError.message });
    throw new Error(`Error inserting receipt record: ${insertError.message}`);
  }
  
  await logStep('receipt_created', 'success', { receipt_id: insertedReceipt.id });
  
  // Log receipt creation
  await supabaseAdmin.from('receipt_generation_logs').insert({
    [relatedType + '_id']: relatedId,
    receipt_id: insertedReceipt.id,
    stage: 'webhook_receipt_created',
    status: 'success',
    metadata: { transaction_id: receiptData.transaction_id }
  });

  await logStep('sending_receipt_email', 'info');
  
  try {
    const emailBody: any = {
      sponsorEmail: receiptData.sponsor_email,
      bestieName: receiptData.bestie_name,
      amount: receiptData.amount,
      frequency: receiptData.frequency,
      transactionId: receiptData.transaction_id,
      transactionDate: receiptData.transaction_date,
      stripeMode: receiptData.stripe_mode,
    };
    
    if (receiptData.sponsorship_id) {
      emailBody.sponsorshipId = receiptData.sponsorship_id;
    }
    
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sponsorship-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(emailBody),
    });
    
    await logStep('receipt_email_sent', 'success', { email: receiptData.sponsor_email });
    
    // Log email sent
    await supabaseAdmin.from('receipt_generation_logs').insert({
      [relatedType + '_id']: relatedId,
      receipt_id: insertedReceipt.id,
      stage: 'webhook_email_sent',
      status: 'success',
      metadata: { transaction_id: receiptData.transaction_id }
    });
  } catch (emailError) {
    await logStep('receipt_email_failed', 'error', { 
      error: emailError instanceof Error ? emailError.message : 'Unknown error'
    });
    
    // Log email failure
    await supabaseAdmin.from('receipt_generation_logs').insert({
      [relatedType + '_id']: relatedId,
      receipt_id: insertedReceipt.id,
      stage: 'webhook_email_failed',
      status: 'error',
      error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
    });
    
    throw emailError;
  }
}
