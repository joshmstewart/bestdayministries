import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, ChefHat, Loader2, BookmarkPlus, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { RecipeDetailDialog } from "@/components/recipe-maker/RecipeDetailDialog";
import { RecipeExpansionTips } from "@/components/recipe-maker/RecipeExpansionTips";

interface PublicRecipe {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  tools?: string[];
  image_url: string | null;
  likes_count: number;
  saves_count: number;
  created_at: string;
}

interface SavedRecipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
  tools?: string[];
  image_url: string | null;
  times_made: number;
  is_favorite: boolean;
  last_made_at: string | null;
  created_at: string;
}

type SortOption = "newest" | "most_saved";

const RecipeGallery = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicRecipes, setPublicRecipes] = useState<PublicRecipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [userTools, setUserTools] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | SavedRecipe | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("most_saved");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load public recipes - we'll sort client-side based on sortBy
      const { data: publicData } = await supabase
        .from("public_recipes")
        .select("*")
        .eq("is_active", true);

      setPublicRecipes(publicData || []);

      if (user) {
        // Load user's saved recipes
        const { data: savedData } = await supabase
          .from("saved_recipes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setSavedRecipes(savedData || []);

        // Load user's ingredients
        const { data: ingredientsData } = await supabase
          .from("user_recipe_ingredients")
          .select("ingredients")
          .eq("user_id", user.id)
          .maybeSingle();

        setUserIngredients(ingredientsData?.ingredients || []);

        // Load user's tools
        const { data: toolsData } = await supabase
          .from("user_recipe_tools")
          .select("tools")
          .eq("user_id", user.id)
          .maybeSingle();

        setUserTools(toolsData?.tools || []);

        // Track which recipes are already saved (by source_recipe_id or by title as fallback)
        const savedBySourceId = new Set(savedData?.map(r => r.source_recipe_id).filter(Boolean) || []);
        const savedTitles = new Set(savedData?.map(r => r.title.toLowerCase()) || []);
        setSavedRecipeIds(savedBySourceId);
        setSavedTitles(savedTitles);
      }

      setLoading(false);
    };

    load();
  }, []);

  // Sort recipes based on selected option
  const sortedRecipes = [...publicRecipes].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "most_saved":
        return (b.saves_count || 0) - (a.saves_count || 0);
      default:
        return 0;
    }
  });

  const addToCookbook = async (recipe: PublicRecipe) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if already saved
    if (savedRecipeIds.has(recipe.id)) {
      toast.info("Already in your cookbook!");
      return;
    }

    const { error } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      source_recipe_id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      tips: recipe.tips,
      image_url: recipe.image_url,
    });

    if (error) {
      toast.error("Failed to save recipe");
      return;
    }

    // Update saves count on public recipe
    await supabase
      .from("public_recipes")
      .update({ saves_count: recipe.saves_count + 1 })
      .eq("id", recipe.id);

    setSavedRecipeIds(prev => new Set(prev).add(recipe.id));
    setPublicRecipes(prev =>
      prev.map(r => r.id === recipe.id ? { ...r, saves_count: r.saves_count + 1 } : r)
    );

    // Refresh saved recipes
    const { data } = await supabase
      .from("saved_recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSavedRecipes(data || []);

    toast.success("Added to your cookbook!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnifiedHeader />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pt-24">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/games/recipe-maker")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recipe Maker
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">📖 Recipe Gallery</h1>
          <p className="text-muted-foreground">
            Discover recipes from the community or browse your saved favorites
          </p>
        </div>

        <Tabs defaultValue="gallery" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gallery" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Community</span>
            </TabsTrigger>
            <TabsTrigger value="cookbook" className="gap-2">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">My Cookbook</span>
              {savedRecipes.length > 0 && <span className="text-xs">({savedRecipes.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping Tips</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            {publicRecipes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No recipes shared yet. Be the first to share one!</p>
              </div>
            ) : (
              <>
                {/* Sort selector */}
                <div className="flex justify-end">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="most_saved">Most Saved</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortedRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      userIngredients={userIngredients}
                      isInCookbook={savedRecipeIds.has(recipe.id) || savedTitles.has(recipe.title.toLowerCase())}
                      onAddToCookbook={() => addToCookbook(recipe)}
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="cookbook" className="space-y-4">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to save recipes to your cookbook</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : savedRecipes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Your cookbook is empty. Start saving recipes!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {savedRecipes.map(recipe => (
                  <SavedRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => setSelectedRecipe(recipe)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shopping" className="space-y-4">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to get personalized shopping tips</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">🛒 Expand Your Cooking Options</h2>
                  <p className="text-sm text-muted-foreground">
                    Based on what you have, here are items that would unlock lots of new recipes!
                  </p>
                </div>
                <RecipeExpansionTips 
                  ingredients={userIngredients} 
                  tools={userTools} 
                  userId={user.id}
                  showTitle
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {selectedRecipe && (
        <RecipeDetailDialog
          recipe={selectedRecipe}
          userIngredients={userIngredients}
          userTools={userTools}
          userId={user?.id}
          isInCookbook={savedRecipeIds.has(selectedRecipe.id) || savedTitles.has(selectedRecipe.title.toLowerCase())}
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
          onAddToCookbook={() => {
            // Refresh saved recipes
            if (user) {
              supabase
                .from("saved_recipes")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .then(({ data }) => {
                  setSavedRecipes(data || []);
                  const savedBySourceId = new Set(data?.map(r => r.source_recipe_id).filter(Boolean) || []);
                  const titles = new Set(data?.map(r => r.title.toLowerCase()) || []);
                  setSavedRecipeIds(savedBySourceId);
                  setSavedTitles(titles);
                });
            }
          }}
        />
      )}
    </div>
  );
};

interface RecipeCardProps {
  recipe: PublicRecipe;
  userIngredients: string[];
  isInCookbook: boolean;
  onAddToCookbook: () => void;
  onClick: () => void;
}

const RecipeCard = ({ recipe, userIngredients, isInCookbook, onAddToCookbook, onClick }: RecipeCardProps) => {
  // Better ingredient matching - normalize and compare core ingredient names
  const normalizeIngredient = (ing: string) => {
    // Extract the main ingredient name, ignoring quantities and common modifiers
    const cleaned = ing.toLowerCase()
      .replace(/\d+[\d\/\s]*(?:cups?|cup|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|tablespoons?|teaspoons?|ounces?|pounds?|grams?|pieces?|slices?|cloves?|heads?|bunches?|cans?|jars?|bottles?|packages?|bags?)/gi, '')
      .replace(/\b(?:fresh|dried|chopped|diced|minced|sliced|whole|ground|large|small|medium|optional|to taste|for serving|for garnish)\b/gi, '')
      .replace(/[,()]/g, '')
      .trim();
    return cleaned;
  };

  const matchingCount = recipe.ingredients.filter((recipeIng) => {
    const normalizedRecipe = normalizeIngredient(recipeIng);

    // Assumed pantry items (always available)
    if (normalizedRecipe === "water" || normalizedRecipe.includes(" water") || normalizedRecipe.includes("water ")) {
      return true;
    }

    return userIngredients.some((userIng) => {
      const normalizedUser = userIng.toLowerCase().trim();
      // Check if user ingredient is contained in recipe ingredient or vice versa
      return normalizedRecipe.includes(normalizedUser) || normalizedUser.includes(normalizedRecipe);
    });
  }).length;

  const matchPercentage = recipe.ingredients.length > 0
    ? Math.round((matchingCount / recipe.ingredients.length) * 100)
    : 0;

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      {recipe.image_url && (
        <div className="aspect-video relative">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          {userIngredients.length > 0 && (
            <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded-full text-xs font-medium">
              {matchPercentage}% match
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{recipe.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{recipe.ingredients.length} ingredients</span>
            {recipe.saves_count > 0 && (
              <span className="flex items-center gap-1">
                <BookmarkPlus className="h-3 w-3" />
                {recipe.saves_count}
              </span>
            )}
          </div>
          <Button
            variant={isInCookbook ? "secondary" : "outline"}
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCookbook();
            }}
          >
            {isInCookbook ? (
              <>
                <Check className="h-4 w-4" />
                In Cookbook
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4" />
                Add
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface SavedRecipeCardProps {
  recipe: SavedRecipe;
  onClick: () => void;
}

const SavedRecipeCard = ({ recipe, onClick }: SavedRecipeCardProps) => {
  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      {recipe.image_url && (
        <div className="aspect-video relative">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          {recipe.times_made > 0 && (
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <ChefHat className="h-3 w-3" />
              Made {recipe.times_made}x
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{recipe.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{recipe.description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{recipe.ingredients.length} ingredients</span>
          {recipe.is_favorite && <span className="text-amber-500">⭐ Favorite</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeGallery;
