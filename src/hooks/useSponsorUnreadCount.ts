import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSponsorUnreadCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
    setupRealtimeSubscription();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCount(0);
        setLoading(false);
        return;
      }

      // Get all sponsorships for this user
      const { data: sponsorships, error: sponsorshipsError } = await supabase
        .from("sponsorships")
        .select("bestie_id")
        .eq("sponsor_id", user.id)
        .eq("status", "active");

      if (sponsorshipsError) throw sponsorshipsError;

      if (!sponsorships || sponsorships.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

      const bestieIds = sponsorships.map(s => s.bestie_id);

      // Count unread messages from all sponsored besties
      const { count: unreadCount, error: countError } = await supabase
        .from("sponsor_messages")
        .select("*", { count: "exact", head: true })
        .in("bestie_id", bestieIds)
        .in("status", ["approved", "sent"])
        .eq("is_read", false);

      if (countError) throw countError;

      setCount(unreadCount || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("sponsor-messages-unread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sponsor_messages",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sponsorships",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { count, loading, refetch: fetchUnreadCount };
};
