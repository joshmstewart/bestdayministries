import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSponsorUnreadCount = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
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

      const bestieIds = sponsorships
        .map(s => s.bestie_id)
        .filter((id): id is string => id !== null);

      if (bestieIds.length === 0) {
        setCount(0);
        setLoading(false);
        return;
      }

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
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    fetchUnreadCount();

    const id = instanceId.current;
    const messagesChannel = supabase
      .channel(`sponsor-messages-unread-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsor_messages" },
        () => fetchUnreadCount()
      )
      .subscribe();

    const sponsorshipsChannel = supabase
      .channel(`sponsorships-unread-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sponsorships" },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(sponsorshipsChannel);
    };
  }, [authLoading, isAuthenticated, fetchUnreadCount]);

  return { count, loading: loading || authLoading, refetch: fetchUnreadCount };
};
