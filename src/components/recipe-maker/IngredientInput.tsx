import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

// Common ingredients for quick selection
const COMMON_INGREDIENTS = [
  "Eggs", "Bread", "Cheese", "Milk", "Butter",
  "Chicken", "Rice", "Pasta", "Tomatoes", "Onions",
  "Potatoes", "Carrots", "Lettuce", "Apples", "Bananas",
  "Peanut Butter", "Jelly", "Ham", "Bacon", "Yogurt",
];

interface IngredientInputProps {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
}

export const IngredientInput = ({ ingredients, onChange }: IngredientInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim();
    if (trimmed && !ingredients.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...ingredients, trimmed]);
    }
    setInputValue("");
  };

  const removeIngredient = (ingredient: string) => {
    onChange(ingredients.filter(i => i !== ingredient));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient(inputValue);
    }
  };

  const toggleCommonIngredient = (ingredient: string) => {
    if (ingredients.some(i => i.toLowerCase() === ingredient.toLowerCase())) {
      removeIngredient(ingredient);
    } else {
      addIngredient(ingredient);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type an ingredient:</label>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., chicken, rice, tomatoes..."
            className="flex-1"
          />
          <Button
            onClick={() => addIngredient(inputValue)}
            disabled={!inputValue.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected ingredients */}
      {ingredients.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Your ingredients ({ingredients.length}):</label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/10 min-h-[60px]">
            {ingredients.map((ingredient) => (
              <Badge
                key={ingredient}
                variant="secondary"
                className="text-sm py-1.5 px-3 gap-1 bg-primary text-primary-foreground"
              >
                {ingredient}
                <button
                  onClick={() => removeIngredient(ingredient)}
                  className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Quick select common ingredients */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Or tap to add common items:</label>
        <div className="flex flex-wrap gap-2">
          {COMMON_INGREDIENTS.map((ingredient) => {
            const isSelected = ingredients.some(
              i => i.toLowerCase() === ingredient.toLowerCase()
            );
            return (
              <Button
                key={ingredient}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCommonIngredient(ingredient)}
                className="text-sm"
              >
                {ingredient}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
