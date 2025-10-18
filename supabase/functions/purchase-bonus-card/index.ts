import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth token by passing the JWT explicitly
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please refresh and try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BONUS_CARD_COST = 50;
    const today = new Date().toISOString().split('T')[0];

    // Check if user already has a bonus card for today
    const { data: existingBonusCard } = await supabaseClient
      .from('daily_scratch_cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('is_bonus_card', true)
      .single();

    if (existingBonusCard) {
      return new Response(
        JSON.stringify({ error: 'You have already purchased a bonus card today' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's coin balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();

    if (!profile || profile.coins < BONUS_CARD_COST) {
      return new Response(
        JSON.stringify({ error: 'Insufficient coins. You need 50 coins to purchase a bonus card.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active collection
    const { data: activeCollection } = await supabaseClient
      .from('sticker_collections')
      .select('id')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('display_order')
      .limit(1)
      .single();

    if (!activeCollection) {
      return new Response(
        JSON.stringify({ error: 'No active sticker collection available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct coins
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ coins: profile.coins - BONUS_CARD_COST })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Log coin transaction
    const { error: transactionError } = await supabaseClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: -BONUS_CARD_COST,
        transaction_type: 'purchase',
        description: 'Purchased bonus scratch card',
        metadata: { purchase_type: 'bonus_scratch_card', date: today }
      });

    if (transactionError) throw transactionError;

    // Create bonus scratch card
    const { data: bonusCard, error: cardError } = await supabaseClient
      .from('daily_scratch_cards')
      .insert({
        user_id: user.id,
        date: today,
        collection_id: activeCollection.id,
        is_bonus_card: true,
        expires_at: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (cardError) throw cardError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        card: bonusCard,
        message: 'Bonus card purchased successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error purchasing bonus card:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to purchase bonus card' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});