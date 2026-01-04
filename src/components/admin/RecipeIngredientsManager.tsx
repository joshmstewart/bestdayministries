import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, RefreshCw, Check, ImageOff, AlertTriangle, X, Copy } from "lucide-react";

interface RecipeIngredient {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface GenerationError {
  ingredientName: string;
  error: string;
}

export const RecipeIngredientsManager = () => {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIngredient, setCurrentIngredient] = useState<string | null>(null);
  const [errors, setErrors] = useState<GenerationError[]>([]);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      toast.error("Failed to load ingredients");
      console.error(error);
    } else {
      // Add cache-busting timestamp to image URLs
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
    ingredient: RecipeIngredient
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-recipe-ingredient-icon",
        {
          body: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
          },
        }
      );

      if (error) {
        console.error(`Failed to generate icon for ${ingredient.name}:`, error);
        return { ok: false, errorMessage: error.message || String(error) };
      }
      
      // Check if the response contains an error
      if ((data as any)?.error) {
        return { ok: false, errorMessage: (data as any).error };
      }

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${ingredient.name}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errorMessage: message };
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
    setErrors([]); // Clear previous errors

    let successCount = 0;
    const total = missingIcons.length;
    const newErrors: GenerationError[] = [];
    const BATCH_SIZE = 5;

    // Process in batches of 5
    for (let i = 0; i < missingIcons.length; i += BATCH_SIZE) {
      const batch = missingIcons.slice(i, i + BATCH_SIZE);
      setCurrentIngredient(`${batch.map(b => b.name).join(", ")}`);

      // Run batch in parallel
      const results = await Promise.all(
        batch.map(async (ingredient) => {
          const result = await generateIcon(ingredient);
          return { ingredient, result };
        })
      );

      // Process results
      for (const { ingredient, result } of results) {
        if (result.ok) {
          successCount++;
        } else {
          newErrors.push({
            ingredientName: ingredient.name,
            error: result.errorMessage || "Unknown error",
          });
        }
      }

      setProgress(((Math.min(i + BATCH_SIZE, total)) / total) * 100);

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < missingIcons.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setGenerating(false);
    setCurrentIngredient(null);
    setErrors(newErrors);

    if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. ${newErrors.length} failed - see errors below.`);
    }

    await loadIngredients();
  };

  const handleRegenerate = async (ingredient: RecipeIngredient) => {
    setRegeneratingId(ingredient.id);

    const result = await generateIcon(ingredient);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setIngredients((prev) =>
          prev.map((i) => (i.id === ingredient.id ? { ...i, image_url: cacheBustedUrl } : i))
        );
      }
      // Remove from errors if it was there
      setErrors((prev) => prev.filter((e) => e.ingredientName !== ingredient.name));
      toast.success(`Regenerated icon for ${ingredient.name}`);
    } else {
      // Add to errors for persistent display
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.ingredientName !== ingredient.name);
        return [...filtered, { ingredientName: ingredient.name, error: result.errorMessage || "Unknown error" }];
      });
      toast.error(`Failed to regenerate icon for ${ingredient.name}`);
    }

    setRegeneratingId(null);
  };

  const handleCopyErrors = () => {
    const errorText = errors
      .map((e) => `${e.ingredientName}: ${e.error}`)
      .join("\n");
    navigator.clipboard.writeText(errorText);
    toast.success("Errors copied to clipboard");
  };

  const handleDismissErrors = () => {
    setErrors([]);
  };

  const missingCount = ingredients.filter((i) => !i.image_url).length;

  // Group ingredients by category
  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, RecipeIngredient[]>);

  // Category display names
  const categoryLabels: Record<string, string> = {
    protein: "🥩 Proteins",
    dairy: "🧀 Dairy",
    grains: "🍞 Bread & Grains",
    fruits: "🍎 Fruits",
    vegetables: "🥕 Vegetables",
    condiments: "🍯 Condiments & Spreads",
    pantry: "🧂 Pantry Staples",
  };

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
          <CardTitle>Recipe Maker Ingredients</CardTitle>
          <CardDescription>
            Manage ingredient icons for the Recipe Maker game. 
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

      {/* Persistent Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{errors.length} Generation Error{errors.length > 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyErrors}
                className="h-7 px-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissErrors}
                className="h-7 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
              {errors.map((err, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 rounded">
                  <span className="font-semibold">{err.ingredientName}:</span>{" "}
                  <span className="break-all">{err.error}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ingredients by category */}
      {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
            <CardDescription>
              {categoryIngredients.filter((i) => i.image_url).length}/{categoryIngredients.length} have icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="relative group rounded-lg border-2 border-border overflow-hidden aspect-square"
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
