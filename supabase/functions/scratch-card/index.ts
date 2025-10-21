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

    // Get collection with rarity percentages
    const { data: collection, error: collectionError } = await supabase
      .from('sticker_collections')
      .select('rarity_percentages, use_default_rarity')
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

    // Get a random sticker of the selected rarity
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', card.collection_id)
      .eq('rarity', selectedRarity)
      .eq('is_active', true);

    if (stickersError) throw stickersError;
    
    if (!stickers || stickers.length === 0) {
      throw new Error(`No stickers found for rarity: ${selectedRarity}`);
    }

    const selectedSticker = stickers[Math.floor(Math.random() * stickers.length)];

    // Mark card as scratched
    const { error: updateError } = await supabase
      .from('daily_scratch_cards')
      .update({ 
        is_scratched: true,
        scratched_at: new Date().toISOString(),
        revealed_sticker_id: selectedSticker.id
      })
      .eq('id', cardId);

    if (updateError) throw updateError;

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

    const obtainedFrom = card.is_bonus_card ? 'bonus_card' : 'daily_scratch';
    const now = new Date().toISOString();

    if (existingSticker) {
      // Duplicate - increment quantity
      const { error: updateStickerError } = await supabase
        .from('user_stickers')
        .update({
          quantity: (existingSticker.quantity || 1) + 1,
          last_obtained_at: now,
          obtained_from: obtainedFrom // Update to most recent source
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        sticker: selectedSticker 
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
