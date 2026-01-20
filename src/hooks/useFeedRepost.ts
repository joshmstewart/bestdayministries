import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFeedRepost() {
  const [isReposting, setIsReposting] = useState(false);

  const repostToFeed = async (itemType: string, itemId: string) => {
    setIsReposting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to repost");
        return false;
      }

      const { error } = await supabase
        .from("feed_reposts")
        .insert({
          original_item_type: itemType,
          original_item_id: itemId,
          reposted_by: user.id,
        });

      if (error) throw error;

      toast.success("Reposted to feed!");
      return true;
    } catch (error: any) {
      console.error("Error reposting:", error);
      toast.error(error.message || "Failed to repost");
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
      toast.error(error.message || "Failed to remove repost");
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
