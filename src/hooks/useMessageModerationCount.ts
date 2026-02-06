import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useMessageModerationCount = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const fetchCount = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count: pendingCount, error } = await supabase
        .from("sponsor_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_moderation");

      if (error) throw error;
      setCount(pendingCount || 0);
    } catch (error) {
      console.error("Error fetching message moderation count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchCount();

    const channel = supabase
      .channel(`message-moderation-count-${instanceId.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsor_messages" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, isAdmin, fetchCount]);

  return { count, loading: loading || authLoading, refetch: fetchCount, isAdmin };
};
