import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMessagesCount = () => {
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
          await fetchCount();
          if (mounted) {
            cleanup = setupRealtimeSubscription();
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

  const setupRealtimeSubscription = () => {
    // Subscribe to both submissions and replies changes (including deletes)
    const submissionsChannel = supabase
      .channel("contact-form-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contact_form_submissions",
        },
        () => {
          console.log('Contact form submission inserted, refetching count');
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contact_form_submissions",
        },
        () => {
          console.log('Contact form submission updated, refetching count');
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "contact_form_submissions",
        },
        () => {
          console.log('Contact form submission deleted, refetching count');
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
          console.log('Contact form reply inserted, refetching count');
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "contact_form_replies",
        },
        () => {
          console.log('Contact form reply updated, refetching count');
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "contact_form_replies",
        },
        () => {
          console.log('Contact form reply deleted, refetching count');
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  };

  const fetchCount = async () => {
    try {
      // Count new submissions
      const { count: newSubmissions, error: submissionsError } = await supabase
        .from("contact_form_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (submissionsError) throw submissionsError;

      // Fetch submissions with replied_at timestamps
      const { data: submissionsWithReplies, error: repliesError } = await supabase
        .from("contact_form_submissions")
        .select("id, replied_at");

      if (repliesError) throw repliesError;

      if (!submissionsWithReplies || submissionsWithReplies.length === 0) {
        setCount(newSubmissions || 0);
        return;
      }

      // Fetch ALL user replies in ONE query
      const submissionIds = submissionsWithReplies.map(s => s.id);
      const { data: allUserReplies, error: userRepliesError } = await supabase
        .from("contact_form_replies")
        .select("submission_id, created_at")
        .eq("sender_type", "user")
        .in("submission_id", submissionIds);

      if (userRepliesError) throw userRepliesError;

      // Count submissions with unread user replies client-side
      let unreadRepliesCount = 0;
      submissionsWithReplies.forEach(submission => {
        const repliedAt = submission.replied_at || "1970-01-01";
        const hasUnreadReplies = allUserReplies?.some(
          reply => reply.submission_id === submission.id && reply.created_at >= repliedAt
        );
        if (hasUnreadReplies) {
          unreadRepliesCount++;
        }
      });

      setCount((newSubmissions || 0) + unreadRepliesCount);
    } catch (error) {
      console.error("Error fetching contact form count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading, refetch: fetchCount, isAdmin };
};
