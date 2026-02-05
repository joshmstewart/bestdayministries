import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    // User client for user-specific operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Admin client for reading collection config (non-sensitive game data)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { cardId, collectionId } = await req.json();

    if (!cardId) {
      throw new Error('Card ID is required');
    }

    // Get the card
    const { data: card, error: cardError } = await supabase
      .from('daily_scratch_cards')
      .select('*, collection_id, is_bonus_card')
      .eq('id', cardId)
      .single();

    if (cardError) throw cardError;

    // Check if already scratched
    if (card.scratched_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This card has already been scratched' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If collectionId provided, update the card's collection (for both daily and bonus packs)
    let targetCollectionId = card.collection_id;
    if (collectionId) {
      const { error: updateError } = await supabase
        .from('daily_scratch_cards')
        .update({ collection_id: collectionId })
        .eq('id', cardId);
      
      if (updateError) throw updateError;
      targetCollectionId = collectionId;
    }

    // Get collection with rarity percentages and stickers_per_pack (use admin client)
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('sticker_collections')
      .select('rarity_percentages, use_default_rarity, stickers_per_pack')
      .eq('id', targetCollectionId)
      .single();

    if (collectionError) {
      console.error('Error fetching collection:', collectionError);
      throw collectionError;
    }

    let rarityPercentages: Record<string, number>;

    // If collection uses defaults, fetch from app_settings
    if (collection.use_default_rarity) {
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'default_rarity_percentages')
        .single();

      if (settingsError) throw settingsError;
      rarityPercentages = settingsData.setting_value as Record<string, number>;
    } else {
      rarityPercentages = collection.rarity_percentages as Record<string, number>;
    }

    // Determine how many stickers to reveal (default to 1 if not set)
    const stickersPerPack = collection.stickers_per_pack || 1;
    const revealedStickers = [];

    // Get all active stickers for this collection (use admin client)
    const { data: allStickers, error: allStickersError } = await supabaseAdmin
      .from('stickers')
      .select('*')
      .eq('collection_id', targetCollectionId)
      .eq('is_active', true);

    if (allStickersError) throw allStickersError;
    
    if (!allStickers || allStickers.length === 0) {
      throw new Error('No active stickers found in this collection');
    }

    // Reveal multiple stickers
    for (let i = 0; i < stickersPerPack; i++) {
      // Determine rarity based on percentages
      const rand = Math.random() * 100;
      let cumulative = 0;
      let selectedRarity = 'common';

      for (const [rarity, percentage] of Object.entries(rarityPercentages)) {
        cumulative += percentage;
        if (rand <= cumulative) {
          selectedRarity = rarity;
          break;
        }
      }

      // Get stickers of the selected rarity
      const stickersOfRarity = allStickers.filter(s => s.rarity === selectedRarity);
      
      if (stickersOfRarity.length === 0) {
        // Fallback to common if no stickers of selected rarity
        const commonStickers = allStickers.filter(s => s.rarity === 'common');
        if (commonStickers.length > 0) {
          // Shuffle to ensure true randomness
          const shuffled = commonStickers.sort(() => Math.random() - 0.5);
          revealedStickers.push(shuffled[0]);
        }
        continue;
      }

      // Shuffle array to ensure true randomness (Fisher-Yates algorithm)
      const shuffled = [...stickersOfRarity];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const selectedSticker = shuffled[0];
      revealedStickers.push(selectedSticker);
    }

    if (revealedStickers.length === 0) {
      throw new Error('Failed to reveal any stickers');
    }

    // Mark card as scratched with first sticker (for compatibility)
    const { error: updateError } = await supabase
      .from('daily_scratch_cards')
      .update({ 
        is_scratched: true,
        scratched_at: new Date().toISOString(),
        revealed_sticker_id: revealedStickers[0].id
      })
      .eq('id', cardId);

    if (updateError) throw updateError;

    const obtainedFrom = card.is_bonus_card ? 'bonus_card' : 'daily_scratch';
    const now = new Date().toISOString();

    // Add all revealed stickers to user's collection
    for (const selectedSticker of revealedStickers) {
      // Check if user already has this sticker (duplicate detection)
      const { data: existingSticker, error: checkError } = await supabase
        .from('user_stickers')
        .select('id, quantity')
        .eq('user_id', card.user_id)
        .eq('sticker_id', selectedSticker.id)
        .eq('collection_id', card.collection_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking for existing sticker:', checkError);
        throw new Error(`Failed to check existing sticker: ${checkError.message}`);
      }

      if (existingSticker) {
        // Duplicate - increment quantity
        const { error: updateStickerError } = await supabase
          .from('user_stickers')
          .update({
            quantity: (existingSticker.quantity || 1) + 1,
            last_obtained_at: now,
            obtained_from: obtainedFrom
          })
          .eq('id', existingSticker.id);

        if (updateStickerError) {
          console.error('Error updating sticker quantity:', updateStickerError);
          throw new Error(`Failed to update sticker quantity: ${updateStickerError.message}`);
        }

        console.log(`Duplicate sticker found. Updated quantity to ${(existingSticker.quantity || 1) + 1}`);
      } else {
        // New sticker - insert
        const { data: insertedData, error: insertError } = await supabase
          .from('user_stickers')
          .insert({
            user_id: card.user_id,
            sticker_id: selectedSticker.id,
            collection_id: card.collection_id,
            obtained_from: obtainedFrom,
            quantity: 1,
            first_obtained_at: now,
            last_obtained_at: now
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting sticker:', insertError);
          throw new Error(`Failed to insert sticker: ${insertError.message}`);
        }

        if (!insertedData) {
          console.error('Sticker insert returned no data');
          throw new Error('Failed to verify sticker insertion');
        }

        console.log(`New sticker inserted: ${selectedSticker.name} (ID: ${selectedSticker.id})`);
      }
    }

    // Award coins for opening the pack (only for daily cards, not bonus)
    let coinsAwarded = 0;
    if (!card.is_bonus_card) {
      const { data: rewardSetting } = await supabaseAdmin
        .from('coin_rewards_settings')
        .select('coins_amount')
        .eq('reward_key', 'daily_scratch_card')
        .eq('is_active', true)
        .single();

      if (rewardSetting && rewardSetting.coins_amount > 0) {
        // Get current coins
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', card.user_id)
          .single();

        if (profile) {
          const newBalance = (profile.coins || 0) + rewardSetting.coins_amount;

          // Update coins
          await supabase
            .from('profiles')
            .update({ coins: newBalance })
            .eq('id', card.user_id);

          // Log transaction
          await supabase
            .from('coin_transactions')
            .insert({
              user_id: card.user_id,
              amount: rewardSetting.coins_amount,
              transaction_type: 'earned',
              description: 'Daily scratch card reward',
            });

          coinsAwarded = rewardSetting.coins_amount;
          console.log(`Awarded ${rewardSetting.coins_amount} coins for daily scratch card`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        stickers: revealedStickers,
        // Keep for backwards compatibility
        sticker: revealedStickers[0],
        coinsAwarded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scratch-card function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'An error occurred' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
