import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Accept optional params: dry_run (default true), days_ahead (default 7)
    let dryRun = true;
    let daysAhead = 7;
    try {
      const body = await req.json();
      if (body.dry_run === false) dryRun = false;
      if (body.days_ahead) daysAhead = Number(body.days_ahead);
    } catch { /* no body is fine */ }

    // Find events happening within the next `daysAhead` days
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    const { data: upcomingEvents, error: eventsError } = await supabaseAdmin
      .from('bike_ride_events')
      .select('id, title, ride_date')
      .eq('is_active', true)
      .gte('ride_date', todayStr)
      .lte('ride_date', futureStr);

    if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`);

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No upcoming events within window', events_checked: 0, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${upcomingEvents.length} event(s) within ${daysAhead} days`);

    const eventIds = upcomingEvents.map(e => e.id);

    // Get confirmed pledges with payment methods for these events
    const { data: pledges, error: pledgesError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('id, pledger_name, pledger_email, stripe_payment_method_id, stripe_mode, event_id, charge_status')
      .in('event_id', eventIds)
      .eq('charge_status', 'confirmed')
      .not('stripe_payment_method_id', 'is', null);

    if (pledgesError) throw new Error(`Failed to fetch pledges: ${pledgesError.message}`);

    if (!pledges || pledges.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No confirmed pledges with payment methods', events_checked: upcomingEvents.length, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking ${pledges.length} confirmed pledge(s) for card expiry`);

    const results: Array<{
      pledge_id: string;
      pledger_name: string;
      pledger_email: string;
      event_title: string;
      ride_date: string;
      card_last4: string | null;
      card_brand: string | null;
      card_exp_month: number | null;
      card_exp_year: number | null;
      is_expired: boolean;
      expires_before_event: boolean;
      email_sent: boolean;
      error?: string;
    }> = [];

    let expiredCount = 0;
    let emailsSent = 0;

    for (const pledge of pledges) {
      const event = upcomingEvents.find(e => e.id === pledge.event_id)!;

      try {
        // Determine the correct Stripe key — READ-ONLY operation
        const stripeKey = pledge.stripe_mode === 'live'
          ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
          : Deno.env.get('STRIPE_SECRET_KEY_TEST');

        if (!stripeKey) {
          results.push({
            pledge_id: pledge.id,
            pledger_name: pledge.pledger_name,
            pledger_email: pledge.pledger_email,
            event_title: event.title,
            ride_date: event.ride_date,
            card_last4: null, card_brand: null,
            card_exp_month: null, card_exp_year: null,
            is_expired: false, expires_before_event: false,
            email_sent: false,
            error: `No ${pledge.stripe_mode} Stripe key configured`,
          });
          continue;
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

        // READ-ONLY: retrieve payment method details
        const pm = await stripe.paymentMethods.retrieve(pledge.stripe_payment_method_id!);

        const card = pm.card;
        if (!card) {
          results.push({
            pledge_id: pledge.id,
            pledger_name: pledge.pledger_name,
            pledger_email: pledge.pledger_email,
            event_title: event.title,
            ride_date: event.ride_date,
            card_last4: null, card_brand: null,
            card_exp_month: null, card_exp_year: null,
            is_expired: false, expires_before_event: false,
            email_sent: false,
            error: 'Payment method has no card details',
          });
          continue;
        }

        // Check if card expires before or during the event month
        const rideDate = new Date(event.ride_date);
        const rideYear = rideDate.getFullYear();
        const rideMonth = rideDate.getMonth() + 1; // 1-indexed

        // Card is valid through the end of exp_month/exp_year
        const isExpired = (card.exp_year < now.getFullYear()) ||
          (card.exp_year === now.getFullYear() && card.exp_month < (now.getMonth() + 1));

        const expiresBeforeEvent = (card.exp_year < rideYear) ||
          (card.exp_year === rideYear && card.exp_month < rideMonth);

        const needsNotification = isExpired || expiresBeforeEvent;

        let emailSent = false;

        if (needsNotification && !dryRun) {
          // Send the card expiry warning email
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bike-pledge-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: 'card_expiry_warning',
                pledge_id: pledge.id,
                card_info: {
                  last4: card.last4,
                  brand: card.brand,
                  exp_month: card.exp_month,
                  exp_year: card.exp_year,
                },
              }),
            });
            emailSent = true;
            emailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send expiry email for pledge ${pledge.id}:`, emailErr);
          }
        }

        if (needsNotification) expiredCount++;

        results.push({
          pledge_id: pledge.id,
          pledger_name: pledge.pledger_name,
          pledger_email: pledge.pledger_email,
          event_title: event.title,
          ride_date: event.ride_date,
          card_last4: card.last4,
          card_brand: card.brand,
          card_exp_month: card.exp_month,
          card_exp_year: card.exp_year,
          is_expired: isExpired,
          expires_before_event: expiresBeforeEvent,
          email_sent: emailSent,
        });

      } catch (err) {
        console.error(`Error checking pledge ${pledge.id}:`, err);
        results.push({
          pledge_id: pledge.id,
          pledger_name: pledge.pledger_name,
          pledger_email: pledge.pledger_email,
          event_title: event.title,
          ride_date: event.ride_date,
          card_last4: null, card_brand: null,
          card_exp_month: null, card_exp_year: null,
          is_expired: false, expires_before_event: false,
          email_sent: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const summary = {
      events_checked: upcomingEvents.length,
      pledges_checked: pledges.length,
      expired_or_expiring: expiredCount,
      emails_sent: emailsSent,
      dry_run: dryRun,
    };

    console.log('Card check complete:', summary);

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-bike-pledge-cards:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
