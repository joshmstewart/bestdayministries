import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useMessagesCount = () => {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const fetchCount = useCallback(async () => {
    if (!isAdmin || !user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const [submissionsResult, repliesResult] = await Promise.all([
        supabase
          .from("contact_form_submissions")
          .select("id, status, replied_at, assigned_to"),
        supabase
          .from("contact_form_replies")
          .select("submission_id, sender_type, created_at")
      ]);

      if (submissionsResult.error) throw submissionsResult.error;
      if (repliesResult.error) throw repliesResult.error;

      const submissions = submissionsResult.data || [];
      const replies = repliesResult.data || [];

      const latestUserReplyBySubmission = new Map<string, string>();
      replies
        .filter(r => r.sender_type === "user")
        .forEach(reply => {
          const existing = latestUserReplyBySubmission.get(reply.submission_id);
          if (!existing || new Date(reply.created_at) > new Date(existing)) {
            latestUserReplyBySubmission.set(reply.submission_id, reply.created_at);
          }
        });

      let totalCount = 0;

      submissions.forEach(submission => {
        const isRelevant = !submission.assigned_to || submission.assigned_to === user.id;
        if (!isRelevant) return;
        
        let needsAttention = false;
        
        if (submission.status === "new") {
          needsAttention = true;
        }

        const latestUserReply = latestUserReplyBySubmission.get(submission.id);
        if (latestUserReply) {
          const repliedAt = submission.replied_at ? new Date(submission.replied_at) : null;
          const userReplyDate = new Date(latestUserReply);
          if (!repliedAt || userReplyDate > repliedAt) {
            needsAttention = true;
          }
        }
        
        if (needsAttention) {
          totalCount++;
        }
      });

      setCount(totalCount);
    } catch (error) {
      console.error("Error fetching messages count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchCount();

    const id = instanceId.current;
    const submissionsChannel = supabase
      .channel(`messages-submissions-count-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_form_submissions" },
        () => fetchCount()
      )
      .subscribe();

    const repliesChannel = supabase
      .channel(`messages-replies-count-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_form_replies" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, [authLoading, isAdmin, fetchCount]);

  return { count, loading: loading || authLoading, refetch: fetchCount, isAdmin };
};
