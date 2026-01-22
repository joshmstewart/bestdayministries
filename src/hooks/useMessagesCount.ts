import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useMessagesCount = () => {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    if (!isAdmin || !user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch all submissions and replies in parallel
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

      // Create a map of the latest user reply per submission
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
        // Only count if unassigned OR assigned to current user
        const isRelevant = !submission.assigned_to || submission.assigned_to === user.id;
        
        if (!isRelevant) return;
        
        // Count new submissions
        if (submission.status === "new") {
          totalCount++;
        }

        // Count submissions with unread user replies
        const latestUserReply = latestUserReplyBySubmission.get(submission.id);
        if (latestUserReply) {
          const repliedAt = submission.replied_at ? new Date(submission.replied_at) : null;
          const userReplyDate = new Date(latestUserReply);
          if (!repliedAt || userReplyDate > repliedAt) {
            totalCount++;
          }
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

    const submissionsChannel = supabase
      .channel("messages-submissions-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_form_submissions" },
        () => fetchCount()
      )
      .subscribe();

    const repliesChannel = supabase
      .channel("messages-replies-count")
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
