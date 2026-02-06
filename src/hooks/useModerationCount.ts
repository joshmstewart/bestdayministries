import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useModerationCount = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const fetchModerationCount = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const [postsResult, commentsResult] = await Promise.all([
        supabase
          .from("discussion_posts")
          .select("*", { count: "exact", head: true })
          .eq("is_moderated", false),
        supabase
          .from("discussion_comments")
          .select("*", { count: "exact", head: true })
          .eq("is_moderated", false)
      ]);

      const postsCount = postsResult.count || 0;
      const commentsCount = commentsResult.count || 0;

      setCount(postsCount + commentsCount);
    } catch (error) {
      console.error("Error fetching moderation count:", error);
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

    fetchModerationCount();

    const id = instanceId.current;
    const postsChannel = supabase
      .channel(`moderation-posts-count-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_posts" },
        () => fetchModerationCount()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`moderation-comments-count-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_comments" },
        () => fetchModerationCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [authLoading, isAdmin, fetchModerationCount]);

  return { count, loading: loading || authLoading, refetch: fetchModerationCount, isAdmin };
};
