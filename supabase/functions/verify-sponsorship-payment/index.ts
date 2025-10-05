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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Stripe mode from app_settings
    const { data: modeSetting } = await supabaseAdmin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_mode')
      .single();
    
    const mode = modeSetting?.setting_value || 'test';
    const stripeKey = mode === 'live' 
      ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');
    
    if (!stripeKey) {
      throw new Error(`Stripe ${mode} secret key not configured`);
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

    // Get customer email from session
    const customerEmail = session.customer_details?.email || session.customer_email;
    if (!customerEmail) {
      throw new Error('No customer email in session');
    }

    // Find user by email using auth.admin
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const user = usersData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
    
    if (!user) {
      // For guest checkouts, we can't create a sponsorship without a user ID
      console.log('User not found for email:', customerEmail);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Payment successful. Please create an account to view your sponsorships.',
          amount: session.metadata.amount,
          frequency: session.metadata.frequency,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check if sponsorship already exists for this Stripe session
    const stripeReferenceId = session.subscription || session.payment_intent;
    if (stripeReferenceId) {
      const { data: existingSponsorship } = await supabaseAdmin
        .from('sponsorships')
        .select('id, amount, frequency')
        .eq('stripe_subscription_id', stripeReferenceId)
        .maybeSingle();

      if (existingSponsorship) {
        console.log('Sponsorship already exists for this session:', existingSponsorship.id);
        return new Response(
          JSON.stringify({ 
            success: true,
            sponsorship_id: existingSponsorship.id,
            amount: existingSponsorship.amount,
            frequency: existingSponsorship.frequency,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Create new sponsorship record
    const { data: sponsorship, error: sponsorshipError } = await supabaseAdmin
      .from('sponsorships')
      .insert({
        sponsor_id: user.id,
        bestie_id: session.metadata.bestie_id,
        amount: parseFloat(session.metadata.amount),
        frequency: session.metadata.frequency,
        status: 'active',
        started_at: new Date().toISOString(),
        stripe_subscription_id: stripeReferenceId || null,
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
