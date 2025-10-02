import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const { session_id } = await req.json();
    console.log('Verifying sponsorship payment for session:', session_id);

    if (!session_id) {
      throw new Error('Session ID is required');
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', { status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Get user from auth header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Create sponsorship record
    const { data: sponsorship, error: sponsorshipError } = await supabaseClient
      .from('sponsorships')
      .insert({
        sponsor_id: user.id,
        bestie_id: session.metadata.bestie_id,
        amount: parseFloat(session.metadata.amount),
        frequency: session.metadata.frequency,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sponsorshipError) {
      console.error('Error creating sponsorship:', sponsorshipError);
      throw new Error('Failed to create sponsorship record');
    }

    console.log('Sponsorship created:', sponsorship.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        sponsorship_id: sponsorship.id,
        amount: session.metadata.amount,
        frequency: session.metadata.frequency,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in verify-sponsorship-payment:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
