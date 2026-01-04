import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

interface RecipeIngredient {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface RecipeIngredientSelectorProps {
  selectedIngredients: string[];
  onToggle: (ingredientName: string) => void;
}

// Lazy loading image component
const LazyIngredientImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="absolute inset-0">
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

// Helper to get emoji for ingredients without images
const getIngredientEmoji = (name: string): string => {
  const emojiMap: Record<string, string> = {
    Eggs: "🥚",
    Chicken: "🍗",
    "Ground Beef": "🥩",
    Bacon: "🥓",
    Ham: "🍖",
    Tuna: "🐟",
    Sausage: "🌭",
    "Hot Dogs": "🌭",
    Cheese: "🧀",
    Milk: "🥛",
    Butter: "🧈",
    Yogurt: "🥛",
    "Cream Cheese": "🧀",
    "Sour Cream": "🥛",
    Bread: "🍞",
    Pasta: "🍝",
    Rice: "🍚",
    Tortillas: "🌮",
    Oatmeal: "🥣",
    Cereal: "🥣",
    Crackers: "🍪",
    Apples: "🍎",
    Bananas: "🍌",
    Oranges: "🍊",
    Strawberries: "🍓",
    Grapes: "🍇",
    Blueberries: "🫐",
    Tomatoes: "🍅",
    Lettuce: "🥬",
    Onions: "🧅",
    Potatoes: "🥔",
    Carrots: "🥕",
    Celery: "🥬",
    Peppers: "🫑",
    Cucumbers: "🥒",
    Broccoli: "🥦",
    Corn: "🌽",
    "Peanut Butter": "🥜",
    Jelly: "🍓",
    Ketchup: "🍅",
    Mustard: "🟡",
    Mayonnaise: "🥚",
    Ranch: "🥗",
    Salsa: "🌶️",
    Honey: "🍯",
    Salt: "🧂",
    Pepper: "🌶️",
    Sugar: "🍬",
    Flour: "🌾",
    "Olive Oil": "🫒",
    "Vegetable Oil": "🫒",
    "Canned Beans": "🥫",
    "Canned Soup": "🥫",
  };
  return emojiMap[name] || "🍽️";
};

// Category display order
const categoryOrder = ["protein", "dairy", "grains", "fruits", "vegetables", "condiments", "pantry"];

const categoryLabels: Record<string, string> = {
  protein: "🥩 Proteins",
  dairy: "🧀 Dairy",
  grains: "🍞 Bread & Grains",
  fruits: "🍎 Fruits",
  vegetables: "🥕 Vegetables",
  condiments: "🍯 Condiments",
  pantry: "🧂 Pantry",
};

export const RecipeIngredientSelector = ({
  selectedIngredients,
  onToggle,
}: RecipeIngredientSelectorProps) => {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("display_order");

    if (error) {
      console.error("Failed to load ingredients:", error);
    } else {
      setIngredients(data || []);
    }
    setLoading(false);
  };

  // Group ingredients by category
  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, RecipeIngredient[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        Tap ingredients you have (or want to pretend you have!)
      </p>
      
      {/* All categories displayed on one page */}
      <div className="space-y-6">
        {categoryOrder.map((category) => {
          if (!groupedIngredients[category]) return null;
          
          return (
            <div key={category} className="space-y-3">
              {/* Category header */}
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {categoryLabels[category] || category}
                {groupedIngredients[category].filter(
                  i => selectedIngredients.includes(i.name)
                ).length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                    {groupedIngredients[category].filter(
                      i => selectedIngredients.includes(i.name)
                    ).length} selected
                  </span>
                )}
              </h3>
              
              {/* Ingredients grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {groupedIngredients[category].map((ingredient) => {
                  const isSelected = selectedIngredients.includes(ingredient.name);

                  return (
                    <button
                      key={ingredient.id}
                      onClick={() => onToggle(ingredient.name)}
                      className={cn(
                        "relative rounded-xl border-2 transition-all duration-200 overflow-hidden",
                        "hover:scale-105 hover:shadow-lg",
                        "flex flex-col items-center text-center aspect-square",
                        isSelected
                          ? "border-primary shadow-md ring-2 ring-primary/50"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Ingredient image or placeholder */}
                      {ingredient.image_url ? (
                        <LazyIngredientImage
                          src={ingredient.image_url}
                          alt={ingredient.name}
                        />
                      ) : (
                        <div
                          className="absolute inset-0 w-full h-full flex items-center justify-center text-3xl"
                          style={{
                            background: `linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))`,
                          }}
                        >
                          {getIngredientEmoji(ingredient.name)}
                        </div>
                      )}

                      {/* Ingredient name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-1.5 pt-4">
                        <span className="font-medium text-xs text-white drop-shadow-md line-clamp-2">
                          {ingredient.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected ingredients summary */}
      {selectedIngredients.length > 0 && (
        <div className="p-3 rounded-lg bg-background/80 backdrop-blur-md border border-primary/20 shadow-lg sticky bottom-4 mx-1 z-20">
          <p className="text-sm font-medium mb-2">
            Selected ({selectedIngredients.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedIngredients.map((name) => (
              <button
                key={name}
                onClick={() => onToggle(name)}
                className="px-2 py-1 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
              >
                {name} ×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
