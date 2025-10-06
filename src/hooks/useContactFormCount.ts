import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useContactFormCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCount();
    setupRealtimeSubscription();
  }, []);

  const fetchCount = async () => {
    try {
      const { count: newCount, error } = await supabase
        .from("contact_form_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (error) throw error;
      setCount(newCount || 0);
    } catch (error) {
      console.error("Error fetching contact form count:", error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return { count, loading, refetch: fetchCount };
};
