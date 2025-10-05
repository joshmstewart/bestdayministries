import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGuardianApprovalsCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGuardian, setIsGuardian] = useState(false);

  useEffect(() => {
    checkGuardianStatus();
  }, []);

  const checkGuardianStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const guardianStatus = roleData?.role === "caregiver";
      setIsGuardian(guardianStatus);

      if (guardianStatus) {
        fetchApprovalsCount(user.id);
        setupRealtimeSubscriptions(user.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking guardian status:", error);
      setLoading(false);
    }
  };

  const fetchApprovalsCount = async (userId: string) => {
    try {
      // Get all linked besties for this guardian
      const { data: links, error: linksError } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id, require_post_approval, require_comment_approval, require_message_approval")
        .eq("caregiver_id", userId);

      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      let totalCount = 0;

      // Count pending posts for besties where post approval is required
      const bestiesRequiringPostApproval = links
        .filter(link => link.require_post_approval)
        .map(link => link.bestie_id);

      if (bestiesRequiringPostApproval.length > 0) {
        const { count: postsCount, error: postsError } = await supabase
          .from("discussion_posts")
          .select("*", { count: "exact", head: true })
          .in("author_id", bestiesRequiringPostApproval)
          .eq("approval_status", "pending_approval");

        if (postsError) throw postsError;
        totalCount += postsCount || 0;
      }

      // Count pending comments for besties where comment approval is required
      const bestiesRequiringCommentApproval = links
        .filter(link => link.require_comment_approval)
        .map(link => link.bestie_id);

      if (bestiesRequiringCommentApproval.length > 0) {
        const { count: commentsCount, error: commentsError } = await supabase
          .from("discussion_comments")
          .select("*", { count: "exact", head: true })
          .in("author_id", bestiesRequiringCommentApproval)
          .eq("approval_status", "pending_approval");

        if (commentsError) throw commentsError;
        totalCount += commentsCount || 0;
      }

      // Count pending sponsor messages for besties where message approval is required
      const bestiesRequiringMessageApproval = links
        .filter(link => link.require_message_approval)
        .map(link => link.bestie_id);

      if (bestiesRequiringMessageApproval.length > 0) {
        const { count: messagesCount, error: messagesError } = await supabase
          .from("sponsor_messages")
          .select("*", { count: "exact", head: true })
          .in("bestie_id", bestiesRequiringMessageApproval)
          .eq("status", "pending_approval");

        if (messagesError) throw messagesError;
        totalCount += messagesCount || 0;
      }

      setCount(totalCount);
    } catch (error) {
      console.error("Error fetching approvals count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = (userId: string) => {
    // Set up realtime subscription for posts
    const postsChannel = supabase
      .channel('guardian-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_posts'
        },
        () => {
          fetchApprovalsCount(userId);
        }
      )
      .subscribe();

    // Set up realtime subscription for comments
    const commentsChannel = supabase
      .channel('guardian-comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_comments'
        },
        () => {
          fetchApprovalsCount(userId);
        }
      )
      .subscribe();

    // Set up realtime subscription for sponsor messages
    const messagesChannel = supabase
      .channel('guardian-messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sponsor_messages'
        },
        () => {
          fetchApprovalsCount(userId);
        }
      )
      .subscribe();

    // Set up realtime subscription for link changes
    const linksChannel = supabase
      .channel('guardian-links-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caregiver_bestie_links',
          filter: `caregiver_id=eq.${userId}`
        },
        () => {
          fetchApprovalsCount(userId);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(linksChannel);
    };
  };

  return { count, loading, refetch: fetchApprovalsCount, isGuardian };
};
