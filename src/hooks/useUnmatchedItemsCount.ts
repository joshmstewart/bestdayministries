import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnmatchedItemsCount = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

    // Set up realtime subscription
    const channel = supabase
      .channel("unmatched-items-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recipe_unmatched_items" },
        () => fetchUnmatchedCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, isAdmin, fetchUnmatchedCount]);

  return { count, loading: loading || authLoading, refetch: fetchUnmatchedCount };
};
