import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnmatchedItemsCount = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUnmatchedCount = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count: unmatchedCount, error } = await supabase
        .from("recipe_unmatched_items")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false);

      if (error) throw error;
      setCount(unmatchedCount || 0);
    } catch (error) {
      console.error("Error fetching unmatched items count:", error);
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

    fetchUnmatchedCount();

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Set up realtime subscription with unique channel name
    const channelName = `unmatched-items-count-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recipe_unmatched_items" },
        () => fetchUnmatchedCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "recipe_unmatched_items" },
        () => fetchUnmatchedCount()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "recipe_unmatched_items" },
        () => fetchUnmatchedCount()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [authLoading, isAdmin, fetchUnmatchedCount]);

  return { count, loading: loading || authLoading, refetch: fetchUnmatchedCount };
};
