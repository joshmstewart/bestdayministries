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

    const { setup_intent_id } = await req.json();
    if (!setup_intent_id) throw new Error('setup_intent_id is required');

    // Update pledge status to confirmed
    const { data: pledge, error: updateError } = await supabaseAdmin
      .from('bike_ride_pledges')
      .update({ charge_status: 'confirmed' })
      .eq('stripe_setup_intent_id', setup_intent_id)
      .select('id')
      .single();

    if (updateError) {
      console.error('Error updating pledge:', updateError);
      throw new Error('Failed to update pledge status');
    }

    // Send confirmation email
    if (pledge) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-bike-pledge-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ type: 'confirmation', pledge_id: pledge.id }),
        });
      } catch (emailErr) {
        console.error('Failed to send confirmation email (non-fatal):', emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, pledge_id: pledge?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-bike-pledge:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
