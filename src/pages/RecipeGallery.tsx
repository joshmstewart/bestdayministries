import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, BookOpen, ChefHat, Loader2, BookmarkPlus } from "lucide-react";
import { RecipeDetailDialog } from "@/components/recipe-maker/RecipeDetailDialog";

interface PublicRecipe {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tips: string[];
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
  image_url: string | null;
  times_made: number;
  is_favorite: boolean;
  last_made_at: string | null;
  created_at: string;
}

type SortOption = "newest" | "most_saved" | "most_liked";

const RecipeGallery = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicRecipes, setPublicRecipes] = useState<PublicRecipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | SavedRecipe | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
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

        // Load user's likes
        const { data: likesData } = await supabase
          .from("public_recipe_likes")
          .select("recipe_id")
          .eq("user_id", user.id);

        setUserLikes(new Set(likesData?.map(l => l.recipe_id) || []));
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
      case "most_liked":
        return (b.likes_count || 0) - (a.likes_count || 0);
      default:
        return 0;
    }
  });

  const toggleLike = async (recipeId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const isLiked = userLikes.has(recipeId);

    if (isLiked) {
      await supabase
        .from("public_recipe_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId);

      await supabase
        .from("public_recipes")
        .update({ likes_count: publicRecipes.find(r => r.id === recipeId)!.likes_count - 1 })
        .eq("id", recipeId);

      setUserLikes(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
      setPublicRecipes(prev =>
        prev.map(r => r.id === recipeId ? { ...r, likes_count: r.likes_count - 1 } : r)
      );
    } else {
      await supabase
        .from("public_recipe_likes")
        .insert({ user_id: user.id, recipe_id: recipeId });

      await supabase
        .from("public_recipes")
        .update({ likes_count: publicRecipes.find(r => r.id === recipeId)!.likes_count + 1 })
        .eq("id", recipeId);

      setUserLikes(prev => new Set(prev).add(recipeId));
      setPublicRecipes(prev =>
        prev.map(r => r.id === recipeId ? { ...r, likes_count: r.likes_count + 1 } : r)
      );
    }
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Community Gallery
            </TabsTrigger>
            <TabsTrigger value="cookbook" className="gap-2">
              <ChefHat className="h-4 w-4" />
              My Cookbook {savedRecipes.length > 0 && `(${savedRecipes.length})`}
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
                      <SelectItem value="most_liked">Most Liked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {sortedRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      userIngredients={userIngredients}
                      isLiked={userLikes.has(recipe.id)}
                      onLike={() => toggleLike(recipe.id)}
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
        </Tabs>
      </main>

      <Footer />

      {selectedRecipe && (
        <RecipeDetailDialog
          recipe={selectedRecipe}
          userIngredients={userIngredients}
          userId={user?.id}
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
                .then(({ data }) => setSavedRecipes(data || []));
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
  isLiked: boolean;
  onLike: () => void;
  onClick: () => void;
}

const RecipeCard = ({ recipe, userIngredients, isLiked, onLike, onClick }: RecipeCardProps) => {
  const matchingCount = recipe.ingredients.filter(ing =>
    userIngredients.some(ui => ing.toLowerCase().includes(ui.toLowerCase()))
  ).length;
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
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
            {recipe.likes_count}
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
