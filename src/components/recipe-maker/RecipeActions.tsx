import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Heart, BookmarkPlus, Share2, ChefHat, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  imageUrl?: string;
}

interface RecipeActionsProps {
  recipe: Recipe;
  userId: string;
  onMadeIt?: () => void;
}

export const RecipeActions = ({ recipe, userId, onMadeIt }: RecipeActionsProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMarkingMade, setIsMarkingMade] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const saveToMyCookbook = async () => {
    setIsSaving(true);
    try {
      // Check if already saved
      const { data: existing } = await supabase
        .from("saved_recipes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", recipe.title)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already saved!",
          description: "This recipe is already in your cookbook",
        });
        setIsSaved(true);
        return;
      }

      const { error } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips || [],
        image_url: recipe.imageUrl,
        is_favorite: true,
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Saved to cookbook! 📚",
        description: "You can find this recipe in your cookbook anytime",
      });
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast({
        title: "Couldn't save recipe",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const shareToGallery = async () => {
    setIsSharing(true);
    try {
      // Check if already shared
      const { data: existing } = await supabase
        .from("public_recipes")
        .select("id")
        .eq("creator_id", userId)
        .eq("title", recipe.title)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already shared!",
          description: "This recipe is already in the gallery",
        });
        setIsShared(true);
        setShowShareDialog(false);
        return;
      }

      const { error } = await supabase.from("public_recipes").insert({
        creator_id: userId,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips || [],
        image_url: recipe.imageUrl,
      });

      if (error) throw error;

      setIsShared(true);
      setShowShareDialog(false);
      toast({
        title: "Shared to gallery! 🎉",
        description: "Others can now see and save your recipe",
      });
    } catch (error: any) {
      console.error("Error sharing recipe:", error);
      toast({
        title: "Couldn't share recipe",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const markAsMade = async () => {
    setIsMarkingMade(true);
    try {
      // First save to cookbook if not already there
      const { data: existing } = await supabase
        .from("saved_recipes")
        .select("id, times_made")
        .eq("user_id", userId)
        .eq("title", recipe.title)
        .maybeSingle();

      if (existing) {
        // Update times made
        await supabase
          .from("saved_recipes")
          .update({
            times_made: (existing.times_made || 0) + 1,
            last_made_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        // Create new entry
        await supabase.from("saved_recipes").insert({
          user_id: userId,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tips: recipe.tips || [],
          image_url: recipe.imageUrl,
          times_made: 1,
          last_made_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Great job, chef! 👨‍🍳",
        description: "We've recorded that you made this recipe",
      });
      onMadeIt?.();
    } catch (error: any) {
      console.error("Error marking as made:", error);
      toast({
        title: "Couldn't save",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsMarkingMade(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={markAsMade}
          disabled={isMarkingMade}
          className="gap-2"
        >
          {isMarkingMade ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChefHat className="h-4 w-4" />
          )}
          I Made This!
        </Button>

        <Button
          variant={isSaved ? "secondary" : "outline"}
          size="sm"
          onClick={saveToMyCookbook}
          disabled={isSaving || isSaved}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookmarkPlus className="h-4 w-4" />
          )}
          {isSaved ? "Saved!" : "Save to Cookbook"}
        </Button>

        <Button
          variant={isShared ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowShareDialog(true)}
          disabled={isShared}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          {isShared ? "Shared!" : "Share to Gallery"}
        </Button>
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Recipe Gallery</DialogTitle>
            <DialogDescription>
              Share "{recipe.title}" with the community? Others will be able to see your recipe and add it to their own cookbooks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={shareToGallery} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                "Share Recipe"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
