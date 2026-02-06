import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedBadgeStore } from '@/stores/feedBadgeStore';

interface UseUnseenFeedCountReturn {
  unseenCount: number;
  loading: boolean;
  markAsSeen: () => Promise<void>;
  showBadge: boolean;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function useUnseenFeedCount(): UseUnseenFeedCountReturn {
  const { user } = useAuth();
  const {
    unseenCount,
    lastSeenAt,
    showBadge,
    loading,
    setUnseenCount,
    setLastSeenAt,
    setShowBadge,
    setLoading,
    markAsSeen: markAsSeenInStore,
  } = useFeedBadgeStore();
  const hasFetchedPrefs = useRef(false);

  // Fetch user's preference and last seen timestamp (only once per user)
  useEffect(() => {
    async function fetchUserPrefs() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Skip if we've already fetched for this user
      if (hasFetchedPrefs.current) return;
      hasFetchedPrefs.current = true;

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
  }, [user?.id, setShowBadge, setLastSeenAt, setLoading]);

  // Fetch unseen count and poll periodically
  useEffect(() => {
    if (!user?.id || !showBadge || !lastSeenAt) {
      setUnseenCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchUnseenCount() {
      try {
        const { count, error } = await supabase
          .from('community_feed_items')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastSeenAt!);

        if (error) throw error;
        if (!cancelled) {
          setUnseenCount(count ?? 0);
        }
      } catch (err) {
        console.error('Error fetching unseen count:', err);
        if (!cancelled) setUnseenCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Initial fetch
    fetchUnseenCount();

    // Poll for new items
    const interval = setInterval(fetchUnseenCount, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id, showBadge, lastSeenAt, setUnseenCount, setLoading]);

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
      markAsSeenInStore();
    } catch (err) {
      console.error('Error marking feed as seen:', err);
    }
  }, [user?.id, setLastSeenAt, markAsSeenInStore]);

  return {
    unseenCount,
    loading,
    markAsSeen,
    showBadge,
  };
}
