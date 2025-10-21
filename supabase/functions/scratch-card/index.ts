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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { cardId } = await req.json();

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

    // Get collection with rarity percentages and stickers_per_pack
    const { data: collection, error: collectionError } = await supabase
      .from('sticker_collections')
      .select('rarity_percentages, use_default_rarity, stickers_per_pack')
      .eq('id', card.collection_id)
      .single();

    if (collectionError) throw collectionError;

    let rarityPercentages: Record<string, number>;

    // If collection uses defaults, fetch from app_settings
    if (collection.use_default_rarity) {
      const { data: settingsData, error: settingsError } = await supabase
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

    // Get all active stickers for this collection
    const { data: allStickers, error: allStickersError } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', card.collection_id)
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
          revealedStickers.push(commonStickers[Math.floor(Math.random() * commonStickers.length)]);
        }
        continue;
      }

      const selectedSticker = stickersOfRarity[Math.floor(Math.random() * stickersOfRarity.length)];
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        stickers: revealedStickers,
        // Keep for backwards compatibility
        sticker: revealedStickers[0]
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
