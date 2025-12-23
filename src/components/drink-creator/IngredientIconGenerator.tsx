import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wand2, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
}

interface IngredientIconGeneratorProps {
  ingredients: Ingredient[];
  onComplete: () => void;
}

export const IngredientIconGenerator = ({
  ingredients,
  onComplete,
}: IngredientIconGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentIngredient, setCurrentIngredient] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  const ingredientsWithoutIcons = ingredients.filter((i) => !i.image_url);

  const generateAllIcons = async () => {
    if (ingredientsWithoutIcons.length === 0) {
      toast.info("All ingredients already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setCompleted([]);

    const total = ingredientsWithoutIcons.length;
    let successCount = 0;

    for (let i = 0; i < ingredientsWithoutIcons.length; i++) {
      const ingredient = ingredientsWithoutIcons[i];
      setCurrentIngredient(ingredient.name);

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

        successCount++;
        setCompleted((prev) => [...prev, ingredient.id]);
      } catch (error) {
        console.error(`Failed to generate icon for ${ingredient.name}:`, error);
        toast.error(`Failed to generate icon for ${ingredient.name}`);
      }

      setProgress(((i + 1) / total) * 100);

      // Small delay between requests to avoid rate limiting
      if (i < ingredientsWithoutIcons.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setGenerating(false);
    setCurrentIngredient(null);

    if (successCount === total) {
      toast.success(`Generated ${successCount} ingredient icons!`);
    } else {
      toast.warning(
        `Generated ${successCount}/${total} icons. Some failed.`
      );
    }

    onComplete();
  };

  if (ingredientsWithoutIcons.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-green-500" />
        All ingredients have icons
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Generate Ingredient Icons</h3>
          <p className="text-sm text-muted-foreground">
            {ingredientsWithoutIcons.length} ingredients need AI-generated icons
          </p>
        </div>
        <Button
          onClick={generateAllIcons}
          disabled={generating}
          variant="outline"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Missing Icons
            </>
          )}
        </Button>
      </div>

      {generating && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-center text-muted-foreground">
            Generating: {currentIngredient}...
          </p>
        </div>
      )}

      {completed.length > 0 && !generating && (
        <p className="text-sm text-green-600">
          Successfully generated {completed.length} icons
        </p>
      )}
    </div>
  );
};
