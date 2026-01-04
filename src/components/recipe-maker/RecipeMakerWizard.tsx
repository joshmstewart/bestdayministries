import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { IngredientInput } from "./IngredientInput";
import { RecipeSuggestions, RecipeSuggestion } from "./RecipeSuggestions";
import { RecipeDisplay } from "./RecipeDisplay";

interface RecipeMakerWizardProps {
  userId: string;
}

const STEPS = [
  { key: "ingredients", title: "What Do You Have?", description: "List the ingredients you have available (or pick fun ones!)" },
  { key: "suggestions", title: "Pick a Recipe", description: "Choose from these easy recipes you can make" },
  { key: "recipe", title: "Let's Make It!", description: "Follow along step by step" },
];

export const RecipeMakerWizard = ({ userId }: RecipeMakerWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);
  const [fullRecipe, setFullRecipe] = useState<{
    title: string;
    description: string;
    ingredients: string[];
    steps: string[];
    tips: string[];
    imageUrl?: string;
  } | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  const generateSuggestions = async () => {
    if (ingredients.length === 0) {
      toast({
        title: "Add some ingredients first!",
        description: "Tell us what you have to work with",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe-suggestions", {
        body: { ingredients },
      });

      if (error) throw error;

      if (data?.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setCurrentStep(1);
      } else {
        toast({
          title: "Couldn't find recipes",
          description: "Try adding more ingredients or different ones",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Error getting suggestions",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const selectRecipe = async (recipe: RecipeSuggestion) => {
    setSelectedRecipe(recipe);
    setIsLoadingRecipe(true);
    setCurrentStep(2);

    try {
      const { data, error } = await supabase.functions.invoke("generate-full-recipe", {
        body: { 
          recipeName: recipe.name,
          recipeDescription: recipe.description,
          availableIngredients: ingredients,
        },
      });

      if (error) throw error;

      if (data?.recipe) {
        setFullRecipe(data.recipe);
      }
    } catch (error: any) {
      console.error("Error generating recipe:", error);
      toast({
        title: "Error loading recipe",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setIngredients([]);
    setSuggestions([]);
    setSelectedRecipe(null);
    setFullRecipe(null);
  };

  const goBack = () => {
    if (currentStep === 2) {
      setSelectedRecipe(null);
      setFullRecipe(null);
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setSuggestions([]);
      setCurrentStep(0);
    }
  };

  const currentStepData = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

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
        {currentStep === 0 && (
          <div className="space-y-6">
            <IngredientInput 
              ingredients={ingredients} 
              onChange={setIngredients} 
            />
            
            <Button
              onClick={generateSuggestions}
              disabled={isLoadingSuggestions || ingredients.length === 0}
              className="w-full"
              size="lg"
            >
              {isLoadingSuggestions ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Finding recipes...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Find Recipes I Can Make
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <RecipeSuggestions
              suggestions={suggestions}
              onSelect={selectRecipe}
            />
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Change Ingredients
              </Button>
              <Button 
                variant="outline" 
                onClick={generateSuggestions}
                disabled={isLoadingSuggestions}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                More Ideas
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            {isLoadingRecipe ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground text-center">
                  Creating your recipe and picture...
                </p>
              </div>
            ) : fullRecipe ? (
              <RecipeDisplay recipe={fullRecipe} />
            ) : null}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Pick Different Recipe
              </Button>
              <Button onClick={resetWizard} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-1" />
                Start Over
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
