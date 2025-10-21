import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingVendorsCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch role from user_roles table (security requirement)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        // Check for admin-level access (owner role automatically has admin access)
        const adminStatus = roleData?.role === "admin" || roleData?.role === "owner";
        setIsAdmin(adminStatus);

        if (adminStatus) {
          await fetchPendingVendorsCount();
          cleanup = setupRealtimeSubscription();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const fetchPendingVendorsCount = async () => {
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
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('vendors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors'
        },
        () => {
          console.log('Vendor changed, refetching pending vendors count');
          fetchPendingVendorsCount();
        }
      )
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { count, loading, refetch: fetchPendingVendorsCount, isAdmin };
};
