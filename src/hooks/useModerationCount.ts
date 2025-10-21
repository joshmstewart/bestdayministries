import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useModerationCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user || !mounted) {
          if (mounted) setLoading(false);
          return;
        }

        // Fetch role from user_roles table (security requirement)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        // Check for admin-level access (owner role automatically has admin access)
        const adminStatus = roleData?.role === "admin" || roleData?.role === "owner";
        setIsAdmin(adminStatus);

        if (adminStatus) {
          await fetchModerationCount();
          if (mounted) {
            cleanup = setupRealtimeSubscriptions();
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const fetchModerationCount = async () => {
    try {
      // Count unmoderated posts
      const { count: postsCount, error: postsError } = await supabase
        .from("discussion_posts")
        .select("*", { count: "exact", head: true })
        .eq("is_moderated", false);

      if (postsError) throw postsError;

      // Count unmoderated comments
      const { count: commentsCount, error: commentsError } = await supabase
        .from("discussion_comments")
        .select("*", { count: "exact", head: true })
        .eq("is_moderated", false);

      if (commentsError) throw commentsError;

      const totalCount = (postsCount || 0) + (commentsCount || 0);
      setCount(totalCount);
    } catch (error) {
      console.error("Error fetching moderation count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Set up realtime subscription for posts
    const postsChannel = supabase
      .channel('posts-moderation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_posts'
        },
        () => {
          console.log('Discussion post changed, refetching moderation count');
          fetchModerationCount();
        }
      )
      .subscribe();

    // Set up realtime subscription for comments
    const commentsChannel = supabase
      .channel('comments-moderation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_comments'
        },
        () => {
          console.log('Discussion comment changed, refetching moderation count');
          fetchModerationCount();
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  };

  return { count, loading, refetch: fetchModerationCount, isAdmin };
};
