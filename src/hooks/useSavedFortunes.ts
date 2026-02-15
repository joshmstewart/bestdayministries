import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";

interface SavedFortune {
  id: string;
  fortune_post_id: string;
  created_at: string;
  fortune_post?: {
    id: string;
    post_date: string;
    likes_count: number;
    fortune?: {
      id: string;
      content: string;
      source_type: string;
      author: string | null;
      reference: string | null;
    };
  };
}

export function useSavedFortunes() {
  const { user } = useAuth();
  const [savedFortunes, setSavedFortunes] = useState<SavedFortune[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedFortunes = useCallback(async () => {
    if (!user) {
      setSavedFortunes([]);
      setLoading(false);
      return;
    }

    try {
      // First get saved fortune IDs
      const { data: savedData, error: savedError } = await supabase
        .from("user_saved_fortunes")
        .select("id, fortune_post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedError) throw savedError;

      if (!savedData || savedData.length === 0) {
        setSavedFortunes([]);
        setLoading(false);
        return;
      }

      // Get fortune post details
      const fortunePostIds = savedData.map(s => s.fortune_post_id);
      const { data: postsData } = await supabase
        .from("daily_fortune_posts")
        .select("id, post_date, likes_count, fortune_id")
        .in("id", fortunePostIds);

      // Get fortune details
      const fortuneIds = postsData?.map(p => p.fortune_id) || [];
      const { data: fortunesData } = await supabase
        .from("daily_fortunes")
        .select("id, content, source_type, author, reference")
        .in("id", fortuneIds);

      // Map everything together
      const enrichedSaved = savedData.map(saved => {
        const post = postsData?.find(p => p.id === saved.fortune_post_id);
        const fortune = post ? fortunesData?.find(f => f.id === post.fortune_id) : null;
        
        return {
          ...saved,
          fortune_post: post ? {
            ...post,
            fortune: fortune || undefined
          } : undefined
        };
      });

      setSavedFortunes(enrichedSaved);
    } catch (error) {
      console.error("Error loading saved fortunes:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSavedFortunes();
  }, [loadSavedFortunes]);

  const isSaved = useCallback((fortunePostId: string) => {
    return savedFortunes.some(s => s.fortune_post_id === fortunePostId);
  }, [savedFortunes]);

  const toggleSave = useCallback(async (fortunePostId: string) => {
    if (!user) {
      showErrorToast("Please sign in to save fortunes");
      return false;
    }

    const currentlySaved = isSaved(fortunePostId);

    try {
      if (currentlySaved) {
        // Remove from saved
        const { error } = await supabase
          .from("user_saved_fortunes")
          .delete()
          .eq("user_id", user.id)
          .eq("fortune_post_id", fortunePostId);

        if (error) throw error;

        setSavedFortunes(prev => prev.filter(s => s.fortune_post_id !== fortunePostId));
        toast.success("Removed from My Fortunes");
        return false;
      } else {
        // Add to saved
        const { data, error } = await supabase
          .from("user_saved_fortunes")
          .insert({
            user_id: user.id,
            fortune_post_id: fortunePostId
          })
          .select()
          .single();

        if (error) throw error;

        setSavedFortunes(prev => [data, ...prev]);
        toast.success("Saved to My Fortunes! ✨");
        return true;
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      showErrorToastWithCopy("Failed to update saved fortunes", error);
      return currentlySaved;
    }
  }, [user, isSaved]);

  return {
    savedFortunes,
    loading,
    isSaved,
    toggleSave,
    refresh: loadSavedFortunes
  };
}
