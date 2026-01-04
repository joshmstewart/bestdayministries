import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, Sparkles } from "lucide-react";

export interface RecipeSuggestion {
  name: string;
  description: string;
  difficulty: "easy" | "medium";
  timeEstimate: string;
  emoji: string;
}

interface RecipeSuggestionsProps {
  suggestions: RecipeSuggestion[];
  onSelect: (recipe: RecipeSuggestion) => void;
}

export const RecipeSuggestions = ({ suggestions, onSelect }: RecipeSuggestionsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 py-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">AI Suggestions</h3>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        Based on your ingredients - tap a recipe to see how to make it!
      </p>
      
      <div className="grid gap-4">
        {suggestions.map((recipe, index) => (
          <Card 
            key={index}
            className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            onClick={() => onSelect(recipe)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{recipe.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {recipe.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={recipe.difficulty === "easy" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <ChefHat className="h-3 w-3" />
                      {recipe.difficulty === "easy" ? "Easy" : "Medium"}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.timeEstimate}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
