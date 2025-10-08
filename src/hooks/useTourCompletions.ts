import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTourCompletions() {
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompletions();
  }, []);

  const loadCompletions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("tour_completions")
        .select("tour_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const completedIds = new Set((data || []).map(c => c.tour_id));
      setCompletedTours(completedIds);
    } catch (error) {
      console.error("Error loading tour completions:", error);
    } finally {
      setLoading(false);
    }
  };

  const isTourCompleted = (tourId: string) => completedTours.has(tourId);

  return { completedTours, isTourCompleted, loading, refreshCompletions: loadCompletions };
}
