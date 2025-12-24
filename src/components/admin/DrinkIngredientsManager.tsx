import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, RefreshCw, Check, ImageOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Ingredient = Database["public"]["Tables"]["drink_ingredients"]["Row"];

export const DrinkIngredientsManager = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIngredient, setCurrentIngredient] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("drink_ingredients")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      toast.error("Failed to load ingredients");
      console.error(error);
    } else {
      // Add cache-busting timestamp to image URLs to force browser to fetch fresh images
      const ingredientsWithCacheBust = (data || []).map(ingredient => ({
        ...ingredient,
        image_url: ingredient.image_url 
          ? `${ingredient.image_url}?t=${Date.now()}`
          : null
      }));
      setIngredients(ingredientsWithCacheBust);
    }
    setLoading(false);
  };

  const generateIcon = async (
    ingredient: Ingredient
  ): Promise<{ ok: boolean; imageUrl?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-ingredient-icon",
        {
          body: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
          },
        }
      );

      if (error) throw error;

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${ingredient.name}:`, error);
      return { ok: false };
    }
  };

  const handleGenerateMissing = async () => {
    const missingIcons = ingredients.filter((i) => !i.image_url);
    
    if (missingIcons.length === 0) {
      toast.info("All ingredients already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);

    let successCount = 0;
    const total = missingIcons.length;

    for (let i = 0; i < missingIcons.length; i++) {
      const ingredient = missingIcons[i];
      setCurrentIngredient(ingredient.name);

      const success = await generateIcon(ingredient);
      if (success) successCount++;

      setProgress(((i + 1) / total) * 100);

      // Small delay between requests
      if (i < missingIcons.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setGenerating(false);
    setCurrentIngredient(null);

    if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. Some failed.`);
    }

    await loadIngredients();
  };

  const handleRegenerate = async (ingredient: Ingredient) => {
    setRegeneratingId(ingredient.id);

    const result = await generateIcon(ingredient);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setIngredients((prev) =>
          prev.map((i) => (i.id === ingredient.id ? { ...i, image_url: cacheBustedUrl } : i))
        );
      }
      toast.success(`Regenerated icon for ${ingredient.name}`);
    } else {
      toast.error(`Failed to regenerate icon for ${ingredient.name}`);
    }

    setRegeneratingId(null);
  };

  const missingCount = ingredients.filter((i) => !i.image_url).length;

  // Group ingredients by category
  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, Ingredient[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <Card>
        <CardHeader>
          <CardTitle>Drink Creator Ingredients</CardTitle>
          <CardDescription>
            Manage ingredient icons for the Drink Creator game. 
            {missingCount > 0 
              ? ` ${missingCount} ingredients need icons.`
              : " All ingredients have icons."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateMissing}
              disabled={generating || missingCount === 0}
              variant={missingCount > 0 ? "default" : "outline"}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Missing Icons ({missingCount})
                </>
              )}
            </Button>

            {missingCount === 0 && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                All icons generated
              </span>
            )}
          </div>

          {generating && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Generating: {currentIngredient}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ingredients by category */}
      {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg capitalize">{category}</CardTitle>
            <CardDescription>
              {categoryIngredients.filter((i) => i.image_url).length}/{categoryIngredients.length} have icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="relative group rounded-none border-2 border-border overflow-hidden aspect-square"
                >
                  {ingredient.image_url ? (
                    <img
                      src={ingredient.image_url}
                      alt={ingredient.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                    <span className="text-xs text-white font-medium">{ingredient.name}</span>
                  </div>

                  {/* Regenerate button on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegenerate(ingredient)}
                      disabled={regeneratingId === ingredient.id || generating}
                    >
                      {regeneratingId === ingredient.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
