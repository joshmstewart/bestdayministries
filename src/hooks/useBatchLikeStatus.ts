import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ItemType = 'beat' | 'card' | 'coloring' | 'drink' | 'joke' | 'workout' | 'recipe' | 'prayer' | 'event';

interface LikeStatusMap {
  [key: string]: boolean; // key format: "itemType:itemId"
}

/**
 * Hook to batch fetch like status for multiple feed items at once.
 * This dramatically reduces the number of database queries from N to ~5.
 */
export function useBatchLikeStatus(items: Array<{ id: string; item_type: string }>) {
  const { user } = useAuth();
  const [likeStatusMap, setLikeStatusMap] = useState<LikeStatusMap>({});
  const [loading, setLoading] = useState(false);

  // Memoize the items key to prevent unnecessary refetches
  const itemsKey = useMemo(() => {
    return items.map(i => `${i.item_type}:${i.id}`).join(',');
  }, [items]);

  const fetchLikeStatuses = useCallback(async () => {
    if (!user || items.length === 0) {
      setLikeStatusMap({});
      return;
    }

    setLoading(true);
    
    try {
      // Group items by type
      const beatIds: string[] = [];
      const cardIds: string[] = [];
      const coloringIds: string[] = [];
      const drinkIds: string[] = [];
      const jokeIds: string[] = [];
      const workoutIds: string[] = [];
      const recipeIds: string[] = [];
      const prayerIds: string[] = [];
      const eventIds: string[] = [];

      items.forEach(item => {
        switch (item.item_type) {
          case 'beat': beatIds.push(item.id); break;
          case 'card': cardIds.push(item.id); break;
          case 'coloring': coloringIds.push(item.id); break;
          case 'drink': drinkIds.push(item.id); break;
          case 'joke': jokeIds.push(item.id); break;
          case 'workout': workoutIds.push(item.id); break;
          case 'recipe': recipeIds.push(item.id); break;
          case 'prayer': prayerIds.push(item.id); break;
          case 'event': eventIds.push(item.id); break;
        }
      });

      // Fetch all like statuses in parallel (max 9 queries instead of N queries)
      const results = await Promise.all([
        beatIds.length > 0 
          ? supabase.from('beat_pad_likes').select('creation_id').eq('user_id', user.id).in('creation_id', beatIds)
          : Promise.resolve({ data: [] }),
        cardIds.length > 0 
          ? supabase.from('card_likes').select('card_id').eq('user_id', user.id).in('card_id', cardIds)
          : Promise.resolve({ data: [] }),
        coloringIds.length > 0 
          ? supabase.from('coloring_likes').select('coloring_id').eq('user_id', user.id).in('coloring_id', coloringIds)
          : Promise.resolve({ data: [] }),
        drinkIds.length > 0 
          ? supabase.from('custom_drink_likes').select('drink_id').eq('user_id', user.id).in('drink_id', drinkIds)
          : Promise.resolve({ data: [] }),
        jokeIds.length > 0 
          ? supabase.from('joke_likes').select('joke_id').eq('user_id', user.id).in('joke_id', jokeIds)
          : Promise.resolve({ data: [] }),
        workoutIds.length > 0 
          ? supabase.from('workout_image_likes').select('image_id').eq('user_id', user.id).in('image_id', workoutIds)
          : Promise.resolve({ data: [] }),
        recipeIds.length > 0
          ? supabase.from('public_recipe_likes').select('recipe_id').eq('user_id', user.id).in('recipe_id', recipeIds)
          : Promise.resolve({ data: [] }),
        prayerIds.length > 0
          ? supabase.from('prayer_request_likes').select('prayer_request_id').eq('user_id', user.id).in('prayer_request_id', prayerIds)
          : Promise.resolve({ data: [] }),
        eventIds.length > 0
          ? supabase.from('event_likes').select('event_id').eq('user_id', user.id).in('event_id', eventIds)
          : Promise.resolve({ data: [] }),
      ]);

      const newStatusMap: LikeStatusMap = {};

      // Process beat likes
      results[0].data?.forEach((like: any) => {
        newStatusMap[`beat:${like.creation_id}`] = true;
      });

      // Process card likes
      results[1].data?.forEach((like: any) => {
        newStatusMap[`card:${like.card_id}`] = true;
      });

      // Process coloring likes
      results[2].data?.forEach((like: any) => {
        newStatusMap[`coloring:${like.coloring_id}`] = true;
      });

      // Process drink likes
      results[3].data?.forEach((like: any) => {
        newStatusMap[`drink:${like.drink_id}`] = true;
      });

      // Process joke likes
      results[4].data?.forEach((like: any) => {
        newStatusMap[`joke:${like.joke_id}`] = true;
      });

      // Process workout likes
      results[5].data?.forEach((like: any) => {
        newStatusMap[`workout:${like.image_id}`] = true;
      });

      // Process recipe likes
      results[6].data?.forEach((like: any) => {
        newStatusMap[`recipe:${like.recipe_id}`] = true;
      });

      // Process prayer likes
      results[7].data?.forEach((like: any) => {
        newStatusMap[`prayer:${like.prayer_request_id}`] = true;
      });

      // Process event likes
      results[8].data?.forEach((like: any) => {
        newStatusMap[`event:${like.event_id}`] = true;
      });

      setLikeStatusMap(newStatusMap);
    } catch (error) {
      console.error('Error fetching batch like statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, itemsKey]);

  useEffect(() => {
    // Fetch immediately - like status should show as soon as possible
    fetchLikeStatuses();
  }, [fetchLikeStatuses]);

  const isLiked = useCallback((itemType: string, itemId: string) => {
    return likeStatusMap[`${itemType}:${itemId}`] || false;
  }, [likeStatusMap]);

  const setLiked = useCallback((itemType: string, itemId: string, liked: boolean) => {
    setLikeStatusMap(prev => ({
      ...prev,
      [`${itemType}:${itemId}`]: liked
    }));
  }, []);

  return { isLiked, setLiked, loading };
}
