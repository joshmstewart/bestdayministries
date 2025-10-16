import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { card_id } = await req.json();

    if (!card_id) {
      throw new Error('card_id is required');
    }

    console.log(`Scratching card ${card_id} for user ${user.id}`);

    // Get the card and validate
    const { data: card, error: cardError } = await supabase
      .from('daily_scratch_cards')
      .select('*, sticker_collections(*)')
      .eq('id', card_id)
      .eq('user_id', user.id)
      .single();

    if (cardError || !card) {
      throw new Error('Card not found');
    }

    // Validate card
    if (card.is_scratched) {
      throw new Error('Card already scratched');
    }

    if (new Date(card.expires_at) < new Date()) {
      throw new Error('Card has expired');
    }

    // Get all stickers for this collection with drop rates
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', card.collection_id)
      .eq('is_active', true);

    if (stickersError || !stickers || stickers.length === 0) {
      throw new Error('No stickers available in this collection');
    }

    // Select random sticker based on drop rates
    const totalRate = stickers.reduce((sum, s) => sum + Number(s.drop_rate), 0);
    let random = Math.random() * totalRate;
    
    let selectedSticker = stickers[0];
    for (const sticker of stickers) {
      random -= Number(sticker.drop_rate);
      if (random <= 0) {
        selectedSticker = sticker;
        break;
      }
    }

    console.log(`Selected sticker: ${selectedSticker.name} (${selectedSticker.rarity})`);

    // Update the scratch card
    const { error: updateCardError } = await supabase
      .from('daily_scratch_cards')
      .update({
        is_scratched: true,
        scratched_at: new Date().toISOString(),
        revealed_sticker_id: selectedSticker.id,
      })
      .eq('id', card_id);

    if (updateCardError) {
      throw updateCardError;
    }

    // Check if user already has this sticker
    const { data: existingSticker, error: existingStickerError } = await supabase
      .from('user_stickers')
      .select('*')
      .eq('user_id', user.id)
      .eq('sticker_id', selectedSticker.id)
      .single();

    let isDuplicate = false;
    let quantity = 1;

    if (existingSticker) {
      // Increment quantity
      isDuplicate = true;
      quantity = existingSticker.quantity + 1;

      const { error: updateError } = await supabase
        .from('user_stickers')
        .update({
          quantity,
          last_obtained_at: new Date().toISOString(),
        })
        .eq('id', existingSticker.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Add new sticker
      const { error: insertError } = await supabase
        .from('user_stickers')
        .insert({
          user_id: user.id,
          sticker_id: selectedSticker.id,
          collection_id: card.collection_id,
          obtained_from: 'daily_scratch',
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Check collection completion (trigger will handle badge awarding)
    const { data: allStickers } = await supabase
      .from('stickers')
      .select('id')
      .eq('collection_id', card.collection_id)
      .eq('is_active', true);

    const { data: userStickers } = await supabase
      .from('user_stickers')
      .select('sticker_id')
      .eq('user_id', user.id)
      .eq('collection_id', card.collection_id);

    const isComplete = allStickers && userStickers && 
      allStickers.length === userStickers.length;

    return new Response(
      JSON.stringify({
        success: true,
        sticker: selectedSticker,
        isDuplicate,
        quantity,
        isComplete,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});