import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseUnseenFeedCountReturn {
  unseenCount: number;
  loading: boolean;
  markAsSeen: () => Promise<void>;
  showBadge: boolean;
}

// Cache for unseen count to avoid repeated queries
const unseenCountCache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useUnseenFeedCount(): UseUnseenFeedCountReturn {
  const { user, profile } = useAuth();
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const fetchInProgress = useRef(false);

  // Fetch user's preference and last seen timestamp
  useEffect(() => {
    async function fetchUserPrefs() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Use profile from context if available
      if (profile) {
        setShowBadge((profile as any).show_feed_badge ?? true);
        setLastSeenAt((profile as any).feed_last_seen_at ?? null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('show_feed_badge, feed_last_seen_at')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setShowBadge(data?.show_feed_badge ?? true);
        setLastSeenAt(data?.feed_last_seen_at ?? null);
      } catch (err) {
        console.error('Error fetching feed prefs:', err);
      }
    }

    fetchUserPrefs();
  }, [user?.id, profile]);

  // Fetch unseen count from community_feed_items view
  useEffect(() => {
    async function fetchUnseenCount() {
      if (!user?.id || !showBadge) {
        setUnseenCount(0);
        setLoading(false);
        return;
      }

      // If no lastSeenAt, user hasn't visited feed yet - don't show badge
      if (!lastSeenAt) {
        setUnseenCount(0);
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = `${user.id}-${lastSeenAt}`;
      const cached = unseenCountCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setUnseenCount(cached.count);
        setLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (fetchInProgress.current) return;
      fetchInProgress.current = true;

      try {
        // Query using created_at which is the column available in the view
        const { count, error } = await supabase
          .from('community_feed_items')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastSeenAt);

        if (error) throw error;

        const newCount = count ?? 0;
        setUnseenCount(newCount);
        
        // Cache the result
        unseenCountCache.set(cacheKey, { count: newCount, timestamp: Date.now() });
      } catch (err) {
        console.error('Error fetching unseen count:', err);
        setUnseenCount(0);
      } finally {
        setLoading(false);
        fetchInProgress.current = false;
      }
    }

    fetchUnseenCount();
  }, [user?.id, showBadge, lastSeenAt]);

  // Mark feed as seen (update last_seen_at to now)
  const markAsSeen = useCallback(async () => {
    if (!user?.id) return;

    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('profiles')
        .update({ feed_last_seen_at: now })
        .eq('id', user.id);

      if (error) throw error;

      setLastSeenAt(now);
      setUnseenCount(0);
      
      // Clear cache for this user
      unseenCountCache.forEach((_, key) => {
        if (key.startsWith(user.id)) {
          unseenCountCache.delete(key);
        }
      });
    } catch (err) {
      console.error('Error marking feed as seen:', err);
    }
  }, [user?.id]);

  return {
    unseenCount,
    loading,
    markAsSeen,
    showBadge,
  };
}
