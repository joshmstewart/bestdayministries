import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  color_hint: string | null;
  display_order: number;
}

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  selected: string[];
  onToggle: (id: string) => void;
  multiSelect?: boolean;
}

export const IngredientSelector = ({
  ingredients,
  selected,
  onToggle,
  multiSelect = true,
}: IngredientSelectorProps) => {
  if (ingredients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No ingredients available for this category
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {ingredients.map((ingredient) => {
        const isSelected = selected.includes(ingredient.id);

        return (
          <button
            key={ingredient.id}
            onClick={() => onToggle(ingredient.id)}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all duration-200",
              "hover:scale-105 hover:shadow-lg",
              "flex flex-col items-center gap-2 text-center",
              isSelected
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}

            {/* Ingredient image or placeholder */}
            {ingredient.image_url ? (
              <img
                src={ingredient.image_url}
                alt={ingredient.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))`,
                }}
              >
                {getIngredientEmoji(ingredient.name)}
              </div>
            )}

            {/* Ingredient name */}
            <span className="font-medium text-sm">{ingredient.name}</span>

            {/* Description */}
            {ingredient.description && (
              <span className="text-xs text-muted-foreground line-clamp-2">
                {ingredient.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Helper to get emoji for ingredients without images
const getIngredientEmoji = (name: string): string => {
  const emojiMap: Record<string, string> = {
    Espresso: "☕",
    "Cold Brew": "🧊",
    Matcha: "🍵",
    Chai: "🫖",
    "Hot Chocolate": "🍫",
    Vanilla: "🌸",
    Caramel: "🍯",
    Hazelnut: "🌰",
    Lavender: "💜",
    Cinnamon: "🪵",
    Honey: "🍯",
    "Whipped Cream": "☁️",
    Foam: "🫧",
    "Chocolate Drizzle": "🍫",
    "Caramel Drizzle": "✨",
    "Cinnamon Sprinkle": "✨",
    "Oat Milk": "🥛",
    "Almond Milk": "🥜",
    "Extra Shot": "⚡",
    Ice: "❄️",
    Marshmallows: "🤍",
  };
  return emojiMap[name] || "✨";
};
