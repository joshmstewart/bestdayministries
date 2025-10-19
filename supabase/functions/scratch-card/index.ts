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
      .select('*, collection_id')
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
      .select('rarity_percentages')
      .eq('id', card.collection_id)
      .single();

    if (collectionError) throw collectionError;

    const rarityPercentages = collection.rarity_percentages as Record<string, number>;

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
        scratched_at: new Date().toISOString(),
        sticker_id: selectedSticker.id
      })
      .eq('id', cardId);

    if (updateError) throw updateError;

    // Add sticker to user's collection
    const { error: insertError } = await supabase
      .from('user_stickers')
      .insert({
        user_id: card.user_id,
        sticker_id: selectedSticker.id,
        collection_id: card.collection_id,
        source: 'daily_scratch'
      });

    if (insertError) {
      console.error('Error adding sticker to collection:', insertError);
      // Don't throw - card is already scratched, just log the error
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
