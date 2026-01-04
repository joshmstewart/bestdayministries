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

  const saveAndShare = async () => {
    setIsSharing(true);
    try {
      // First save to cookbook
      const { data: existingSaved } = await supabase
        .from("saved_recipes")
        .select("id")
        .eq("user_id", userId)
        .eq("title", recipe.title)
        .maybeSingle();

      if (!existingSaved) {
        await supabase.from("saved_recipes").insert({
          user_id: userId,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tips: recipe.tips || [],
          image_url: recipe.imageUrl,
          is_favorite: true,
        });
      }
      setIsSaved(true);

      // Then share to gallery
      const { data: existingShared } = await supabase
        .from("public_recipes")
        .select("id")
        .eq("creator_id", userId)
        .eq("title", recipe.title)
        .maybeSingle();

      if (existingShared) {
        toast({
          title: "Already shared!",
          description: "This recipe is already in the gallery",
        });
        setIsShared(true);
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
      toast({
        title: "Saved & Shared! 🎉",
        description: "Recipe added to your cookbook and shared with the community",
      });
    } catch (error: any) {
      console.error("Error saving/sharing recipe:", error);
      toast({
        title: "Couldn't save recipe",
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
    <div className="flex flex-col items-center gap-2">
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
          variant={isShared ? "secondary" : "default"}
          size="sm"
          onClick={saveAndShare}
          disabled={isSharing || isShared}
          className="gap-2"
        >
          {isSharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {isShared ? "Saved & Shared!" : "Save & Share"}
        </Button>
      </div>

      {/* Private save option - smaller link */}
      {!isSaved && !isShared && (
        <button
          onClick={saveToMyCookbook}
          disabled={isSaving}
          className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
        >
          {isSaving ? "Saving..." : "or save to cookbook only (private)"}
        </button>
      )}
    </div>
  );
};
