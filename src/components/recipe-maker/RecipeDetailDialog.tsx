import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, BookmarkPlus, Loader2, ShoppingBasket, Lightbulb } from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
  tips: string[];
  image_url: string | null;
}

interface RecipeDetailDialogProps {
  recipe: Recipe;
  userIngredients: string[];
  userId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCookbook?: () => void;
}

export const RecipeDetailDialog = ({
  recipe,
  userIngredients,
  userId,
  open,
  onOpenChange,
  onAddToCookbook,
}: RecipeDetailDialogProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Categorize ingredients
  const ingredientMatches = recipe.ingredients.map(ing => {
    const hasIt = userIngredients.some(ui =>
      ing.toLowerCase().includes(ui.toLowerCase()) ||
      ui.toLowerCase().includes(ing.toLowerCase())
    );
    return { ingredient: ing, hasIt };
  });

  const haveCount = ingredientMatches.filter(m => m.hasIt).length;
  const needCount = ingredientMatches.filter(m => !m.hasIt).length;

  const addToCookbook = async () => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save recipes",
        variant: "destructive",
      });
      return;
    }

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
        return;
      }

      const { error } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips || [],
        image_url: recipe.image_url,
        source_recipe_id: recipe.id,
      });

      if (error) throw error;

      // Increment the saves_count on the public recipe
      const { data: currentRecipe } = await supabase
        .from("public_recipes")
        .select("saves_count")
        .eq("id", recipe.id)
        .single();

      if (currentRecipe) {
        await supabase
          .from("public_recipes")
          .update({ saves_count: (currentRecipe.saves_count || 0) + 1 })
          .eq("id", recipe.id);
      }

      toast({
        title: "Added to cookbook! 📚",
        description: "You can find this recipe in your cookbook",
      });
      onAddToCookbook?.();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{recipe.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {recipe.image_url && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}

            {/* Ingredient Match Summary */}
            {userIngredients.length > 0 && (
              <div className="flex gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  {haveCount} you have
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <ShoppingBasket className="h-3 w-3" />
                  {needCount} to get
                </Badge>
              </div>
            )}

            {/* Ingredients with match status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBasket className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Ingredients</h3>
                </div>
                <ul className="space-y-2">
                  {ingredientMatches.map(({ ingredient, hasIt }, index) => (
                    <li
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                        hasIt
                          ? "bg-green-50 dark:bg-green-900/20"
                          : "bg-orange-50 dark:bg-orange-900/20"
                      }`}
                    >
                      {hasIt ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      )}
                      <span>{ingredient}</span>
                      {!hasIt && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 ml-auto">
                          Need to get
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Steps */}
            <div className="space-y-3">
              <h3 className="font-semibold">Steps</h3>
              <ol className="space-y-3">
                {recipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <p className="text-sm pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tips */}
            {recipe.tips && recipe.tips.length > 0 && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">Tips</h3>
                  </div>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600">💡</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {userId && (
          <div className="pt-4 border-t">
            <Button onClick={addToCookbook} disabled={isSaving} className="w-full gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              Add to My Cookbook
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
