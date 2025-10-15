import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useContactFormCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCount();
    
    // Subscribe to both submissions and replies changes
    const submissionsChannel = supabase
      .channel("contact-form-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_form_submissions",
        },
        () => {
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_form_replies",
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, []);

  const fetchCount = async () => {
    try {
      // Count new submissions
      const { count: newSubmissions, error: submissionsError } = await supabase
        .from("contact_form_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (submissionsError) throw submissionsError;

      // Count submissions with new user replies (since last admin read)
      const { data: submissionsWithReplies, error: repliesError } = await supabase
        .from("contact_form_submissions")
        .select(`
          id,
          replied_at
        `);

      if (repliesError) throw repliesError;

      let unreadRepliesCount = 0;
      if (submissionsWithReplies) {
        for (const submission of submissionsWithReplies) {
          // Check if there are user replies after the last admin reply
          const { count: newRepliesCount, error: replyCountError } = await supabase
            .from("contact_form_replies")
            .select("*", { count: "exact", head: true })
            .eq("submission_id", submission.id)
            .eq("sender_type", "user")
            .gte("created_at", submission.replied_at || "1970-01-01");

          if (!replyCountError && newRepliesCount && newRepliesCount > 0) {
            unreadRepliesCount++;
          }
        }
      }

      setCount((newSubmissions || 0) + unreadRepliesCount);
    } catch (error) {
      console.error("Error fetching contact form count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading, refetch: fetchCount };
};
