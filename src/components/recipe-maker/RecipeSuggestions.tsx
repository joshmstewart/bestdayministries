import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock } from "lucide-react";
import { TextToSpeech } from "@/components/TextToSpeech";

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
      <p className="text-sm text-muted-foreground text-center">
        Tap a recipe to see how to make it!
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{recipe.name}</h3>
                    <TextToSpeech 
                      text={`${recipe.name}. ${recipe.description}. Difficulty: ${recipe.difficulty}. Time: ${recipe.timeEstimate}`}
                      size="icon"
                    />
                  </div>
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
