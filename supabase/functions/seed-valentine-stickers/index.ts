import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StickerData {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  drop_rate: number;
  sticker_number: number;
}

// Valentine's Day stickers following the master design specification
const stickers: StickerData[] = [
  // COMMON (5) - 50% total drop rate split among 5
  { name: "Love Heart", rarity: "common", description: "A sweet red heart", drop_rate: 10, sticker_number: 1 },
  { name: "Chocolate Box", rarity: "common", description: "Delicious chocolates", drop_rate: 10, sticker_number: 2 },
  { name: "Teddy Bear", rarity: "common", description: "A cuddly teddy bear", drop_rate: 10, sticker_number: 3 },
  { name: "Love Letter", rarity: "common", description: "A sealed love letter", drop_rate: 10, sticker_number: 4 },
  { name: "Red Rose", rarity: "common", description: "A beautiful red rose", drop_rate: 10, sticker_number: 5 },
  
  // UNCOMMON (3) - 30% total
  { name: "Cupid's Arrow", rarity: "uncommon", description: "A magical arrow", drop_rate: 10, sticker_number: 6 },
  { name: "Heart Lock & Key", rarity: "uncommon", description: "Lock your love", drop_rate: 10, sticker_number: 7 },
  { name: "Love Potion", rarity: "uncommon", description: "A magical elixir", drop_rate: 10, sticker_number: 8 },
  
  // RARE (2) - 15% total
  { name: "Valentine Bear", rarity: "rare", description: "A sparkling bear", drop_rate: 7.5, sticker_number: 9 },
  { name: "Candy Bouquet", rarity: "rare", description: "Sweet treats bouquet", drop_rate: 7.5, sticker_number: 10 },
  
  // EPIC (1) - 4%
  { name: "Love Fairy", rarity: "epic", description: "A magical love fairy", drop_rate: 4, sticker_number: 11 },
  
  // LEGENDARY (1) - 1%
  { name: "Valentine's Day 2026", rarity: "legendary", description: "Best Day Ever celebration", drop_rate: 1, sticker_number: 12 },
];

// Build prompts following the strict rarity specifications
function buildPrompt(sticker: StickerData): string {
  const baseRules = `Square canvas, transparent background outside the sticker, clearly die-cut shape (not rectangular), subject centered with comfortable padding. NO text on the sticker. Semi-cartoon illustration style, soft realism, clean linework. High contrast, clear at small sizes.`;
  
  const rarityPrompts: Record<string, string> = {
    common: `COMMON TIER STICKER: Exactly ONE continuous white matte outline of even thickness. Flat colors with soft shading only. Subtle drop shadow allowed. ABSOLUTELY NO glitter, NO holographic effects, NO sparkle overlays. Cute, friendly, simple, bright but not flashy.`,
    
    uncommon: `UNCOMMON TIER STICKER: Exactly ONE continuous light green flat outline (NOT glitter, NOT foil). Flat base colors with minimal shading. Include EXACTLY ONE small holographic/iridescent accent (like a magical glow on one element). NO glitter textures, NO multiple holo accents.`,
    
    rare: `RARE TIER STICKER: Exactly ONE continuous light blue GLITTER texture outline that sparkles. Vibrant color palette with multiple sparkle points across the subject. Glitter effects on clothing, decorations, or accessories. Details must remain sharp despite sparkle effects.`,
    
    epic: `EPIC TIER STICKER: Exactly ONE continuous light purple FOIL outline with slight iridescence (NOT rainbow). Full holographic texture across large surfaces. Iridescent lighting with light rays or magical particles. Majestic, story-driven, feels like a moment in time.`,
    
    legendary: `LEGENDARY TIER STICKER: Exactly ONE continuous GOLD outline with subtle iridescence, premium foil look. Layered holographic textures with high sparkle density and multiple lighting effects. Grand, celebratory, collection finale feeling. Text "Best Day Ever" allowed. Complex multi-character scene with grand environment.`,
  };
  
  const themeContext = `Valentine's Day theme. Romantic, love-themed, pink/red/white color palette with hearts and romantic elements.`;
  
  return `${baseRules} ${rarityPrompts[sticker.rarity]} ${themeContext} Subject: ${sticker.name} - ${sticker.description}. DAYTIME lighting with bright, soft white light and clear shadows if outdoor scene.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting Valentine's Day sticker seeding...");

    // Create completion badge first
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .insert({
        name: 'Valentine Complete',
        description: 'Collected all Valentine\'s Day 2026 stickers',
        badge_type: 'collection_complete',
        is_active: true
      })
      .select()
      .single();

    if (badgeError) {
      console.error('Badge creation error:', badgeError);
      throw badgeError;
    }

    console.log("Created badge:", badge.id);

    // Create the collection
    const { data: collection, error: collectionError } = await supabase
      .from('sticker_collections')
      .insert({
        name: "Valentine's Day 2026",
        description: "Celebrate love with this romantic sticker collection!",
        theme: "valentines",
        is_active: true,
        start_date: new Date().toISOString().split('T')[0],
        visible_to_roles: ['admin', 'owner'],
        rarity_percentages: {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1
        },
        completion_badge_id: badge.id
      })
      .select()
      .single();

    if (collectionError) {
      console.error('Collection creation error:', collectionError);
      throw collectionError;
    }

    console.log("Created collection:", collection.id);

    // Generate and insert stickers
    let successCount = 0;
    const errors: string[] = [];

    for (const sticker of stickers) {
      try {
        console.log(`Generating sticker: ${sticker.name} (${sticker.rarity})`);
        
        const prompt = buildPrompt(sticker);
        console.log(`Prompt: ${prompt.substring(0, 100)}...`);

        // Generate image using Lovable AI
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI error for ${sticker.name}:`, response.status, errorText);
          errors.push(`${sticker.name}: AI generation failed`);
          continue;
        }

        const data = await response.json();
        const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          console.error(`No image generated for ${sticker.name}`);
          errors.push(`${sticker.name}: No image in response`);
          continue;
        }

        // Upload to storage
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `valentine-2026/${sticker.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;

        const { error: uploadError } = await supabase.storage
          .from('sticker-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload error for ${sticker.name}:`, uploadError);
          errors.push(`${sticker.name}: Upload failed`);
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from('sticker-images')
          .getPublicUrl(fileName);

        // Insert sticker record
        const { error: stickerError } = await supabase
          .from('stickers')
          .insert({
            collection_id: collection.id,
            name: sticker.name,
            description: sticker.description,
            rarity: sticker.rarity,
            visual_style: 'illustrated',
            drop_rate: sticker.drop_rate,
            sticker_number: sticker.sticker_number,
            image_url: publicUrl.publicUrl,
            is_active: true
          });

        if (stickerError) {
          console.error(`Sticker insert error for ${sticker.name}:`, stickerError);
          errors.push(`${sticker.name}: DB insert failed`);
          continue;
        }

        successCount++;
        console.log(`✓ Created sticker: ${sticker.name}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing ${sticker.name}:`, err);
        errors.push(`${sticker.name}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        collection_id: collection.id,
        badge_id: badge.id,
        stickers_created: successCount,
        total_stickers: stickers.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seeding error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
