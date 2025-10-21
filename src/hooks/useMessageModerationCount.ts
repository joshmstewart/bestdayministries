import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMessageModerationCount = () => {
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

  const fetchCount = async () => {
    try {
      const { count: pendingCount, error } = await supabase
        .from("sponsor_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_moderation");

      if (error) throw error;
      setCount(pendingCount || 0);
    } catch (error) {
      console.error("Error fetching message moderation count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("message-moderation-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sponsor_messages",
        },
        () => {
          console.log('Sponsor message changed, refetching moderation count');
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { count, loading, refetch: fetchCount, isAdmin };
};
