import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedItemData } from "@/components/feed/FeedItem";

const PAGE_SIZE = 12;

export type ItemType = 'beat' | 'card' | 'coloring' | 'post' | 'album' | 'chore_art' | 'event' | 'prayer' | 'workout' | 'recipe' | 'drink' | 'joke' | 'announcement' | 'fortune';

export const VALID_ITEM_TYPES: ItemType[] = ['beat', 'card', 'coloring', 'post', 'album', 'chore_art', 'event', 'prayer', 'workout', 'recipe', 'drink', 'joke', 'announcement', 'fortune'];

// Types shown in the filter dropdown (excludes chore_art and card, includes announcement as "Updates")
export const FILTERABLE_ITEM_TYPES: ItemType[] = ['beat', 'coloring', 'post', 'album', 'event', 'prayer', 'workout', 'recipe', 'drink', 'joke', 'announcement', 'fortune'];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  beat: 'Beats',
  card: 'Cards',
  coloring: 'Colorings',
  post: 'Posts',
  album: 'Albums',
  chore_art: 'Chore Art',
  event: 'Events',
  prayer: 'Prayers',
  workout: 'Workouts',
  recipe: 'Recipes',
  drink: 'Drinks',
  joke: 'Jokes',
  announcement: 'Updates',
  fortune: 'Daily Fortunes',
};

interface UseCommunityFeedOptions {
  typeFilters?: ItemType[];
}

// Simple LRU-style cache for feed data and profiles
const feedCache = new Map<string, { items: FeedItemData[]; timestamp: number }>();
const profileCache = new Map<string, { name: string; avatar: number | null }>();
const FEED_CACHE_TTL = 60000; // 1 minute for feed data

export function useCommunityFeed(options: UseCommunityFeedOptions = {}) {
  const { typeFilters = [] } = options;
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const fetchInProgress = useRef(false);

  // Create a stable key for typeFilters to use in dependencies
  const typeFiltersKey = typeFilters.sort().join(',');
  const cacheKey = `feed-${typeFiltersKey}-page0`;

  const fetchFeedItems = useCallback(async (pageNum: number, append = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current && pageNum === 0) return;
    
    try {
      if (pageNum === 0) {
        fetchInProgress.current = true;
        
        // Check cache for initial load
        const cached = feedCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < FEED_CACHE_TTL) {
          setItems(cached.items);
          setHasMore(cached.items.length === PAGE_SIZE);
          setLoading(false);
          fetchInProgress.current = false;
          return;
        }
        
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Build query
      let query = supabase
        .from("community_feed_items")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply type filters if specified (multi-select)
      if (typeFilters.length > 0) {
        query = query.in("item_type", typeFilters);
      }

      const { data: feedItems, error } = await query.range(from, to);

      if (error) throw error;

      if (!feedItems || feedItems.length === 0) {
        setHasMore(false);
        if (!append) setItems([]);
        return;
      }

      // Get unique author IDs, filtering out those already cached
      const authorIds = [...new Set(feedItems.map(item => item.author_id).filter(Boolean))];
      const uncachedAuthorIds = authorIds.filter(id => !profileCache.has(id));

      // Get beat and event IDs for parallel fetches
      const beatItems = feedItems.filter(item => item.item_type === 'beat');
      const beatIds = beatItems.map(item => item.id);
      
      const eventItems = feedItems.filter(item => item.item_type === 'event');
      const eventIds = eventItems.map(item => item.id);

      // PHASE 2: Execute all secondary queries in parallel
      const [profilesResult, beatDataResult, eventDataResult] = await Promise.all([
        // Fetch uncached profiles
        uncachedAuthorIds.length > 0
          ? supabase
              .from("profiles_public")
              .select("id, display_name, avatar_number")
              .in("id", uncachedAuthorIds)
          : Promise.resolve({ data: null }),
        
        // Fetch beat plays
        beatIds.length > 0
          ? supabase
              .from("beat_pad_creations")
              .select("id, plays_count")
              .in("id", beatIds)
          : Promise.resolve({ data: null }),
        
        // Fetch event details
        eventIds.length > 0
          ? supabase
              .from("events")
              .select("id, event_date, location")
              .in("id", eventIds)
          : Promise.resolve({ data: null })
      ]);

      // Add profiles to cache
      profilesResult.data?.forEach(p => {
        profileCache.set(p.id, { name: p.display_name, avatar: p.avatar_number });
      });

      // Build beat plays map
      const beatPlaysMap = new Map<string, number>();
      beatDataResult.data?.forEach(beat => {
        beatPlaysMap.set(beat.id, beat.plays_count || 0);
      });

      // Build event details map
      const eventDetailsMap = new Map<string, { event_date: string | null; location: string | null }>();
      eventDataResult.data?.forEach(event => {
        eventDetailsMap.set(event.id, { event_date: event.event_date, location: event.location });
      });

      // Merge profile data with feed items, filtering invalid types
      const enrichedItems: FeedItemData[] = feedItems
        .filter(item => VALID_ITEM_TYPES.includes(item.item_type as ItemType))
        .map(item => {
          const profile = profileCache.get(item.author_id);
          
          // For beats, inject live plays_count into extra_data
          let extraData = item.extra_data;
          if (item.item_type === 'beat' && beatPlaysMap.has(item.id)) {
            extraData = {
              ...(typeof extraData === 'object' && extraData !== null ? extraData : {}),
              plays_count: beatPlaysMap.get(item.id),
            };
          }
          
          // For events, inject event_date and location into extra_data
          if (item.item_type === 'event' && eventDetailsMap.has(item.id)) {
            const eventDetails = eventDetailsMap.get(item.id);
            extraData = {
              ...(typeof extraData === 'object' && extraData !== null ? extraData : {}),
              event_date: eventDetails?.event_date,
              location: eventDetails?.location,
            };
          }
          
          return {
            id: item.id,
            item_type: item.item_type as ItemType,
            title: item.title,
            description: item.description,
            author_id: item.author_id,
            created_at: item.created_at,
            image_url: item.image_url,
            likes_count: item.likes_count,
            comments_count: item.comments_count,
            author_name: profile?.name || undefined,
            author_avatar: profile?.avatar || undefined,
            extra_data: extraData,
            repost_id: (item as any).repost_id || null,
          };
        });

      if (append) {
        setItems(prev => [...prev, ...enrichedItems]);
      } else {
        setItems(enrichedItems);
        // Cache the initial page
        feedCache.set(cacheKey, { items: enrichedItems, timestamp: Date.now() });
      }

      setHasMore(feedItems.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchInProgress.current = false;
    }
  }, [typeFiltersKey, cacheKey]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeedItems(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchFeedItems]);

  const refresh = useCallback(() => {
    // Clear cache on manual refresh
    feedCache.delete(cacheKey);
    setPage(0);
    setHasMore(true);
    fetchFeedItems(0, false);
  }, [fetchFeedItems, cacheKey]);

  // Reload when filter changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchFeedItems(0);
  }, [fetchFeedItems, typeFiltersKey]);

  // Cleanup old cache entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      feedCache.forEach((value, key) => {
        if (now - value.timestamp > FEED_CACHE_TTL * 2) {
          feedCache.delete(key);
        }
      });
    }, FEED_CACHE_TTL);

    return () => clearInterval(cleanup);
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
