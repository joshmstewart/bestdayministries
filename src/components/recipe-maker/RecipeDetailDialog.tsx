import { useState, useEffect, useMemo } from "react";
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
import { TextToSpeech } from "@/components/TextToSpeech";
import { Check, X, BookmarkPlus, Loader2, ShoppingBasket, Lightbulb, Wrench, RefreshCw, Users } from "lucide-react";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  steps: string[];
  tips: string[];
  tools?: string[];
  image_url: string | null;
  creator_id?: string;
  creator_name?: string;
  saves_count?: number;
}

interface RecipeDetailDialogProps {
  recipe: Recipe;
  userIngredients: string[];
  userTools?: string[];
  userId?: string;
  isInCookbook?: boolean;
  isAdmin?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCookbook?: () => void;
  onImageRegenerated?: (newImageUrl: string) => void;
}

export const RecipeDetailDialog = ({
  recipe,
  userIngredients,
  userTools = [],
  userId,
  isInCookbook = false,
  isAdmin = false,
  open,
  onOpenChange,
  onAddToCookbook,
  onImageRegenerated,
}: RecipeDetailDialogProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(recipe.image_url);

  // Update currentImageUrl when recipe changes
  useEffect(() => {
    setCurrentImageUrl(recipe.image_url);
  }, [recipe.image_url]);

  const isAssumedAvailableIngredient = (ingredient: string) => {
    // Assumed pantry items (always available)
    return /\bwater\b/i.test(ingredient);
  };

  // Normalize to singular form for better matching
  const toSingular = (word: string) => {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('ses') || word.endsWith('zes'))) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  };

  // Categorize ingredients
  const ingredientMatches = recipe.ingredients.map((ing) => {
    if (isAssumedAvailableIngredient(ing)) {
      return { ingredient: ing, hasIt: true };
    }

    const hasIt = userIngredients.some((ui) => {
      const ingLower = ing.toLowerCase();
      const uiLower = ui.toLowerCase();
      const singularIng = toSingular(ingLower);
      const singularUi = toSingular(uiLower);
      return ingLower.includes(uiLower) || 
             uiLower.includes(ingLower) ||
             singularIng.includes(singularUi) ||
             singularUi.includes(singularIng);
    });
    return { ingredient: ing, hasIt };
  });

  const haveCount = ingredientMatches.filter((m) => m.hasIt).length;
  const needCount = ingredientMatches.filter((m) => !m.hasIt).length;

  // Categorize tools
  const recipeTools = recipe.tools || [];
  const toolMatches = recipeTools.map((tool) => {
    const hasTool = userTools.some(
      (ut) => tool.toLowerCase().includes(ut.toLowerCase()) || ut.toLowerCase().includes(tool.toLowerCase()),
    );
    return { tool, hasTool };
  });

  const haveToolsCount = toolMatches.filter((m) => m.hasTool).length;
  const needToolsCount = toolMatches.filter((m) => !m.hasTool).length;

  // Construct TTS text for the full recipe
  const ttsText = useMemo(() => {
    const parts = [
      recipe.title,
      recipe.description || '',
      `Ingredients: ${recipe.ingredients.join(', ')}`,
      recipeTools.length ? `Tools needed: ${recipeTools.join(', ')}` : '',
      `Steps: ${recipe.steps.map((step, i) => `Step ${i + 1}: ${step}`).join('. ')}`,
      recipe.tips?.length ? `Tips: ${recipe.tips.join('. ')}` : ''
    ];
    return parts.filter(Boolean).join('. ');
  }, [recipe, recipeTools]);

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

      const { data: canonicalPublic } = await supabase
        .from("public_recipes")
        .select("title, description, ingredients, steps, tips, tools, image_url")
        .eq("id", recipe.id)
        .maybeSingle();

      const insertPayload = canonicalPublic
        ? {
            user_id: userId,
            title: canonicalPublic.title,
            description: canonicalPublic.description,
            ingredients: canonicalPublic.ingredients,
            steps: canonicalPublic.steps,
            tips: (canonicalPublic.tips || []) as string[],
            tools: (canonicalPublic.tools || []) as string[],
            image_url: canonicalPublic.image_url,
            source_recipe_id: recipe.id,
          }
        : {
            user_id: userId,
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            tips: recipe.tips || [],
            tools: recipe.tools || [],
            image_url: recipe.image_url,
          };

      const { error } = await supabase.from("saved_recipes").insert(insertPayload);

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

  const regenerateImage = async () => {
    setIsRegeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-recipe-image', {
        body: {
          recipeId: recipe.id,
          recipeName: recipe.title,
          ingredients: recipe.ingredients
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setCurrentImageUrl(data.imageUrl);
        onImageRegenerated?.(data.imageUrl);
        toast({
          title: "Image regenerated! 🎨",
          description: "The recipe image has been updated",
        });
      }
    } catch (error: any) {
      console.error("Error regenerating image:", error);
      toast({
        title: "Couldn't regenerate image",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{recipe.title}</DialogTitle>
            <TextToSpeech text={ttsText} size="default" />
          </div>
        </DialogHeader>

        <div className="pr-4">
          <div className="space-y-6 pb-4">
            {currentImageUrl && (
              <div className="relative">
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={currentImageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {(isAdmin || (userId && recipe.creator_id === userId)) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 gap-1"
                    onClick={regenerateImage}
                    disabled={isRegeneratingImage}
                  >
                    <RefreshCw className={`h-3 w-3 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                    {isRegeneratingImage ? 'Generating...' : 'Regenerate'}
                  </Button>
                )}
              </div>
            )}

            {(recipe.creator_name || typeof recipe.saves_count === "number") && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {recipe.creator_name && (
                  <span className="font-medium">Recipe by Chef {recipe.creator_name}</span>
                )}
                {typeof recipe.saves_count === "number" && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    In {recipe.saves_count} {recipe.saves_count === 1 ? "cookbook" : "cookbooks"}
                  </span>
                )}
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

            {/* Tools with match status */}
            {recipeTools.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Tools Needed</h3>
                    {userTools.length > 0 && (
                      <div className="flex gap-2 ml-auto">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Check className="h-3 w-3 text-green-500" />
                          {haveToolsCount}
                        </Badge>
                        {needToolsCount > 0 && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <X className="h-3 w-3" />
                            {needToolsCount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {toolMatches.map(({ tool, hasTool }, index) => (
                      <li
                        key={index}
                        className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                          userTools.length === 0
                            ? "bg-muted"
                            : hasTool
                              ? "bg-green-50 dark:bg-green-900/20"
                              : "bg-orange-50 dark:bg-orange-900/20"
                        }`}
                      >
                        {userTools.length > 0 && (
                          hasTool ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          )
                        )}
                        <span>{tool}</span>
                        {userTools.length > 0 && !hasTool && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 ml-auto">
                            Need
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

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
        </div>

        {userId && (
          <div className="pt-4 border-t">
            {isInCookbook ? (
              <Button variant="secondary" disabled className="w-full gap-2">
                <Check className="h-4 w-4" />
                In My Cookbook
              </Button>
            ) : (
              <Button onClick={addToCookbook} disabled={isSaving} className="w-full gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
                Add to My Cookbook
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
