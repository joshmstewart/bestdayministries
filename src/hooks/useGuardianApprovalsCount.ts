import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useGuardianApprovalsCount = () => {
  const { user, isGuardian, isAdmin, isOwner, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLinkedBesties, setHasLinkedBesties] = useState(false);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const canApprove = isGuardian || isAdmin || isOwner;

  const fetchApprovalsCount = useCallback(async () => {
    if (!user || !canApprove) {
      setCount(0);
      setHasLinkedBesties(false);
      setLoading(false);
      return;
    }

    try {
      const { data: links, error: linksError } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id, require_post_approval, require_comment_approval, require_message_approval, require_prayer_approval")
        .eq("caregiver_id", user.id);

      if (linksError) throw linksError;
      if (!links || links.length === 0) {
        setCount(0);
        setHasLinkedBesties(false);
        setLoading(false);
        return;
      }

      setHasLinkedBesties(true);
      let totalCount = 0;

      const postLinks = links.filter(l => l.require_post_approval);
      const commentLinks = links.filter(l => l.require_comment_approval);
      const messageLinks = links.filter(l => l.require_message_approval);
      const prayerLinks = links.filter(l => (l as any).require_prayer_approval !== false);

      const results: { count: number | null }[] = [];

      if (postLinks.length > 0) {
        const { count } = await supabase
          .from("discussion_posts")
          .select("*", { count: "exact", head: true })
          .in("author_id", postLinks.map(l => l.bestie_id))
          .eq("approval_status", "pending_approval");
        results.push({ count });
      }

      if (commentLinks.length > 0) {
        const { count } = await supabase
          .from("discussion_comments")
          .select("*", { count: "exact", head: true })
          .in("author_id", commentLinks.map(l => l.bestie_id))
          .eq("approval_status", "pending_approval");
        results.push({ count });
      }

      if (messageLinks.length > 0) {
        const { count } = await supabase
          .from("sponsor_messages")
          .select("*", { count: "exact", head: true })
          .in("bestie_id", messageLinks.map(l => l.bestie_id))
          .eq("status", "pending_approval");
        results.push({ count });
      }

      if (prayerLinks.length > 0) {
        const { count } = await supabase
          .from("prayer_requests")
          .select("*", { count: "exact", head: true })
          .in("user_id", prayerLinks.map(l => l.bestie_id))
          .eq("approval_status", "pending_approval");
        results.push({ count });
      }

      results.forEach(result => {
        if (result.count) {
          totalCount += result.count;
        }
      });

      setCount(totalCount);
    } catch (error) {
      console.error("Error fetching guardian approvals count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, canApprove]);

  useEffect(() => {
    if (authLoading) return;

    if (!canApprove) {
      setLoading(false);
      return;
    }

    fetchApprovalsCount();

    const id = instanceId.current;
    const postsChannel = supabase
      .channel(`guardian-approvals-posts-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_posts" },
        () => fetchApprovalsCount()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`guardian-approvals-comments-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discussion_comments" },
        () => fetchApprovalsCount()
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`guardian-approvals-messages-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsor_messages" },
        () => fetchApprovalsCount()
      )
      .subscribe();

    const prayersChannel = supabase
      .channel(`guardian-approvals-prayers-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_requests" },
        () => fetchApprovalsCount()
      )
      .subscribe();

    const linksChannel = supabase
      .channel(`guardian-approvals-links-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "caregiver_bestie_links" },
        () => fetchApprovalsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(prayersChannel);
      supabase.removeChannel(linksChannel);
    };
  }, [authLoading, canApprove, fetchApprovalsCount]);

  return { count, loading: loading || authLoading, refetch: fetchApprovalsCount, hasLinkedBesties, canApprove };
};
