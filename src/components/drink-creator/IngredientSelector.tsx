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
              "relative rounded-xl border-2 transition-all duration-200 overflow-hidden",
              "hover:scale-105 hover:shadow-lg",
              "flex flex-col items-center text-center aspect-square",
              isSelected
                ? "border-primary shadow-md"
                : "border-border hover:border-primary/50"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}

            {/* Ingredient image or placeholder - full coverage */}
            {ingredient.image_url ? (
              <img
                src={ingredient.image_url}
                alt={ingredient.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center text-4xl"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))`,
                }}
              >
                {getIngredientEmoji(ingredient.name)}
              </div>
            )}

            {/* Ingredient name overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
              <span className="font-medium text-sm text-white drop-shadow-md">{ingredient.name}</span>
            </div>
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
