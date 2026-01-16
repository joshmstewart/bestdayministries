import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Share2 } from "lucide-react";
import { IngredientSelector } from "./IngredientSelector";
import { VibeSelector, Vibe, getVibeById } from "./VibeSelector";
import { TextToSpeech } from "@/components/TextToSpeech";
import { awardCoinReward } from "@/utils/awardCoinReward";

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
  { key: "base", title: "Choose Your Base", description: "Pick your drink and customize it" },
  { key: "flavor", title: "Add Flavors", description: "Make it uniquely yours" },
  { key: "topping", title: "Pick Toppings", description: "The finishing touches" },
  { key: "vibe", title: "Set the Vibe", description: "Optional: choose an atmosphere" },
  { key: "generate", title: "Create Your Drink!", description: "Watch the magic happen" },
];

export const DrinkCreatorWizard = ({ userId }: DrinkCreatorWizardProps) => {
  const { toast } = useToast();
  const wizardRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, string[]>>({
    base: [],
    modifier: [],
    flavor: [],
    topping: [],
  });
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [drinkName, setDrinkName] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDrinkId, setSavedDrinkId] = useState<string | null>(null);

  // Scroll behavior: top of page for first step, tabs section for subsequent steps
  useEffect(() => {
    if (currentStep === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const tabsElement = document.getElementById('drink-creator-tabs');
      if (tabsElement) {
        const navbarHeight = 96; // pt-24 = 96px
        const elementPosition = tabsElement.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: elementPosition - navbarHeight - 16, behavior: 'smooth' });
      }
    }
  }, [currentStep]);

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

      // For others (including modifiers), allow multiple
      if (isSelected) {
        return { ...prev, [category]: current.filter((id) => id !== ingredientId) };
      }
      return { ...prev, [category]: [...current, ingredientId] };
    });
  };

  const getSelectedIngredientNames = () => {
    const allSelectedIds = [
      ...selectedIngredients.base,
      ...selectedIngredients.modifier,
      ...selectedIngredients.flavor,
      ...selectedIngredients.topping,
    ];
    return ingredients
      .filter((ing) => allSelectedIds.includes(ing.id))
      .map((ing) => ({ name: ing.name, color: ing.color_hint }));
  };

  const fetchSelectedVibe = async (): Promise<Vibe | null> => {
    if (!selectedVibe) return null;
    return await getVibeById(selectedVibe);
  };

  const generateDrinkName = async () => {
    const selected = getSelectedIngredientNames();
    if (selected.length === 0) return;

    const vibe = await fetchSelectedVibe();

    setIsGeneratingName(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-drink-name", {
        body: { ingredients: selected, vibe: vibe ? { name: vibe.name, description: vibe.description } : null },
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

    const vibe = await fetchSelectedVibe();

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-drink-image", {
        body: { 
          ingredients: selected, 
          drinkName,
          vibe: vibe ? { name: vibe.name, atmosphereHint: vibe.atmosphere_hint } : null
        },
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
      // Moving from vibe to generate step - generate name first
      setCurrentStep(4);
      await generateDrinkName();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const generateDescription = async (): Promise<string | null> => {
    const selected = getSelectedIngredientNames();
    const vibe = await fetchSelectedVibe();

    try {
      const { data, error } = await supabase.functions.invoke("generate-drink-description", {
        body: {
          drinkName,
          ingredients: selected,
          vibe: vibe ? { name: vibe.name, description: vibe.description } : null,
        },
      });

      if (error) throw error;
      return data?.description || null;
    } catch (error) {
      console.error("Error generating description:", error);
      return null;
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

      // Generate description before saving
      const description = await generateDescription();

      const { data, error } = await supabase
        .from("custom_drinks")
        .insert({
          creator_id: userId,
          name: drinkName,
          description,
          ingredients: allIngredientIds,
          generated_image_url: generatedImage,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Award coins for creating a drink
      await awardCoinReward(userId, 'drink_lab_create', 'Created a drink in Drink Lab');

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
    setSelectedIngredients({ base: [], modifier: [], flavor: [], topping: [] });
    setSelectedVibe(null);
    setDrinkName("");
    setGeneratedImage(null);
    setSavedDrinkId(null);
  };

  const currentStepData = STEPS[currentStep];
  const stepCategory = currentStepData.key;
  
  // For base step, separate main bases from modifiers
  const baseIngredients = ingredients.filter((ing) => ing.category === "base" && ing.display_order < 100);
  const modifierIngredients = ingredients.filter((ing) => ing.category === "base" && ing.display_order >= 100);
  const categoryIngredients = ingredients.filter((ing) => ing.category === stepCategory);
  
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Build TTS text for current step
  const stepTtsText = useMemo(() => {
    const stepIntro = `Step ${currentStep + 1} of ${STEPS.length}. ${currentStepData.title}. ${currentStepData.description}.`;
    
    if (currentStep === 0) {
      const baseNames = baseIngredients.map(ing => ing.name).join(", ");
      const modifierNames = modifierIngredients.map(ing => ing.name).join(", ");
      const selectedBaseNames = ingredients
        .filter(ing => selectedIngredients.base.includes(ing.id))
        .map(ing => ing.name)
        .join(", ");
      const selectedModNames = ingredients
        .filter(ing => selectedIngredients.modifier.includes(ing.id))
        .map(ing => ing.name)
        .join(", ");
      
      let text = stepIntro + ` Available drinks: ${baseNames || "none"}.`;
      if (modifierNames) {
        text += ` Optional customizations: ${modifierNames}.`;
      }
      if (selectedBaseNames) {
        text += ` Selected drink: ${selectedBaseNames}.`;
      }
      if (selectedModNames) {
        text += ` Selected customizations: ${selectedModNames}.`;
      }
      return text;
    } else if (currentStep < 3) {
      const categoryNames = categoryIngredients.map(ing => ing.name).join(", ");
      const selectedNames = ingredients
        .filter(ing => (selectedIngredients[stepCategory] || []).includes(ing.id))
        .map(ing => ing.name)
        .join(", ");
      
      let text = stepIntro + ` Available options: ${categoryNames || "none"}.`;
      if (selectedNames) {
        text += ` Selected: ${selectedNames}.`;
      }
      return text;
    } else if (currentStep === 3) {
      return stepIntro + " Choose an optional vibe to set the atmosphere for your drink.";
    } else {
      // Generate step
      const allSelected = getSelectedIngredientNames().map(ing => ing.name).join(", ");
      let text = stepIntro + ` Your selections: ${allSelected || "none"}.`;
      if (drinkName) {
        text += ` Drink name: ${drinkName}.`;
      }
      if (generatedImage) {
        text += " Your drink image has been generated!";
        if (savedDrinkId) {
          text += " Your drink has been saved and shared with the community!";
        }
      }
      return text;
    }
  }, [currentStep, currentStepData, baseIngredients, modifierIngredients, categoryIngredients, selectedIngredients, stepCategory, ingredients, drinkName, generatedImage, savedDrinkId]);

  const canProceed = () => {
    if (currentStep === 0) {
      return selectedIngredients.base.length > 0;
    }
    return true;
  };

  return (
    <div ref={wizardRef}>
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
            <TextToSpeech text={stepTtsText} size="sm" />
          </div>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-muted-foreground mt-2">{currentStepData.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {currentStep === 0 ? (
          // Base step: show main bases + modifiers
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Pick Your Drink</h3>
              <IngredientSelector
                ingredients={baseIngredients}
                selected={selectedIngredients.base}
                onToggle={(id) => handleIngredientToggle("base", id)}
                multiSelect={false}
              />
            </div>
            
            {modifierIngredients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Customize It</h3>
                <p className="text-sm text-muted-foreground mb-3">Optional: add milk alternatives, ice preferences & more</p>
                <IngredientSelector
                  ingredients={modifierIngredients}
                  selected={selectedIngredients.modifier}
                  onToggle={(id) => handleIngredientToggle("modifier", id)}
                  multiSelect={true}
                />
              </div>
            )}
          </div>
        ) : currentStep < 3 ? (
          <IngredientSelector
            ingredients={categoryIngredients}
            selected={selectedIngredients[stepCategory] || []}
            onToggle={(id) => handleIngredientToggle(stepCategory, id)}
            multiSelect={true}
          />
        ) : currentStep === 3 ? (
          <VibeSelector selected={selectedVibe} onSelect={setSelectedVibe} />
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
              {currentStep === 3 ? (selectedVibe ? "Create with Vibe!" : "Skip & Create!") : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
