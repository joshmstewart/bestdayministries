import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Sparkles, Loader2, RefreshCw, Wrench, BookOpen, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { RecipeExpansionTips } from "./RecipeExpansionTips";
import { RecipeIngredientSelector } from "./RecipeIngredientSelector";
import { RecipeToolsSelector } from "./RecipeToolsSelector";
import { RecipeSuggestions, RecipeSuggestion } from "./RecipeSuggestions";
import { RecipeDisplay } from "./RecipeDisplay";
import { InventorySummaryBar } from "./InventorySummaryBar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RecipeMakerWizardProps {
  userId: string;
}

const STEPS = [
  { key: "setup", title: "What Do You Have?", description: "Select your ingredients and kitchen tools - we'll remember them!" },
  { key: "suggestions", title: "Pick a Recipe", description: "Choose from recipes you can make with your tools" },
  { key: "recipe", title: "Let's Make It!", description: "Follow along step by step" },
];

export const RecipeMakerWizard = ({ userId }: RecipeMakerWizardProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
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
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true); // Start expanded for first-time users

  // Load saved ingredients and tools on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const [ingredientsRes, toolsRes] = await Promise.all([
          supabase
            .from("user_recipe_ingredients")
            .select("ingredients")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("user_recipe_tools")
            .select("tools")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (ingredientsRes.data?.ingredients) {
          setIngredients(ingredientsRes.data.ingredients);
        }
        if (toolsRes.data?.tools) {
          setTools(toolsRes.data.tools);
        }
        
        // Collapse tools section if user already has tools saved (returning user)
        if (toolsRes.data?.tools?.length > 0) {
          setIsToolsExpanded(false);
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadSavedData();
  }, [userId]);

  // Save ingredients whenever they change (debounced)
  const saveIngredients = useCallback(async (newIngredients: string[]) => {
    setIsSaving(true);
    try {
      await supabase
        .from("user_recipe_ingredients")
        .upsert({
          user_id: userId,
          ingredients: newIngredients,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving ingredients:", error);
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  // Save tools whenever they change (debounced)
  const saveTools = useCallback(async (newTools: string[]) => {
    setIsSaving(true);
    try {
      await supabase
        .from("user_recipe_tools")
        .upsert({
          user_id: userId,
          tools: newTools,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving tools:", error);
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  // Debounced save effects
  useEffect(() => {
    if (isLoadingData) return;
    const timeout = setTimeout(() => saveIngredients(ingredients), 500);
    return () => clearTimeout(timeout);
  }, [ingredients, isLoadingData, saveIngredients]);

  useEffect(() => {
    if (isLoadingData) return;
    const timeout = setTimeout(() => saveTools(tools), 500);
    return () => clearTimeout(timeout);
  }, [tools, isLoadingData, saveTools]);

  const generateSuggestions = async () => {
    if (ingredients.length === 0) {
      toast({
        title: "Add some ingredients first!",
        description: "Tell us what you have to work with",
        variant: "destructive",
      });
      return;
    }

    if (tools.length === 0) {
      toast({
        title: "Select your kitchen tools",
        description: "We need to know what equipment you have",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe-suggestions", {
        body: { ingredients, tools },
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
    // Keep ingredients - user will just remove what they don't have
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
          <div className="flex items-center gap-2">
            <Link to="/games/recipe-gallery">
              <Button variant="outline" size="sm" className="gap-1">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">My Cookbook</span>
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-muted-foreground mt-2">{currentStepData.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {currentStep === 0 && (
          <div className="space-y-6">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading your saved data...</p>
              </div>
            ) : (
              <>
                {/* Tools Summary Bar - collapsible, collapsed by default for returning users */}
                <div className="space-y-2">
                  <InventorySummaryBar
                    ingredients={[]}
                    tools={tools}
                    isExpanded={isToolsExpanded}
                    onToggleExpand={() => setIsToolsExpanded(prev => !prev)}
                    title="My Kitchen Tools"
                    showIngredients={false}
                  />
                  
                  <Collapsible open={isToolsExpanded} onOpenChange={setIsToolsExpanded}>
                    <CollapsibleContent>
                      <RecipeToolsSelector
                        selectedTools={tools}
                        onToggle={(name) => {
                          setTools(prev =>
                            prev.includes(name)
                              ? prev.filter(t => t !== name)
                              : [...prev, name]
                          );
                        }}
                        isSaving={isSaving}
                        lastSaved={lastSaved}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>


                {/* Ingredients Section - always expanded */}
                <div className="space-y-3">
                  <RecipeIngredientSelector 
                    selectedIngredients={ingredients} 
                    onToggle={(name) => {
                      setIngredients(prev => 
                        prev.includes(name) 
                          ? prev.filter(i => i !== name)
                          : [...prev, name]
                      );
                    }}
                    isSaving={isSaving}
                    lastSaved={lastSaved}
                  />
                </div>

                {/* Expansion Tips - always visible */}
                <RecipeExpansionTips ingredients={ingredients} tools={tools} userId={userId} />
              </>
            )}
            
            <Button
              onClick={generateSuggestions}
              disabled={isLoadingSuggestions || ingredients.length === 0 || tools.length === 0 || isLoadingData}
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
            
            {(ingredients.length === 0 || tools.length === 0) && !isLoadingData && (
              <p className="text-xs text-center text-muted-foreground">
                {ingredients.length === 0 && tools.length === 0 
                  ? "Select ingredients and kitchen tools to get started"
                  : ingredients.length === 0 
                    ? "Select some ingredients first"
                    : "Select your kitchen tools so we know what recipes you can make"}
              </p>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <RecipeSuggestions
              suggestions={suggestions}
              onSelect={selectRecipe}
            />
            
            {/* Shopping Tips - same as on setup page */}
            <RecipeExpansionTips 
              ingredients={ingredients} 
              tools={tools} 
              userId={userId}
              onIngredientAdded={(name) => {
                setIngredients(prev => [...prev, name]);
              }}
              onToolAdded={(name) => {
                setTools(prev => [...prev, name]);
              }}
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
              <RecipeDisplay recipe={fullRecipe} userId={userId} />
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
