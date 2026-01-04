import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2, ChefHat, UtensilsCrossed, RefreshCw, Plus, ShoppingCart, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Check if a string is a valid emoji (short and contains emoji characters)
const isValidEmoji = (str: string): boolean => {
  if (!str || str.length > 10) return false; // Emojis are short, text descriptions are long
  // Check if it contains emoji-like characters (non-ASCII that aren't regular letters)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
  return emojiRegex.test(str);
};

// Get fallback emoji for ingredients
const getIngredientFallbackEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('egg')) return '🥚';
  if (lower.includes('butter')) return '🧈';
  if (lower.includes('cheese')) return '🧀';
  if (lower.includes('bread')) return '🍞';
  if (lower.includes('rice')) return '🍚';
  if (lower.includes('pasta') || lower.includes('noodle')) return '🍝';
  if (lower.includes('milk')) return '🥛';
  if (lower.includes('chicken')) return '🍗';
  if (lower.includes('beef') || lower.includes('meat')) return '🥩';
  if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
  if (lower.includes('tomato')) return '🍅';
  if (lower.includes('onion')) return '🧅';
  if (lower.includes('garlic')) return '🧄';
  if (lower.includes('carrot')) return '🥕';
  if (lower.includes('potato')) return '🥔';
  if (lower.includes('apple')) return '🍎';
  if (lower.includes('banana')) return '🍌';
  if (lower.includes('lemon')) return '🍋';
  if (lower.includes('salt') || lower.includes('pepper') || lower.includes('spice')) return '🧂';
  if (lower.includes('oil')) return '🫒';
  if (lower.includes('flour')) return '🌾';
  if (lower.includes('sugar')) return '🍬';
  return '🍴';
};

// Get fallback emoji for tools
const getToolFallbackEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('pan') || lower.includes('skillet')) return '🍳';
  if (lower.includes('pot')) return '🍲';
  if (lower.includes('knife') || lower.includes('cutting')) return '🔪';
  if (lower.includes('spoon')) return '🥄';
  if (lower.includes('fork')) return '🍴';
  if (lower.includes('whisk')) return '🥄';
  if (lower.includes('bowl')) return '🥣';
  if (lower.includes('baking') || lower.includes('sheet') || lower.includes('tray')) return '🍪';
  if (lower.includes('measuring')) return '🥛';
  if (lower.includes('colander') || lower.includes('strainer') || lower.includes('drain')) return '🥡';
  if (lower.includes('grater')) return '🧀';
  if (lower.includes('spatula') || lower.includes('turner')) return '🍳';
  if (lower.includes('tong')) return '🥢';
  if (lower.includes('peeler')) return '🥔';
  if (lower.includes('oven') || lower.includes('mitt')) return '🧤';
  if (lower.includes('timer')) return '⏱️';
  return '🔧';
};
interface IngredientTip {
  name: string;
  reason: string;
  emoji: string;
  unlockedRecipes?: string[];
}

interface ToolTip {
  name: string;
  reason: string;
  emoji: string;
  estimatedCost: string;
  unlockedRecipes?: string[];
}

interface RecipeExpansionTipsProps {
  ingredients: string[];
  tools: string[];
  userId?: string;
  showTitle?: boolean;
  compact?: boolean;
  onIngredientAdded?: (name: string) => void;
  onToolAdded?: (name: string) => void;
}

export function RecipeExpansionTips({ 
  ingredients, 
  tools, 
  userId, 
  showTitle = false, 
  compact = false,
  onIngredientAdded,
  onToolAdded 
}: RecipeExpansionTipsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ingredientTips, setIngredientTips] = useState<IngredientTip[]>([]);
  const [toolTips, setToolTips] = useState<ToolTip[]>([]);
  const [dismissedIngredients, setDismissedIngredients] = useState<string[]>([]);
  const [dismissedTools, setDismissedTools] = useState<string[]>([]);
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
        setDismissedIngredients((data.dismissed_ingredients as string[]) || []);
        setDismissedTools((data.dismissed_tools as string[]) || []);
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

  const addToInventory = async (tip: IngredientTip | ToolTip, type: 'ingredient' | 'tool') => {
    if (!userId) {
      toast({ title: "Please sign in to save items", variant: "destructive" });
      return;
    }

    try {
      if (type === 'ingredient') {
        // Add to user's ingredients
        const { data: existing } = await supabase
          .from("user_recipe_ingredients")
          .select("ingredients")
          .eq("user_id", userId)
          .maybeSingle();

        const currentIngredients = existing?.ingredients || [];
        if (!currentIngredients.includes(tip.name)) {
          await supabase
            .from("user_recipe_ingredients")
            .upsert({
              user_id: userId,
              ingredients: [...currentIngredients, tip.name],
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id" });
        }
        
        // Remove from tips
        setIngredientTips(prev => prev.filter(t => t.name !== tip.name));
        onIngredientAdded?.(tip.name);
        toast({ title: `${tip.name} added to your inventory!` });
      } else {
        // Add to user's tools
        const { data: existing } = await supabase
          .from("user_recipe_tools")
          .select("tools")
          .eq("user_id", userId)
          .maybeSingle();

        const currentTools = existing?.tools || [];
        if (!currentTools.includes(tip.name)) {
          await supabase
            .from("user_recipe_tools")
            .upsert({
              user_id: userId,
              tools: [...currentTools, tip.name],
              updated_at: new Date().toISOString()
            }, { onConflict: "user_id" });
        }
        
        // Remove from tips
        setToolTips(prev => prev.filter(t => t.name !== tip.name));
        onToolAdded?.(tip.name);
        toast({ title: `${tip.name} added to your inventory!` });
      }
    } catch (error) {
      console.error("Error adding to inventory:", error);
      toast({ title: "Couldn't add item", variant: "destructive" });
    }
  };

  const addToShoppingList = async (tip: IngredientTip | ToolTip, type: 'ingredient' | 'tool') => {
    if (!userId) {
      toast({ title: "Please sign in to use shopping list", variant: "destructive" });
      return;
    }

    try {
      await supabase.from("recipe_shopping_list").insert({
        user_id: userId,
        item_name: tip.name,
        item_type: type,
        emoji: tip.emoji,
        reason: tip.reason,
        estimated_cost: type === 'tool' ? (tip as ToolTip).estimatedCost : null
      });

      // Remove from tips
      if (type === 'ingredient') {
        setIngredientTips(prev => prev.filter(t => t.name !== tip.name));
      } else {
        setToolTips(prev => prev.filter(t => t.name !== tip.name));
      }

      toast({ title: `${tip.name} added to shopping list!` });
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      toast({ title: "Couldn't add to list", variant: "destructive" });
    }
  };

  const dismissTip = async (tipName: string, type: 'ingredient' | 'tool') => {
    // Remove from visible tips
    if (type === 'ingredient') {
      setIngredientTips(prev => prev.filter(t => t.name !== tipName));
      setDismissedIngredients(prev => [...prev, tipName]);
    } else {
      setToolTips(prev => prev.filter(t => t.name !== tipName));
      setDismissedTools(prev => [...prev, tipName]);
    }

    // Save dismissed state
    if (userId) {
      try {
        const newDismissed = type === 'ingredient' 
          ? [...dismissedIngredients, tipName]
          : [...dismissedTools, tipName];
        
        await supabase
          .from("saved_shopping_tips")
          .upsert({
            user_id: userId,
            ...(type === 'ingredient' 
              ? { dismissed_ingredients: newDismissed }
              : { dismissed_tools: newDismissed }),
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });
      } catch (error) {
        console.error("Error saving dismissed state:", error);
      }
    }
  };

  // Filter out dismissed tips AND tips for items already in inventory (case-insensitive)
  const ingredientsLower = ingredients.map(i => i.toLowerCase().trim());
  const toolsLower = tools.map(t => t.toLowerCase().trim());
  
  const visibleIngredientTips = ingredientTips.filter(t => 
    !dismissedIngredients.includes(t.name) && 
    !ingredientsLower.includes(t.name.toLowerCase().trim())
  );
  const visibleToolTips = toolTips.filter(t => 
    !dismissedTools.includes(t.name) && 
    !toolsLower.includes(t.name.toLowerCase().trim())
  );

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

  const hasTips = visibleIngredientTips.length > 0 || visibleToolTips.length > 0;

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
        {visibleIngredientTips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ChefHat className="h-4 w-4" />
              Ingredients to Consider
            </div>
            <div className="grid gap-2">
              {visibleIngredientTips.map((tip, index) => (
                <div 
                  key={index}
                  className="p-2 rounded-lg bg-background/50 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{isValidEmoji(tip.emoji) ? tip.emoji : getIngredientFallbackEmoji(tip.name)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tip.name}</p>
                      <p className="text-xs text-muted-foreground">{tip.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToInventory(tip, 'ingredient')}
                        title="Add to inventory"
                      >
                        <Plus className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToShoppingList(tip, 'ingredient')}
                        title="Add to shopping list"
                      >
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => dismissTip(tip.name, 'ingredient')}
                        title="Dismiss"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {tip.unlockedRecipes && tip.unlockedRecipes.length > 0 && (
                    <div className="ml-8 pl-3 border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-primary/80 mb-1">You could make:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {tip.unlockedRecipes.map((recipe, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-primary">•</span> {recipe}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {visibleToolTips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UtensilsCrossed className="h-4 w-4" />
              Budget-Friendly Tools
            </div>
            <div className="grid gap-2">
              {visibleToolTips.map((tip, index) => (
                <div 
                  key={index}
                  className="p-2 rounded-lg bg-background/50 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{isValidEmoji(tip.emoji) ? tip.emoji : getToolFallbackEmoji(tip.name)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{tip.name}</p>
                        <span className="text-xs text-primary font-medium shrink-0">{tip.estimatedCost}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tip.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToInventory(tip, 'tool')}
                        title="Add to inventory"
                      >
                        <Plus className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToShoppingList(tip, 'tool')}
                        title="Add to shopping list"
                      >
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => dismissTip(tip.name, 'tool')}
                        title="Dismiss"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {tip.unlockedRecipes && tip.unlockedRecipes.length > 0 && (
                    <div className="ml-8 pl-3 border-l-2 border-primary/20">
                      <p className="text-xs font-medium text-primary/80 mb-1">You could make:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {tip.unlockedRecipes.map((recipe, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-primary">•</span> {recipe}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
