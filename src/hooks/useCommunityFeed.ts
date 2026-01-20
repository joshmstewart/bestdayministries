import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedItemData } from "@/components/feed/FeedItem";

const PAGE_SIZE = 12;

type ItemType = 'beat' | 'card' | 'coloring' | 'post' | 'album' | 'chore_art';

const VALID_ITEM_TYPES: ItemType[] = ['beat', 'card', 'coloring', 'post', 'album', 'chore_art'];

export function useCommunityFeed() {
  const [items, setItems] = useState<FeedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchFeedItems = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch feed items from the view
      const { data: feedItems, error } = await supabase
        .from("community_feed_items")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!feedItems || feedItems.length === 0) {
        setHasMore(false);
        if (!append) setItems([]);
        return;
      }

      // Get unique author IDs
      const authorIds = [...new Set(feedItems.map(item => item.author_id).filter(Boolean))];

      // Fetch author profiles
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_number")
        .in("id", authorIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, { name: p.display_name, avatar: p.avatar_number }]) || []
      );

      // Merge profile data with feed items, filtering invalid types
      const enrichedItems: FeedItemData[] = feedItems
        .filter(item => VALID_ITEM_TYPES.includes(item.item_type as ItemType))
        .map(item => ({
          id: item.id,
          item_type: item.item_type as ItemType,
          title: item.title,
          description: item.description,
          author_id: item.author_id,
          created_at: item.created_at,
          image_url: item.image_url,
          likes_count: item.likes_count,
          comments_count: item.comments_count,
          author_name: profileMap.get(item.author_id)?.name || undefined,
          author_avatar: profileMap.get(item.author_id)?.avatar || undefined,
        }));

      if (append) {
        setItems(prev => [...prev, ...enrichedItems]);
      } else {
        setItems(enrichedItems);
      }

      setHasMore(feedItems.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeedItems(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchFeedItems]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchFeedItems(0, false);
  }, [fetchFeedItems]);

  useEffect(() => {
    fetchFeedItems(0);
  }, [fetchFeedItems]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
