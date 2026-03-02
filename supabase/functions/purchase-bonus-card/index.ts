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
    console.log('💰 PURCHASE: Starting purchase flow...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ PURCHASE: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 PURCHASE: Creating admin client for auth...');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ PURCHASE: Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please refresh and try again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ PURCHASE: User authenticated:', user.id);

    console.log('💰 PURCHASE: Creating user client for RLS...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    // Load base cost from settings
    console.log('💰 PURCHASE: Loading base cost from settings...');
    const { data: costSettings } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_card_base_cost')
      .maybeSingle();
    
    const BASE_BONUS_CARD_COST = costSettings?.setting_value ? Number(costSettings.setting_value) : 50;
    console.log('💰 PURCHASE: Base cost loaded:', BASE_BONUS_CARD_COST);
    
    console.log('💰 PURCHASE: Calculating MST date...');
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    const today = mstTime.toISOString().split('T')[0];
    console.log('💰 PURCHASE: MST Date:', today, '| Full:', mstTime.toISOString());
    
    const tomorrowMST = new Date(mstTime);
    tomorrowMST.setDate(tomorrowMST.getDate() + 1);
    tomorrowMST.setHours(0, 0, 0, 0);
    const tomorrowUTC = new Date(tomorrowMST.getTime() - (mstOffset * 60000));

    console.log('💰 PURCHASE: Counting existing bonus cards for today...');
    const { data: existingBonusCards, error: queryError } = await supabaseClient
      .from('daily_scratch_cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('is_bonus_card', true);

    if (queryError) {
      console.error('❌ PURCHASE: Query error:', queryError);
    }

    const purchaseCount = existingBonusCards?.length || 0;
    const nextPurchaseNumber = purchaseCount + 1;
    // Cap exponent at 10 to prevent astronomical costs (max cost = base * 1024)
    const cappedExponent = Math.min(purchaseCount, 10);
    const BONUS_CARD_COST = BASE_BONUS_CARD_COST * Math.pow(2, cappedExponent);

    console.log('💰 PURCHASE: Cost calculation:', {
      purchaseCount,
      nextPurchaseNumber,
      cappedExponent,
      cost: BONUS_CARD_COST,
      formula: `${BASE_BONUS_CARD_COST} * 2^${cappedExponent}`
    });

    console.log('💰 PURCHASE: Cost calculation:', {
      purchaseCount,
      nextPurchaseNumber,
      cost: BONUS_CARD_COST,
      formula: `50 * 2^${purchaseCount}`
    });

    console.log('💰 PURCHASE: Checking coin balance...');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();

    console.log('💰 PURCHASE: Balance check:', {
      userCoins: profile?.coins,
      required: BONUS_CARD_COST,
      sufficient: profile ? profile.coins >= BONUS_CARD_COST : false,
      error: profileError
    });

    if (!profile || profile.coins < BONUS_CARD_COST) {
      console.log('❌ PURCHASE: Insufficient coins');
      return new Response(
        JSON.stringify({ error: `Insufficient coins. You need ${BONUS_CARD_COST} coins to purchase a bonus card.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 PURCHASE: Fetching active collection...');
    const { data: activeCollection, error: collectionError } = await supabaseClient
      .from('sticker_collections')
      .select('id')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('display_order')
      .limit(1)
      .single();

    console.log('💰 PURCHASE: Collection result:', {
      found: !!activeCollection,
      id: activeCollection?.id,
      error: collectionError
    });

    if (!activeCollection) {
      console.log('❌ PURCHASE: No active collection');
      return new Response(
        JSON.stringify({ error: 'No active sticker collection available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 PURCHASE: Deducting', BONUS_CARD_COST, 'coins...');
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ coins: profile.coins - BONUS_CARD_COST })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ PURCHASE: Coin deduction error:', updateError);
      throw updateError;
    }
    console.log('✅ PURCHASE: Coins deducted successfully');

    console.log('💰 PURCHASE: Logging transaction...');
    const { error: transactionError } = await supabaseClient
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: -BONUS_CARD_COST,
        transaction_type: 'purchase',
        description: `Purchased bonus scratch card #${nextPurchaseNumber}`,
        metadata: { 
          purchase_type: 'bonus_scratch_card', 
          date: today,
          purchase_number: nextPurchaseNumber 
        }
      });

    if (transactionError) {
      console.error('⚠️ PURCHASE: Transaction log error:', transactionError);
    } else {
      console.log('✅ PURCHASE: Transaction logged');
    }

    console.log('💰 PURCHASE: Creating bonus card with purchase_number:', nextPurchaseNumber);
    const { data: bonusCard, error: cardError } = await supabaseClient
      .from('daily_scratch_cards')
      .insert({
        user_id: user.id,
        date: today,
        collection_id: activeCollection.id,
        is_bonus_card: true,
        purchase_number: nextPurchaseNumber,
        expires_at: tomorrowUTC.toISOString()
      })
      .select()
      .single();

    console.log('💰 PURCHASE: Card creation result:', {
      success: !cardError,
      cardId: bonusCard?.id,
      purchaseNumber: bonusCard?.purchase_number,
      error: cardError
    });

    if (cardError) {
      console.error('❌ PURCHASE: Card creation error:', cardError);
      throw cardError;
    }

    const nextCappedExponent = Math.min(nextPurchaseNumber, 10);
    const nextCost = BASE_BONUS_CARD_COST * Math.pow(2, nextCappedExponent);
    console.log('✅ PURCHASE: Success! Next cost will be:', nextCost);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cardId: bonusCard.id,
        card: bonusCard,
        cost: BONUS_CARD_COST,
        nextCost: nextCost,
        purchaseCount: nextPurchaseNumber,
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