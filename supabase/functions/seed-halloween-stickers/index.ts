import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StickerData {
  name: string;
  description: string;
  rarity: string;
  visual_style: string;
  drop_rate: number;
  sticker_number: number;
  file_path: string;
}

const stickers: StickerData[] = [
  // Common - Cute/Kawaii (50% total drop rate)
  { name: "Smiling Pumpkin", description: "A cheerful pumpkin with rosy cheeks", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 1, file_path: "01-smiling-pumpkin.png" },
  { name: "Friendly Ghost", description: "A sweet ghost with sparkly eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 2, file_path: "02-friendly-ghost.png" },
  { name: "Candy Corn Pile", description: "Adorable candy corn with smiling faces", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 3, file_path: "03-candy-corn.png" },
  { name: "Happy Bat", description: "A friendly bat with big cute eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 4, file_path: "04-happy-bat.png" },
  { name: "Kawaii Black Cat", description: "A sweet black cat with sparkly eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 5, file_path: "05-kawaii-cat.png" },
  { name: "Cute Witch Hat", description: "A magical hat with stars and moons", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 6, file_path: "06-witch-hat.png" },
  { name: "Friendly Spider", description: "An adorable spider with big eyes", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 7, file_path: "07-friendly-spider.png" },
  { name: "Sweet Skeleton", description: "A cheerful skeleton with a happy smile", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 8, file_path: "08-sweet-skeleton.png" },
  { name: "Adorable Mummy", description: "A cute mummy peeking through bandages", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 9, file_path: "09-adorable-mummy.png" },
  { name: "Happy Cauldron", description: "A bubbling cauldron with a smiling face", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 10, file_path: "10-happy-cauldron.png" },
  { name: "Cute Vampire", description: "An adorable vampire with tiny fangs", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.17, sticker_number: 11, file_path: "11-cute-vampire.png" },
  { name: "Kawaii Monster", description: "A friendly monster with colorful fur", rarity: "common", visual_style: "cute_kawaii", drop_rate: 4.16, sticker_number: 12, file_path: "12-kawaii-monster.png" },
  
  // Uncommon - Spooky/Classic (30% total drop rate)
  { name: "Haunted House", description: "A spooky house with glowing windows", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 13, file_path: "13-haunted-house.png" },
  { name: "Full Moon", description: "A glowing moon with bat silhouettes", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 14, file_path: "14-full-moon.png" },
  { name: "Spooky Tree", description: "A twisted tree with gnarled branches", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 15, file_path: "15-spooky-tree.png" },
  { name: "Classic Witch", description: "A witch flying on her broomstick", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 16, file_path: "16-classic-witch.png" },
  { name: "Creepy Graveyard", description: "A misty graveyard with tombstones", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.29, sticker_number: 17, file_path: "17-creepy-graveyard.png" },
  { name: "Dark Castle", description: "A gothic castle on a hilltop", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.27, sticker_number: 18, file_path: "18-dark-castle.png" },
  { name: "Mysterious Fog", description: "Swirling ethereal mist", rarity: "uncommon", visual_style: "spooky_classic", drop_rate: 4.28, sticker_number: 19, file_path: "19-mysterious-fog.png" },
  
  // Rare - Glitter/Sparkle (15% total drop rate)
  { name: "Glittery Ghost", description: "A sparkling ghost with magical shimmer", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 20, file_path: "20-glittery-ghost.png" },
  { name: "Sparkle Pumpkin", description: "A shimmering pumpkin with gold sparkles", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 21, file_path: "21-sparkle-pumpkin.png" },
  { name: "Shimmering Cauldron", description: "A magical cauldron with glitter bubbles", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 22, file_path: "22-shimmer-cauldron.png" },
  { name: "Glitter Bat", description: "A sparkling bat with shimmering wings", rarity: "rare", visual_style: "glitter", drop_rate: 3.75, sticker_number: 23, file_path: "23-glitter-bat.png" },
  
  // Epic - Animated (4% total drop rate)
  { name: "Dancing Skeleton", description: "A skeleton in dynamic dancing pose", rarity: "epic", visual_style: "animated", drop_rate: 4.00, sticker_number: 24, file_path: "24-dancing-skeleton.png" },
  
  // Legendary - Joy House Themed (1% total drop rate)
  { name: "Joy House Halloween", description: "Joy House community celebrating Halloween together", rarity: "legendary", visual_style: "joy_house", drop_rate: 1.00, sticker_number: 25, file_path: "25-joy-house-halloween.png" },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting Halloween sticker seeding...');

    // Create badge first
    const { data: badge, error: badgeError } = await supabaseClient
      .from('badges')
      .insert({
        name: 'Halloween Complete',
        description: 'Collected all Halloween 2025 stickers!',
        badge_type: 'collection_complete',
        icon_url: null,
        is_active: true,
        requirements: { collection: 'halloween_2025' }
      })
      .select()
      .single();

    if (badgeError) {
      console.error('Error creating badge:', badgeError);
      throw badgeError;
    }

    console.log('Badge created:', badge.id);

    // Create collection
    const { data: collection, error: collectionError } = await supabaseClient
      .from('sticker_collections')
      .insert({
        name: 'Halloween 2025',
        description: 'Spooky and sweet Halloween stickers to collect!',
        theme: 'halloween',
        is_active: true,
        start_date: '2025-10-01',
        end_date: null,
        completion_badge_id: badge.id,
        display_order: 1
      })
      .select()
      .single();

    if (collectionError) {
      console.error('Error creating collection:', collectionError);
      throw collectionError;
    }

    console.log('Collection created:', collection.id);

    // Read and upload sticker images
    const uploadedStickers = [];
    
    for (const sticker of stickers) {
      try {
        // Read the file from src/assets/stickers/halloween/
        const filePath = `./src/assets/stickers/halloween/${sticker.file_path}`;
        console.log(`Reading file: ${filePath}`);
        
        // Note: In the actual implementation, you'd need to manually upload these
        // For now, we'll create records that reference the local asset paths
        const storagePath = `halloween/${sticker.file_path}`;
        
        // Insert sticker record
        const { data: stickerRecord, error: stickerError } = await supabaseClient
          .from('stickers')
          .insert({
            collection_id: collection.id,
            name: sticker.name,
            description: sticker.description,
            image_url: storagePath,
            rarity: sticker.rarity,
            visual_style: sticker.visual_style,
            drop_rate: sticker.drop_rate,
            sticker_number: sticker.sticker_number,
            is_active: true
          })
          .select()
          .single();

        if (stickerError) {
          console.error(`Error creating sticker ${sticker.name}:`, stickerError);
          continue;
        }

        uploadedStickers.push(stickerRecord);
        console.log(`Created sticker: ${sticker.name}`);
      } catch (error) {
        console.error(`Error processing sticker ${sticker.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        collection: collection,
        badge: badge,
        stickers_created: uploadedStickers.length,
        message: `Successfully created ${uploadedStickers.length} stickers. Note: You'll need to manually upload the images from src/assets/stickers/halloween/ to the sticker-images bucket.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in seed-halloween-stickers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
