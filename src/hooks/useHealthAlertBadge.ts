import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the count of dead critical functions from the latest health check.
 * Subscribes to realtime updates so the badge updates automatically.
 */
export function useHealthAlertBadge() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [deadCount, setDeadCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const fetchLatest = useCallback(async () => {
    if (!isAdmin) {
      setDeadCount(0);
      setCriticalCount(0);
      return;
    }

    const { data } = await supabase
      .from('health_check_results')
      .select('dead_count, dead_critical_count')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    setDeadCount(data?.dead_count ?? 0);
    setCriticalCount(data?.dead_critical_count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    fetchLatest();

    const channel = supabase
      .channel('health-check-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'health_check_results' },
        () => fetchLatest()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, isAdmin, fetchLatest]);

  return { deadCount, criticalCount };
}
