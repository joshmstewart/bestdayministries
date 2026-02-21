import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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

    const url = new URL(req.url);
    const eventId = url.searchParams.get('event_id');

    // If no event_id, return the first active event
    let query = supabaseAdmin
      .from('bike_ride_events')
      .select('*')
      .eq('is_active', true);

    if (eventId) {
      query = query.eq('id', eventId);
    } else {
      query = query.eq('status', 'active');
    }

    const { data: event, error: eventError } = await query.order('created_at', { ascending: false }).limit(1).single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ event: null, stats: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pledge stats
    const { data: pledges } = await supabaseAdmin
      .from('bike_ride_pledges')
      .select('pledge_type, cents_per_mile, flat_amount, message, pledger_name, charge_status, stripe_mode')
      .eq('event_id', event.id);

    const confirmedPledges = (pledges || []).filter(p => p.charge_status !== 'pending');
    const perMilePledges = confirmedPledges.filter(p => p.pledge_type === 'per_mile');
    const flatPledges = confirmedPledges.filter(p => p.pledge_type === 'flat');

    const estimatedTotalAtGoal = perMilePledges.reduce((sum, p) => {
      return sum + ((p.cents_per_mile || 0) / 100) * Number(event.mile_goal);
    }, 0) + flatPledges.reduce((sum, p) => sum + (p.flat_amount || 0), 0);

    const messages = confirmedPledges
      .filter(p => p.message)
      .map(p => ({ name: p.pledger_name, message: p.message }));

    return new Response(
      JSON.stringify({
        event,
        stats: {
          total_pledgers: confirmedPledges.length,
          per_mile_pledgers: perMilePledges.length,
          flat_donors: flatPledges.length,
          estimated_total_at_goal: Number(estimatedTotalAtGoal.toFixed(2)),
          messages,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-bike-ride-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
