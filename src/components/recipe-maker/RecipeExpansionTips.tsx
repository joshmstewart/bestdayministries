import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2, ChefHat, UtensilsCrossed, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface IngredientTip {
  name: string;
  reason: string;
  emoji: string;
}

interface ToolTip {
  name: string;
  reason: string;
  emoji: string;
  estimatedCost: string;
}

interface RecipeExpansionTipsProps {
  ingredients: string[];
  tools: string[];
  userId?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function RecipeExpansionTips({ ingredients, tools, userId, showTitle = false, compact = false }: RecipeExpansionTipsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ingredientTips, setIngredientTips] = useState<IngredientTip[]>([]);
  const [toolTips, setToolTips] = useState<ToolTip[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Track what ingredients/tools we last generated for
  const lastGeneratedFor = useRef<string>("");
  const isInitialLoad = useRef(true);

  const generateTips = useCallback(async (silent = false) => {
    // Don't generate if no items selected
    if (ingredients.length === 0 && tools.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-expansion-tips', {
        body: { ingredients, tools }
      });

      if (error) throw error;

      const newIngredientTips = data.ingredientTips || [];
      const newToolTips = data.toolTips || [];

      setIngredientTips(newIngredientTips);
      setToolTips(newToolTips);
      setHasLoaded(true);
      setLastGenerated(new Date());
      
      // Track what we generated for
      lastGeneratedFor.current = JSON.stringify({ ingredients: [...ingredients].sort(), tools: [...tools].sort() });

      // Save to database if user is logged in
      if (userId) {
        await supabase
          .from("saved_shopping_tips")
          .upsert({
            user_id: userId,
            ingredient_tips: newIngredientTips,
            tool_tips: newToolTips,
            last_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });
      }
    } catch (error) {
      console.error("Error getting expansion tips:", error);
      if (!silent) {
        toast({
          title: "Couldn't get tips",
          description: "Try again in a moment!",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [ingredients, tools, userId, toast]);

  // Load saved tips on mount if userId provided
  useEffect(() => {
    if (!userId) return;
    
    const loadSavedTips = async () => {
      const { data, error } = await supabase
        .from("saved_shopping_tips")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setIngredientTips((data.ingredient_tips as unknown as IngredientTip[]) || []);
        setToolTips((data.tool_tips as unknown as ToolTip[]) || []);
        setLastGenerated(new Date(data.last_generated_at));
        setHasLoaded(true);
        isInitialLoad.current = false;
      } else if (ingredients.length > 0 || tools.length > 0) {
        // No saved tips, auto-generate if user has items
        generateTips(true);
        isInitialLoad.current = false;
      }
    };

    loadSavedTips();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-regenerate when ingredients/tools change significantly
  useEffect(() => {
    // Skip on initial mount
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Don't auto-generate if nothing is selected
    if (ingredients.length === 0 && tools.length === 0) {
      return;
    }

    // Check if selection changed significantly
    const currentSelection = JSON.stringify({ ingredients: [...ingredients].sort(), tools: [...tools].sort() });
    if (currentSelection === lastGeneratedFor.current) {
      return;
    }

    // Debounce the regeneration
    const timeout = setTimeout(() => {
      generateTips(true);
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeout);
  }, [ingredients, tools, generateTips]);

  // Show loading state while auto-generating
  if (isLoading && !hasLoaded) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Finding shopping tips for you...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show prompt only if no items selected
  if (!hasLoaded && ingredients.length === 0 && tools.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted/50 bg-muted/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Lightbulb className="h-6 w-6 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Select some items above to get shopping tips!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasTips = ingredientTips.length > 0 || toolTips.length > 0;

  if (hasLoaded && !hasTips) {
    return (
      <Card className="border-dashed border-2 border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <span className="text-2xl">🎉</span>
            <p className="text-sm font-medium text-green-700">
              You're all set! You have great ingredients and tools!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Shopping Tips
          </CardTitle>
          {lastGenerated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastGenerated.toLocaleDateString()}
            </p>
          )}
        </CardHeader>
      )}
      {!showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Shopping Tips
            </CardTitle>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {ingredientTips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              Ingredients to Consider
            </div>
            <div className="grid gap-2">
              {ingredientTips.map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg bg-background/50"
                >
                  <span className="text-xl">{tip.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{tip.name}</p>
                    <p className="text-xs text-muted-foreground">{tip.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {toolTips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UtensilsCrossed className="h-4 w-4" />
              Budget-Friendly Tools
            </div>
            <div className="grid gap-2">
              {toolTips.map((tip, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg bg-background/50"
                >
                  <span className="text-xl">{tip.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{tip.name}</p>
                      <span className="text-xs text-primary font-medium">{tip.estimatedCost}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tip.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => generateTips(false)}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="w-full text-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Get New Tips
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
