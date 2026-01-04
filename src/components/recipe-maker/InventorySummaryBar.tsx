import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Wrench, ChefHat, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryItem {
  name: string;
  image_url?: string | null;
  icon?: string | null;
}

interface InventorySummaryBarProps {
  ingredients: string[];
  tools: string[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  title?: string;
  showIngredients?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

// Helper to get emoji for tools without images
const getToolEmoji = (name: string): string => {
  const emojiMap: Record<string, string> = {
    Oven: "🔥", Stove: "🍳", Microwave: "📻", Toaster: "🍞", Blender: "🥤",
    "Frying Pan": "🍳", "Sauce Pan": "🥘", Pot: "🍲", "Baking Sheet": "🍪",
    "Mixing Bowl": "🥣", Spatula: "🥄", Whisk: "🥢", Knife: "🔪",
    "Cutting Board": "🪵", "Measuring Cups": "🥛", "Measuring Spoons": "🥄",
    Tongs: "🥢", "Can Opener": "🥫", Colander: "🥗", Grater: "🧀",
  };
  return emojiMap[name] || "🔧";
};

// Helper to get emoji for ingredients
const getIngredientEmoji = (name: string): string => {
  const emojiMap: Record<string, string> = {
    Eggs: "🥚", Chicken: "🍗", "Ground Beef": "🥩", Bacon: "🥓", Ham: "🍖",
    Tuna: "🐟", Sausage: "🌭", Cheese: "🧀", Milk: "🥛", Butter: "🧈",
    Yogurt: "🥛", Bread: "🍞", Pasta: "🍝", Rice: "🍚", Tortillas: "🌮",
    Oatmeal: "🥣", Apples: "🍎", Bananas: "🍌", Oranges: "🍊",
    Strawberries: "🍓", Grapes: "🍇", Tomatoes: "🍅", Lettuce: "🥬",
    Onions: "🧅", Potatoes: "🥔", Carrots: "🥕", Peppers: "🫑",
    Cucumbers: "🥒", Broccoli: "🥦", Corn: "🌽", "Peanut Butter": "🥜",
    Jelly: "🍓", Ketchup: "🍅", Mustard: "🟡", Mayonnaise: "🥚",
    Ranch: "🥗", Salsa: "🌶️", Honey: "🍯", Salt: "🧂", Sugar: "🍬",
    Flour: "🌾", "Olive Oil": "🫒",
  };
  return emojiMap[name] || "🍽️";
};

export const InventorySummaryBar = ({ 
  ingredients, 
  tools, 
  isExpanded, 
  onToggleExpand,
  title = "My Kitchen",
  showIngredients = true,
  isSaving = false,
  lastSaved = null
}: InventorySummaryBarProps) => {
  const [toolsData, setToolsData] = useState<Record<string, InventoryItem>>({});
  const [ingredientsData, setIngredientsData] = useState<Record<string, InventoryItem>>({});

  // Load image data for items
  useEffect(() => {
    const loadItemData = async () => {
      const [toolsRes, ingredientsRes] = await Promise.all([
        supabase.from("recipe_tools").select("name, image_url, icon"),
        supabase.from("recipe_ingredients").select("name, image_url")
      ]);

      if (toolsRes.data) {
        const toolsMap: Record<string, InventoryItem> = {};
        toolsRes.data.forEach(t => { toolsMap[t.name] = t; });
        setToolsData(toolsMap);
      }

      if (ingredientsRes.data) {
        const ingredientsMap: Record<string, InventoryItem> = {};
        ingredientsRes.data.forEach(i => { ingredientsMap[i.name] = i; });
        setIngredientsData(ingredientsMap);
      }
    };

    loadItemData();
  }, []);

  const totalItems = (showIngredients ? ingredients.length : 0) + tools.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 overflow-hidden">
      {/* Summary Header - Always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full p-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Wrench className="h-4 w-4 text-primary" />
            <span className="text-primary">{title}</span>
            <span className="text-muted-foreground">
              ({tools.length} selected)
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          {(ingredients.length > 0 || tools.length > 0) && (
            <div className="flex items-center gap-1 text-xs">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Saved</span>
                </>
              ) : null}
            </div>
          )}
          
          <span className="text-xs text-muted-foreground">
            {isExpanded ? "Collapse" : "Edit"}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Compact item preview when collapsed - also clickable */}
      {!isExpanded && tools.length > 0 && (
        <div 
          className="px-3 pb-3 cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex flex-wrap gap-1.5">
            {tools.map((name) => {
              const item = toolsData[name];
              return (
                <div
                  key={name}
                  className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50"
                  title={name}
                >
                  {item?.image_url ? (
                    <img src={item.image_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-base">
                      {getToolEmoji(name)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
