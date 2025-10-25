import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class StickerBuilder {
  private collectionName: string = 'Test Sticker Collection';
  private stickersCount: number = 5;
  private isActive: boolean = true;
  private rarityConfig: Record<string, number> = {
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1
  };

  withCollectionName(name: string): this {
    this.collectionName = name;
    return this;
  }

  withStickersCount(count: number): this {
    this.stickersCount = count;
    return this;
  }

  withActive(isActive: boolean): this {
    this.isActive = isActive;
    return this;
  }

  withRarityConfig(config: Record<string, number>): this {
    this.rarityConfig = config;
    return this;
  }

  async build() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create sticker collection
    const { data: collection, error: collectionError } = await supabase
      .from('sticker_collections')
      .insert({
        name: this.collectionName,
        description: 'Test collection for automated testing',
        is_active: this.isActive,
        start_date: new Date().toISOString().split('T')[0],
        rarity_config: this.rarityConfig
      })
      .select()
      .single();

    if (collectionError || !collection) {
      throw new Error(`Failed to create sticker collection: ${collectionError?.message}`);
    }

    const stickers = [];
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    // Create stickers
    for (let i = 0; i < this.stickersCount; i++) {
      const rarity = rarities[i % rarities.length];
      
      const { data: sticker, error: stickerError } = await supabase
        .from('stickers')
        .insert({
          collection_id: collection.id,
          name: `Test Sticker ${i + 1}`,
          rarity,
          image_url: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
          is_active: true
        })
        .select()
        .single();

      if (stickerError || !sticker) {
        console.warn(`Failed to create sticker ${i + 1}: ${stickerError?.message}`);
      } else {
        stickers.push(sticker);
      }
    }

    return {
      collection,
      stickers
    };
  }
}
