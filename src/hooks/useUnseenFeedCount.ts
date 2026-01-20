import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseUnseenFeedCountReturn {
  unseenCount: number;
  loading: boolean;
  markAsSeen: () => Promise<void>;
  showBadge: boolean;
}

export function useUnseenFeedCount(): UseUnseenFeedCountReturn {
  const { user, profile } = useAuth();
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  // Fetch user's preference and last seen timestamp
  useEffect(() => {
    async function fetchUserPrefs() {
      if (!user?.id) {
        setLoading(false);
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
  }, [user?.id]);

  // Fetch unseen count from community_feed_items view
  useEffect(() => {
    async function fetchUnseenCount() {
      if (!user?.id || !showBadge || !lastSeenAt) {
        setUnseenCount(0);
        setLoading(false);
        return;
      }

      try {
        // Count items newer than last seen
        const { count, error } = await supabase
          .from('community_feed_items')
          .select('*', { count: 'exact', head: true })
          .gt('shared_at', lastSeenAt);

        if (error) throw error;

        setUnseenCount(count ?? 0);
      } catch (err) {
        console.error('Error fetching unseen count:', err);
        setUnseenCount(0);
      } finally {
        setLoading(false);
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
