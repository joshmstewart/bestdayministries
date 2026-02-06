import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePendingVendorsCount = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const instanceId = useRef(Math.random().toString(36).slice(2, 8));

  const fetchPendingVendorsCount = useCallback(async () => {
    if (!isAdmin) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count: vendorsCount, error } = await supabase
        .from("vendors")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      setCount(vendorsCount || 0);
    } catch (error) {
      console.error("Error fetching pending vendors count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchPendingVendorsCount();

    const channel = supabase
      .channel(`vendors-changes-${instanceId.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors" },
        () => fetchPendingVendorsCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, isAdmin, fetchPendingVendorsCount]);

  return { count, loading: loading || authLoading, refetch: fetchPendingVendorsCount, isAdmin };
};
