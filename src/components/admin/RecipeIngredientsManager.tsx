import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Wand2, RefreshCw, Check, ImageOff, AlertTriangle, X, Copy, Plus, Trash2 } from "lucide-react";

interface RecipeIngredient {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface GenerationError {
  ingredientName: string;
  error: string;
}

// Common ingredient suggestions by category - expanded list
const INGREDIENT_SUGGESTIONS: Record<string, string[]> = {
  protein: [
    "Chicken Breast", "Ground Beef", "Bacon", "Sausage", "Ham", "Turkey", "Steak", "Pork Chops", 
    "Shrimp", "Salmon", "Tuna", "Hot Dogs", "Pepperoni", "Deli Meat", "Chicken Nuggets", "Fish Sticks",
    "Meatballs", "Rotisserie Chicken", "Ground Turkey", "Pork Tenderloin", "Lamb", "Crab", "Lobster",
    "Beef Jerky", "Lunch Meat", "Corned Beef", "Pulled Pork", "Chicken Wings", "Tilapia", "Cod"
  ],
  dairy: [
    "Milk", "Butter", "Cheese", "Cream Cheese", "Sour Cream", "Yogurt", "Heavy Cream", "Parmesan",
    "Mozzarella", "Cheddar", "Cottage Cheese", "Whipped Cream", "Half & Half", "Greek Yogurt",
    "American Cheese", "Swiss Cheese", "Feta Cheese", "Ricotta", "Goat Cheese", "Brie", "Blue Cheese",
    "String Cheese", "Cheese Slices", "Shredded Cheese", "Buttermilk", "Evaporated Milk", "Condensed Milk"
  ],
  grains: [
    "Bread", "Rice", "Pasta", "Tortillas", "Bagels", "English Muffins", "Cereal", "Oatmeal", "Crackers",
    "Pancake Mix", "Flour", "Cornbread Mix", "Instant Rice", "Instant Oatmeal", "Ramen Noodles", 
    "Mac & Cheese", "Couscous", "Quinoa", "Hamburger Buns", "Hot Dog Buns", "Dinner Rolls", "Croissants",
    "Pita Bread", "Naan", "Breadcrumbs", "Croutons", "Granola", "Biscuit Mix", "Waffle Mix", "Muffin Mix"
  ],
  fruits: [
    "Apples", "Bananas", "Oranges", "Strawberries", "Blueberries", "Grapes", "Lemons", "Limes",
    "Peaches", "Pineapple", "Mango", "Raisins", "Watermelon", "Cantaloupe", "Honeydew", "Cherries",
    "Raspberries", "Blackberries", "Kiwi", "Pears", "Plums", "Nectarines", "Grapefruit", "Coconut",
    "Dried Cranberries", "Dried Apricots", "Fruit Cocktail", "Mandarin Oranges", "Applesauce"
  ],
  vegetables: [
    "Lettuce", "Tomatoes", "Onions", "Carrots", "Celery", "Broccoli", "Spinach", "Mushrooms",
    "Peppers", "Potatoes", "Corn", "Green Beans", "Peas", "Cabbage", "Cauliflower", "Asparagus",
    "Zucchini", "Squash", "Cucumber", "Avocado", "Sweet Potatoes", "Garlic", "Ginger", "Kale",
    "Brussels Sprouts", "Artichokes", "Beets", "Radishes", "Eggplant", "Frozen Vegetables", "Mixed Veggies"
  ],
  condiments: [
    "Ketchup", "Mustard", "Mayo", "BBQ Sauce", "Soy Sauce", "Hot Sauce", "Ranch", "Salad Dressing",
    "Honey", "Syrup", "Jam", "Peanut Butter", "Jelly", "Teriyaki Sauce", "Worcestershire", "Vinegar",
    "Salsa", "Guacamole", "Hummus", "Relish", "Pickle Juice", "Tartar Sauce", "Cocktail Sauce",
    "Marinara Sauce", "Alfredo Sauce", "Sriracha", "Hoisin Sauce", "Fish Sauce", "Oyster Sauce"
  ],
  pantry: [
    "Salt", "Pepper", "Sugar", "Olive Oil", "Vegetable Oil", "Vinegar", "Flour", "Baking Soda",
    "Vanilla Extract", "Cinnamon", "Garlic Powder", "Chicken Broth", "Beef Broth", "Baking Powder",
    "Brown Sugar", "Powdered Sugar", "Cocoa Powder", "Chocolate Chips", "Cornstarch", "Yeast",
    "Instant Pudding", "Instant Mashed Potatoes", "Instant Coffee", "Instant Noodles", "Jello",
    "Cake Mix", "Brownie Mix", "Cookie Mix", "Popcorn", "Marshmallows", "Graham Crackers", 
    "Nuts", "Almonds", "Peanuts", "Walnuts", "Bread Crumbs", "Panko", "Cooking Spray"
  ],
};

export const RecipeIngredientsManager = () => {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIngredient, setCurrentIngredient] = useState<string | null>(null);
  const [errors, setErrors] = useState<GenerationError[]>([]);
  
  // New ingredient form state
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientCategory, setNewIngredientCategory] = useState("pantry");
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Delete confirmation state
  const [ingredientToDelete, setIngredientToDelete] = useState<RecipeIngredient | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      showErrorToastWithCopy("Loading ingredients", error);
      console.error(error);
    } else {
      // Add cache-busting timestamp to image URLs
      const ingredientsWithCacheBust = (data || []).map(ingredient => ({
        ...ingredient,
        image_url: ingredient.image_url 
          ? `${ingredient.image_url}?t=${Date.now()}`
          : null
      }));
      setIngredients(ingredientsWithCacheBust);
    }
    setLoading(false);
  };

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newIngredientName.trim()) return [];
    
    const searchTerm = newIngredientName.toLowerCase();
    const existingNames = new Set(ingredients.map(i => i.name.toLowerCase()));
    
    // Get all suggestions across all categories
    const allSuggestions: { name: string; category: string }[] = [];
    Object.entries(INGREDIENT_SUGGESTIONS).forEach(([category, items]) => {
      items.forEach(item => {
        if (
          item.toLowerCase().includes(searchTerm) &&
          !existingNames.has(item.toLowerCase())
        ) {
          allSuggestions.push({ name: item, category });
        }
      });
    });
    
    return allSuggestions.slice(0, 8); // Limit to 8 suggestions
  }, [newIngredientName, ingredients]);

  // Semantic keywords for grouping similar items together
  const SEMANTIC_GROUPS: Record<string, string[][]> = {
    grains: [
      ["bread", "bun", "roll", "loaf", "baguette", "croissant", "biscuit"],
      ["rice", "quinoa", "couscous", "grain"],
      ["pasta", "noodle", "spaghetti", "macaroni", "penne", "ramen"],
      ["tortilla", "wrap", "pita", "naan", "flatbread"],
      ["cereal", "oatmeal", "granola", "muesli"],
      ["pancake", "waffle", "muffin", "cake", "brownie", "cookie"],
      ["cracker", "crouton", "breadcrumb", "panko"],
      ["flour", "mix", "instant"],
    ],
    protein: [
      ["chicken", "turkey", "poultry", "wing", "nugget"],
      ["beef", "steak", "ground beef", "meatball", "burger"],
      ["pork", "bacon", "ham", "sausage", "hot dog", "pepperoni"],
      ["fish", "salmon", "tuna", "tilapia", "cod", "shrimp", "crab", "lobster", "seafood"],
      ["deli", "lunch meat", "cold cut", "jerky"],
    ],
    dairy: [
      ["milk", "cream", "half", "buttermilk", "evaporated", "condensed"],
      ["cheese", "cheddar", "mozzarella", "parmesan", "swiss", "feta", "ricotta", "brie", "goat"],
      ["yogurt", "greek"],
      ["butter", "margarine"],
      ["sour cream", "cream cheese", "cottage"],
    ],
    vegetables: [
      ["lettuce", "spinach", "kale", "cabbage", "greens", "salad"],
      ["tomato", "pepper", "cucumber", "zucchini", "squash", "eggplant"],
      ["onion", "garlic", "ginger", "shallot", "leek"],
      ["potato", "sweet potato", "yam"],
      ["carrot", "celery", "broccoli", "cauliflower", "asparagus"],
      ["corn", "pea", "bean", "frozen"],
      ["mushroom"],
    ],
    fruits: [
      ["apple", "pear"],
      ["banana", "plantain"],
      ["orange", "lemon", "lime", "grapefruit", "citrus", "mandarin"],
      ["berry", "strawberry", "blueberry", "raspberry", "blackberry", "cranberry"],
      ["grape", "raisin"],
      ["melon", "watermelon", "cantaloupe", "honeydew"],
      ["tropical", "mango", "pineapple", "coconut", "kiwi"],
      ["peach", "plum", "nectarine", "cherry", "apricot"],
      ["dried", "fruit cocktail", "applesauce"],
    ],
    condiments: [
      ["ketchup", "mustard", "mayo", "relish"],
      ["sauce", "bbq", "teriyaki", "soy", "worcestershire", "hot sauce", "sriracha"],
      ["dressing", "ranch", "vinaigrette"],
      ["salsa", "guacamole", "hummus", "dip"],
      ["honey", "syrup", "jam", "jelly"],
      ["peanut butter", "nutella", "spread"],
      ["vinegar", "oil"],
    ],
    pantry: [
      ["salt", "pepper", "seasoning", "spice", "powder", "cinnamon", "garlic powder"],
      ["sugar", "brown sugar", "powdered sugar", "sweetener"],
      ["flour", "cornstarch", "baking soda", "baking powder", "yeast"],
      ["oil", "olive oil", "vegetable oil", "cooking spray"],
      ["broth", "stock", "bouillon"],
      ["vanilla", "extract", "cocoa", "chocolate"],
      ["instant", "mix", "pudding", "jello"],
      ["nut", "almond", "peanut", "walnut", "cashew"],
      ["cracker", "graham", "marshmallow", "popcorn"],
    ],
  };

  // Find semantic similarity score between two ingredient names
  const getSemanticSimilarity = (name1: string, name2: string, category: string): number => {
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();
    
    // Direct substring match is very strong
    if (n1.includes(n2) || n2.includes(n1)) return 100;
    
    // Check if they share words
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);
    const sharedWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    if (sharedWords.length > 0) return 80;
    
    // Check semantic groups
    const groups = SEMANTIC_GROUPS[category] || [];
    for (const group of groups) {
      const n1InGroup = group.some(keyword => n1.includes(keyword));
      const n2InGroup = group.some(keyword => n2.includes(keyword));
      if (n1InGroup && n2InGroup) return 60;
    }
    
    return 0;
  };

  // Calculate smart display_order for new ingredient within its category
  const calculateSmartDisplayOrder = (name: string, category: string): number => {
    const categoryIngredients = ingredients
      .filter(i => i.category === category)
      .sort((a, b) => a.display_order - b.display_order);
    
    if (categoryIngredients.length === 0) {
      return 10;
    }
    
    // Find the most similar existing ingredient
    let bestMatch: { ingredient: RecipeIngredient; score: number } | null = null;
    
    for (const ingredient of categoryIngredients) {
      const score = getSemanticSimilarity(name, ingredient.name, category);
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { ingredient, score };
      }
    }
    
    if (bestMatch) {
      // Place right after the most similar item
      const matchIndex = categoryIngredients.findIndex(i => i.id === bestMatch!.ingredient.id);
      const matchOrder = bestMatch.ingredient.display_order;
      
      // Get the next item's order (if exists)
      const nextItem = categoryIngredients[matchIndex + 1];
      if (nextItem) {
        // Place between match and next item
        return Math.floor((matchOrder + nextItem.display_order) / 2);
      } else {
        // Place after match
        return matchOrder + 5;
      }
    }
    
    // No semantic match found - add at end
    return categoryIngredients[categoryIngredients.length - 1].display_order + 10;
  };

  const handleAddIngredient = async (name: string, category: string) => {
    if (!name.trim()) {
      showErrorToast("Please enter an ingredient name");
      return;
    }

    // Check if already exists
    const exists = ingredients.some(
      i => i.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      showErrorToast("This ingredient already exists");
      return;
    }

    setAddingIngredient(true);
    setShowSuggestions(false);

    // Calculate smart display order
    const smartDisplayOrder = calculateSmartDisplayOrder(name.trim(), category);

    try {
      // Insert the ingredient
      const { data: newIngredient, error: insertError } = await supabase
        .from("recipe_ingredients")
        .insert({
          name: name.trim(),
          category,
          description: `${name} for cooking`,
          is_active: true,
          display_order: smartDisplayOrder,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(`Added ${name}! Generating icon...`);
      setNewIngredientName("");

      // Generate icon for the new ingredient
      const result = await generateIcon(newIngredient as RecipeIngredient);
      
      if (result.ok) {
        toast.success(`Icon generated for ${name}!`);
      } else {
        toast.warning(`Added ${name} but icon generation failed. You can regenerate it later.`);
        setErrors(prev => [...prev, { ingredientName: name, error: result.errorMessage || "Unknown error" }]);
      }

      await loadIngredients();
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      showErrorToastWithCopy("Adding ingredient", error);
    } finally {
      setAddingIngredient(false);
    }
  };

  const generateIcon = async (
    ingredient: RecipeIngredient
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-recipe-ingredient-icon",
        {
          body: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
          },
        }
      );

      if (error) {
        console.error(`Failed to generate icon for ${ingredient.name}:`, error);
        return { ok: false, errorMessage: error.message || String(error) };
      }
      
      // Check if the response contains an error
      if ((data as any)?.error) {
        return { ok: false, errorMessage: (data as any).error };
      }

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${ingredient.name}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errorMessage: message };
    }
  };

  const handleGenerateMissing = async () => {
    const missingIcons = ingredients.filter((i) => !i.image_url);
    
    if (missingIcons.length === 0) {
      toast.info("All ingredients already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setErrors([]); // Clear previous errors

    let successCount = 0;
    const BATCH_SIZE = 5;
    const batch = missingIcons.slice(0, BATCH_SIZE); // Only take first 5
    const total = batch.length;
    const newErrors: GenerationError[] = [];

    setCurrentIngredient(`${batch.map(b => b.name).join(", ")}`);

    // Run batch in parallel
    const results = await Promise.all(
      batch.map(async (ingredient) => {
        const result = await generateIcon(ingredient);
        return { ingredient, result };
      })
    );

    // Process results
    for (const { ingredient, result } of results) {
      if (result.ok) {
        successCount++;
      } else {
        newErrors.push({
          ingredientName: ingredient.name,
          error: result.errorMessage || "Unknown error",
        });
      }
    }

    setProgress(100);
    setGenerating(false);
    setCurrentIngredient(null);
    setErrors(newErrors);

    const remaining = missingIcons.length - BATCH_SIZE;
    if (successCount === total && remaining > 0) {
      toast.success(`Generated ${successCount} icons! ${remaining} remaining.`);
    } else if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. ${newErrors.length} failed - see errors below.`);
    }

    await loadIngredients();
  };

  const handleRegenerate = async (ingredient: RecipeIngredient) => {
    setRegeneratingId(ingredient.id);

    const result = await generateIcon(ingredient);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setIngredients((prev) =>
          prev.map((i) => (i.id === ingredient.id ? { ...i, image_url: cacheBustedUrl } : i))
        );
      }
      // Remove from errors if it was there
      setErrors((prev) => prev.filter((e) => e.ingredientName !== ingredient.name));
      toast.success(`Regenerated icon for ${ingredient.name}`);
    } else {
      // Add to errors for persistent display
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.ingredientName !== ingredient.name);
        return [...filtered, { ingredientName: ingredient.name, error: result.errorMessage || "Unknown error" }];
      });
      showErrorToast(`Failed to regenerate icon for ${ingredient.name}`);
    }

    setRegeneratingId(null);
  };

  const handleCopyErrors = () => {
    const errorText = errors
      .map((e) => `${e.ingredientName}: ${e.error}`)
      .join("\n");
    navigator.clipboard.writeText(errorText);
    toast.success("Errors copied to clipboard");
  };

  const handleDismissErrors = () => {
    setErrors([]);
  };

  const handleDeleteIngredient = async () => {
    if (!ingredientToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("id", ingredientToDelete.id);

      if (error) throw error;

      toast.success(`Deleted ${ingredientToDelete.name}`);
      setIngredients(prev => prev.filter(i => i.id !== ingredientToDelete.id));
    } catch (error) {
      console.error("Failed to delete ingredient:", error);
      showErrorToastWithCopy("Deleting ingredient", error);
    } finally {
      setDeleting(false);
      setIngredientToDelete(null);
    }
  };

  const missingCount = ingredients.filter((i) => !i.image_url).length;

  // Group ingredients by category
  const groupedIngredients = ingredients.reduce((acc, ingredient) => {
    if (!acc[ingredient.category]) {
      acc[ingredient.category] = [];
    }
    acc[ingredient.category].push(ingredient);
    return acc;
  }, {} as Record<string, RecipeIngredient[]>);

  // Category display names
  const categoryLabels: Record<string, string> = {
    protein: "🥩 Proteins",
    dairy: "🧀 Dairy",
    grains: "🍞 Bread & Grains",
    fruits: "🍎 Fruits",
    vegetables: "🥕 Vegetables",
    condiments: "🍯 Condiments & Spreads",
    pantry: "🧂 Pantry Staples",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Ingredient */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Ingredient
          </CardTitle>
          <CardDescription>
            Type an ingredient name to see suggestions, or enter a custom ingredient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Type ingredient name (e.g., Cereal, Oatmeal, Chicken...)"
                value={newIngredientName}
                onChange={(e) => {
                  setNewIngredientName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow click on suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                disabled={addingIngredient}
              />
              
              {/* Suggestions dropdown - only shows NEW ingredients not in database */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b border-border font-medium">
                    Suggestions (not yet in database)
                  </div>
                  {filteredSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        // Fill in both name and category, but don't add yet
                        setNewIngredientName(suggestion.name);
                        setNewIngredientCategory(suggestion.category);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded">
                        {suggestion.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Select value={newIngredientCategory} onValueChange={setNewIngredientCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="protein">🥩 Protein</SelectItem>
                <SelectItem value="dairy">🧀 Dairy</SelectItem>
                <SelectItem value="grains">🍞 Grains</SelectItem>
                <SelectItem value="fruits">🍎 Fruits</SelectItem>
                <SelectItem value="vegetables">🥕 Vegetables</SelectItem>
                <SelectItem value="condiments">🍯 Condiments</SelectItem>
                <SelectItem value="pantry">🧂 Pantry</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => handleAddIngredient(newIngredientName, newIngredientCategory)}
              disabled={!newIngredientName.trim() || addingIngredient}
            >
              {addingIngredient ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add & Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header with bulk actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Maker Ingredients</CardTitle>
          <CardDescription>
            Manage ingredient icons for the Recipe Maker game. 
            {missingCount > 0 
              ? ` ${missingCount} ingredients need icons.`
              : " All ingredients have icons."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateMissing}
              disabled={generating || missingCount === 0}
              variant={missingCount > 0 ? "default" : "outline"}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Missing Icons ({missingCount})
                </>
              )}
            </Button>

            {missingCount === 0 && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                All icons generated
              </span>
            )}
          </div>

          {generating && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Generating: {currentIngredient}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Persistent Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{errors.length} Generation Error{errors.length > 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyErrors}
                className="h-7 px-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissErrors}
                className="h-7 px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
              {errors.map((err, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 rounded">
                  <span className="font-semibold">{err.ingredientName}:</span>{" "}
                  <span className="break-all">{err.error}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ingredients by category */}
      {Object.entries(groupedIngredients).map(([category, categoryIngredients]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
            <CardDescription>
              {categoryIngredients.filter((i) => i.image_url).length}/{categoryIngredients.length} have icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="relative group rounded-lg border-2 border-border overflow-hidden aspect-square"
                >
                  {ingredient.image_url ? (
                    <img
                      src={ingredient.image_url}
                      alt={ingredient.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageOff className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                    <span className="text-xs text-white font-medium">{ingredient.name}</span>
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegenerate(ingredient)}
                      disabled={regeneratingId === ingredient.id || generating}
                    >
                      {regeneratingId === ingredient.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIngredientToDelete(ingredient)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!ingredientToDelete} onOpenChange={(open) => !open && setIngredientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{ingredientToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIngredient}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
