import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2, ChefHat, UtensilsCrossed } from "lucide-react";
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
}

export function RecipeExpansionTips({ ingredients, tools }: RecipeExpansionTipsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [ingredientTips, setIngredientTips] = useState<IngredientTip[]>([]);
  const [toolTips, setToolTips] = useState<ToolTip[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const generateTips = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recipe-expansion-tips', {
        body: { ingredients, tools }
      });

      if (error) throw error;

      setIngredientTips(data.ingredientTips || []);
      setToolTips(data.toolTips || []);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error getting expansion tips:", error);
      toast({
        title: "Couldn't get tips",
        description: "Try again in a moment!",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLoaded) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Lightbulb className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Want ideas for what to add to make more recipes?
            </p>
            <Button
              onClick={generateTips}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Get Shopping Tips
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasTips = ingredientTips.length > 0 || toolTips.length > 0;

  if (!hasTips) {
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Shopping Tips
        </CardTitle>
      </CardHeader>
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
          onClick={generateTips}
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
            "Get New Tips"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
