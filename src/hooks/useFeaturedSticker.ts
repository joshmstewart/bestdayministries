import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedStickerData {
  imageUrl: string | null;
  collectionName: string | null;
}

export function useFeaturedSticker() {
  const [data, setData] = useState<FeaturedStickerData>({ imageUrl: null, collectionName: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedSticker = async () => {
      try {
        const { data: featuredCollection } = await supabase
          .from('sticker_collections')
          .select(`
            id,
            name,
            preview_sticker_id,
            preview_sticker:stickers!preview_sticker_id(image_url)
          `)
          .eq('is_active', true)
          .eq('is_featured', true)
          .single();

        if (featuredCollection?.preview_sticker?.image_url) {
          setData({
            imageUrl: featuredCollection.preview_sticker.image_url,
            collectionName: featuredCollection.name
          });
        }
      } catch (error) {
        console.error("Error fetching featured sticker:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedSticker();
  }, []);

  return { ...data, loading };
}
