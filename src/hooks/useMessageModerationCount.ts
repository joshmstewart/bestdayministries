import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMessageModerationCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCount();
    setupRealtimeSubscription();
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
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { count, loading, refetch: fetchCount };
};
