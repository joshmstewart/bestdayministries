import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useModerationCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const adminStatus = profile?.role === "admin" || profile?.role === "owner";
      setIsAdmin(adminStatus);

      if (adminStatus) {
        fetchModerationCount();
        setupRealtimeSubscriptions();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setLoading(false);
    }
  };

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
          fetchModerationCount();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
    };
  };

  return { count, loading, refetch: fetchModerationCount, isAdmin };
};
