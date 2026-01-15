import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Check, BookmarkPlus, Share2, Info } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Suggestion {
  type: "safety" | "simplification" | "substitution" | "tip";
  original?: string;
  suggested: string;
  reason: string;
}

interface IngredientMatch {
  original: string;
  matched: string | null;
}

interface ToolMatch {
  original: string;
  matched: string | null;
}

interface ParsedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  tools: string[];
  steps: string[];
  tips: string[];
  safetyNotes?: string[];
  suggestions?: Suggestion[];
  imageUrl?: string;
  matchedIngredients?: string[];
  matchedTools?: string[];
  unmatchedIngredients?: string[];
  unmatchedTools?: string[];
  ingredientMatches?: IngredientMatch[];
  toolMatches?: ToolMatch[];
}

interface RecipeImporterProps {
  userId: string;
  onSaved?: () => void;
}

export function RecipeImporter({ userId, onSaved }: RecipeImporterProps) {
  const [recipeText, setRecipeText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedRecipe | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleParse = async () => {
    if (!recipeText.trim()) {
      toast.error("Please paste a recipe first");
      return;
    }

    setIsLoading(true);
    setParsedRecipe(null);

    try {
      const { data, error } = await supabase.functions.invoke("parse-recipe", {
        body: { recipeText },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setParsedRecipe(data.recipe);
      toast.success("Recipe parsed successfully!");
    } catch (err) {
      console.error("Error parsing recipe:", err);
      toast.error(err instanceof Error ? err.message : "Failed to parse recipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCookbook = async () => {
    if (!parsedRecipe) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        ingredients: parsedRecipe.ingredients,
        steps: parsedRecipe.steps,
        tips: parsedRecipe.tips,
        tools: parsedRecipe.tools,
        image_url: parsedRecipe.imageUrl || null,
      });

      if (error) throw error;

      toast.success("Recipe saved to your cookbook!");
      onSaved?.();
    } catch (err) {
      console.error("Error saving recipe:", err);
      toast.error("Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareToCommunity = async () => {
    if (!parsedRecipe) return;

    setIsSharing(true);
    try {
      // First save to cookbook
      const { error: saveError } = await supabase.from("saved_recipes").insert({
        user_id: userId,
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        ingredients: parsedRecipe.ingredients,
        steps: parsedRecipe.steps,
        tips: parsedRecipe.tips,
        tools: parsedRecipe.tools,
        image_url: parsedRecipe.imageUrl || null,
      });

      if (saveError) throw saveError;

      // Then share to community
      const { error: shareError } = await supabase.from("public_recipes").insert({
        creator_id: userId,
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        ingredients: parsedRecipe.ingredients,
        steps: parsedRecipe.steps,
        tips: parsedRecipe.tips,
        tools: parsedRecipe.tools,
        image_url: parsedRecipe.imageUrl || null,
      });

      if (shareError) throw shareError;

      toast.success("Recipe saved and shared with the community!");
      onSaved?.();
    } catch (err) {
      console.error("Error sharing recipe:", err);
      toast.error("Failed to share recipe");
    } finally {
      setIsSharing(false);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "safety":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "simplification":
        return <Sparkles className="h-4 w-4 text-primary" />;
      case "substitution":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case "tip":
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSuggestionBadgeVariant = (type: string) => {
    switch (type) {
      case "safety":
        return "destructive";
      case "simplification":
        return "default";
      case "substitution":
        return "secondary";
      case "tip":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Your Recipe
          </CardTitle>
          <CardDescription>
            Paste a recipe from anywhere. AI will parse it, simplify the steps, and suggest safety improvements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your recipe here... Include the title, ingredients, and instructions. You can paste directly from a website, cookbook, or anywhere else!"
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
            className="min-h-[200px] resize-y"
            disabled={isLoading}
          />
          <Button
            onClick={handleParse}
            disabled={isLoading || !recipeText.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing Recipe...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Add & Format Recipe
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {parsedRecipe && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl">{parsedRecipe.title}</CardTitle>
                <CardDescription className="mt-1">{parsedRecipe.description}</CardDescription>
              </div>
              {parsedRecipe.imageUrl && (
                <img
                  src={parsedRecipe.imageUrl}
                  alt={parsedRecipe.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Safety Notes */}
            {parsedRecipe.safetyNotes && parsedRecipe.safetyNotes.length > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Safety Notes
                </p>
                <ul className="text-sm space-y-1">
                  {parsedRecipe.safetyNotes.map((note, i) => (
                    <li key={i} className="text-muted-foreground">• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Suggestions */}
            {parsedRecipe.suggestions && parsedRecipe.suggestions.length > 0 && (
              <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Suggestions ({parsedRecipe.suggestions.length})
                    </span>
                    {showSuggestions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2">
                    {parsedRecipe.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/50 border space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          {getSuggestionIcon(suggestion.type)}
                          <Badge variant={getSuggestionBadgeVariant(suggestion.type) as any}>
                            {suggestion.type}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{suggestion.suggested}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Ingredients with match status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium">Ingredients</p>
                {parsedRecipe.unmatchedIngredients && parsedRecipe.unmatchedIngredients.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                          <Info className="h-3 w-3 mr-1" />
                          {parsedRecipe.unmatchedIngredients.length} not in wizard
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px]">
                        <p className="font-medium mb-1">These items aren't in your wizard inventory:</p>
                        <ul className="text-xs">
                          {parsedRecipe.unmatchedIngredients.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 text-muted-foreground">
                          You can still make this recipe, but these won't match your saved inventory.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {parsedRecipe.ingredientMatches ? (
                  parsedRecipe.ingredientMatches.map((match, i) => (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={match.matched ? "secondary" : "outline"} 
                            className={`text-xs ${!match.matched ? 'border-yellow-500/50 bg-yellow-500/10' : ''}`}
                          >
                            {match.matched ? (
                              <>
                                <Check className="h-3 w-3 mr-1 text-green-600" />
                                {match.matched}
                              </>
                            ) : (
                              match.original
                            )}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {match.matched ? (
                            <p>Matches wizard item: <strong>{match.matched}</strong></p>
                          ) : (
                            <p>Not found in wizard ingredients</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))
                ) : (
                  parsedRecipe.ingredients.map((ing, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {ing}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Tools with match status */}
            {parsedRecipe.tools && parsedRecipe.tools.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium">Tools Needed</p>
                  {parsedRecipe.unmatchedTools && parsedRecipe.unmatchedTools.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                            <Info className="h-3 w-3 mr-1" />
                            {parsedRecipe.unmatchedTools.length} not in wizard
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="font-medium mb-1">These tools aren't in your wizard inventory:</p>
                          <ul className="text-xs">
                            {parsedRecipe.unmatchedTools.map((item, i) => (
                              <li key={i}>• {item}</li>
                            ))}
                          </ul>
                          <p className="text-xs mt-2 text-muted-foreground">
                            You can still make this recipe, but these won't match your saved tools.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {parsedRecipe.toolMatches ? (
                    parsedRecipe.toolMatches.map((match, i) => (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={match.matched ? "outline" : "outline"} 
                              className={`text-xs ${!match.matched ? 'border-yellow-500/50 bg-yellow-500/10' : ''}`}
                            >
                              {match.matched ? (
                                <>
                                  <Check className="h-3 w-3 mr-1 text-green-600" />
                                  {match.matched}
                                </>
                              ) : (
                                match.original
                              )}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {match.matched ? (
                              <p>Matches wizard tool: <strong>{match.matched}</strong></p>
                            ) : (
                              <p>Not found in wizard tools</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  ) : (
                    parsedRecipe.tools.map((tool, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <p className="text-sm font-medium mb-2">Steps</p>
              <ScrollArea className="h-[200px] pr-4">
                <ol className="space-y-2">
                  {parsedRecipe.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>

            {/* Tips */}
            {parsedRecipe.tips && parsedRecipe.tips.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tips</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {parsedRecipe.tips.map((tip, i) => (
                    <li key={i}>💡 {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveToCookbook}
                disabled={isSaving || isSharing}
                className="flex-1"
                variant="outline"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                )}
                Save to Cookbook
              </Button>
              <Button
                onClick={handleShareToCommunity}
                disabled={isSaving || isSharing}
                className="flex-1"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                Save & Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
