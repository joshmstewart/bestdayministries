import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Share2 } from "lucide-react";
import { IngredientSelector } from "./IngredientSelector";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  color_hint: string | null;
  display_order: number;
}

interface DrinkCreatorWizardProps {
  userId: string;
}

const STEPS = [
  { key: "base", title: "Choose Your Base", description: "Start with a delicious foundation" },
  { key: "flavor", title: "Add Flavors", description: "Make it uniquely yours" },
  { key: "topping", title: "Pick Toppings", description: "The finishing touches" },
  { key: "extra", title: "Any Extras?", description: "Customize even more" },
  { key: "generate", title: "Create Your Drink!", description: "Watch the magic happen" },
];

export const DrinkCreatorWizard = ({ userId }: DrinkCreatorWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, string[]>>({
    base: [],
    flavor: [],
    topping: [],
    extra: [],
  });
  const [drinkName, setDrinkName] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDrinkId, setSavedDrinkId] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("drink_ingredients")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      toast({
        title: "Error loading ingredients",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIngredients(data || []);
  };

  const handleIngredientToggle = (category: string, ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const current = prev[category] || [];
      const isSelected = current.includes(ingredientId);

      // For base, only allow one selection
      if (category === "base") {
        return { ...prev, [category]: isSelected ? [] : [ingredientId] };
      }

      // For others, allow multiple
      if (isSelected) {
        return { ...prev, [category]: current.filter((id) => id !== ingredientId) };
      }
      return { ...prev, [category]: [...current, ingredientId] };
    });
  };

  const getSelectedIngredientNames = () => {
    const allSelectedIds = Object.values(selectedIngredients).flat();
    return ingredients
      .filter((ing) => allSelectedIds.includes(ing.id))
      .map((ing) => ({ name: ing.name, color: ing.color_hint }));
  };

  const generateDrinkName = async () => {
    const selected = getSelectedIngredientNames();
    if (selected.length === 0) return;

    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-drink-name", {
        body: { ingredients: selected },
      });

      if (error) throw error;
      if (data?.name) {
        setDrinkName(data.name);
      }
    } catch (error: any) {
      console.error("Error generating name:", error);
      // Fallback name if generation fails
      const mainIngredient = selected[0]?.name || "Custom";
      setDrinkName(`${mainIngredient} Delight`);
    } finally {
      setIsGeneratingName(false);
    }
  };

  const generateDrinkImage = async () => {
    const selected = getSelectedIngredientNames();
    if (selected.length === 0) {
      toast({
        title: "No ingredients selected",
        description: "Please select at least a base ingredient",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-drink-image", {
        body: { ingredients: selected, drinkName },
      });

      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (error: any) {
      toast({
        title: "Error generating image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 3) {
      // Moving to final step - generate name first
      setCurrentStep(4);
      await generateDrinkName();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const saveDrink = async () => {
    if (!drinkName.trim()) {
      toast({
        title: "Name required",
        description: "Please give your drink a name",
        variant: "destructive",
      });
      return;
    }

    if (!generatedImage) {
      toast({
        title: "Generate image first",
        description: "Please generate an image before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const allIngredientIds = Object.values(selectedIngredients).flat();

      const { data, error } = await supabase
        .from("custom_drinks")
        .insert({
          creator_id: userId,
          name: drinkName,
          ingredients: allIngredientIds,
          generated_image_url: generatedImage,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedDrinkId(data.id);
      toast({
        title: "Drink saved!",
        description: "Your creation has been shared with the community",
      });
    } catch (error: any) {
      toast({
        title: "Error saving drink",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedIngredients({ base: [], flavor: [], topping: [], extra: [] });
    setDrinkName("");
    setGeneratedImage(null);
    setSavedDrinkId(null);
  };

  const currentStepData = STEPS[currentStep];
  const stepCategory = currentStepData.key;
  const categoryIngredients = ingredients.filter((ing) => ing.category === stepCategory);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    if (currentStep === 0) {
      return selectedIngredients.base.length > 0;
    }
    return true;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-muted-foreground mt-2">{currentStepData.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {currentStep < 4 ? (
          <IngredientSelector
            ingredients={categoryIngredients}
            selected={selectedIngredients[stepCategory] || []}
            onToggle={(id) => handleIngredientToggle(stepCategory, id)}
            multiSelect={stepCategory !== "base"}
          />
        ) : (
          <div className="space-y-6">
            {/* Summary of selections */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2">Your Selections:</h3>
              <div className="flex flex-wrap gap-2">
                {getSelectedIngredientNames().map((ing, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
                  >
                    {ing.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Name display/edit */}
            <div className="space-y-2">
              <Label htmlFor="drinkName">Your Drink Name</Label>
              {isGeneratingName ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground">Creating a perfect name...</span>
                </div>
              ) : (
                <Input
                  id="drinkName"
                  placeholder="e.g., Sunset Latte"
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  disabled={!!savedDrinkId}
                  className="text-lg font-medium"
                />
              )}
              <p className="text-xs text-muted-foreground">
                This name will inspire the atmosphere of your drink image!
              </p>
            </div>

            {/* Generate button */}
            {!generatedImage && (
              <Button
                onClick={generateDrinkImage}
                disabled={isGenerating || isGeneratingName || !drinkName}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating your drink...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Drink Image
                  </>
                )}
              </Button>
            )}

            {/* Generated image preview */}
            {generatedImage && (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-xl overflow-hidden border-4 border-primary/30 shadow-lg">
                  <img
                    src={generatedImage}
                    alt={drinkName || "Your custom drink"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {!savedDrinkId ? (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={generateDrinkImage}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Regenerate"
                      )}
                    </Button>
                    <Button
                      onClick={saveDrink}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          Save & Share
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-green-600 font-medium">
                      ✨ Your drink has been shared with the community!
                    </p>
                    <Button onClick={resetWizard} variant="outline">
                      Create Another Drink
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={!canProceed()}
            >
              {currentStep === 3 ? "Create!" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
