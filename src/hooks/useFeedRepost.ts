import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";

export function useFeedRepost() {
  const [isReposting, setIsReposting] = useState(false);

  const repostToFeed = async (itemType: string, itemId: string, caption?: string) => {
    setIsReposting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showErrorToast("You must be signed in to repost");
        return false;
      }

      const { error } = await supabase
        .from("feed_reposts")
        .insert({
          original_item_type: itemType,
          original_item_id: itemId,
          reposted_by: user.id,
          caption: caption || null,
        });

      if (error) throw error;

      toast.success("Reposted to feed!");
      return true;
    } catch (error: any) {
      console.error("Error reposting:", error);
      showErrorToastWithCopy("Failed to repost", error);
      return false;
    } finally {
      setIsReposting(false);
    }
  };

  const removeRepost = async (repostId: string) => {
    setIsReposting(true);
    try {
      const { error } = await supabase
        .from("feed_reposts")
        .delete()
        .eq("id", repostId);

      if (error) throw error;

      toast.success("Repost removed");
      return true;
    } catch (error: any) {
      console.error("Error removing repost:", error);
      showErrorToastWithCopy("Failed to remove repost", error);
      return false;
    } finally {
      setIsReposting(false);
    }
  };

  return {
    repostToFeed,
    removeRepost,
    isReposting,
  };
}
