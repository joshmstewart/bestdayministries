import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, ChefHat, BookmarkPlus, Check, Sparkles, ShoppingCart, Plus, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageLoadingState } from "@/components/common";
import { TextToSpeech } from "@/components/TextToSpeech";
import { toast } from "sonner";
import { RecipeDetailDialog } from "@/components/recipe-maker/RecipeDetailDialog";
import { CookingModeDialog } from "@/components/recipe-maker/CookingModeDialog";
import { CollapsibleShoppingTips } from "@/components/recipe-maker/CollapsibleShoppingTips";
import { RecipeMakerWizard } from "@/components/recipe-maker/RecipeMakerWizard";
import { RecipeImporter } from "@/components/recipe-maker/RecipeImporter";
import { ShoppingListTab } from "@/components/recipe-maker/ShoppingListTab";

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
  creator_name?: string;
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
  source_recipe_id?: string | null;
  creator_id?: string;
  creator_name?: string;
  saves_count?: number;
  times_made: number;
  is_favorite: boolean;
  last_made_at: string | null;
  created_at: string;
}

type SortOption = "newest" | "most_saved" | "best_match";

const RecipeGallery = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publicRecipes, setPublicRecipes] = useState<PublicRecipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [userIngredients, setUserIngredients] = useState<string[]>([]);
  const [userTools, setUserTools] = useState<string[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | SavedRecipe | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("most_saved");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Get initial tab from URL or default to "maker"
  const initialTab = searchParams.get("tab") || "maker";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load public recipes
      const { data: publicData, error: recipesError } = await supabase
        .from("public_recipes")
        .select("*")
        .eq("is_active", true);

      if (recipesError) {
        console.error("Error loading recipes:", recipesError);
      }

      // Get unique creator IDs and fetch their names
      const creatorIds = [...new Set((publicData || []).map(r => r.creator_id))];
      let creatorNames: Record<string, string> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", creatorIds);
        
        creatorNames = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.display_name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Flatten the creator name into the recipe object
      const recipesWithCreators = (publicData || []).map((recipe: any) => ({
        ...recipe,
        creator_name: creatorNames[recipe.creator_id] || null,
      }));

      setPublicRecipes(recipesWithCreators);

      if (user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setIsAdmin(roleData?.role === "admin" || roleData?.role === "owner");

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

        // Track which recipes are already saved
        const savedBySourceId = new Set(savedData?.map(r => r.source_recipe_id).filter(Boolean) || []);
        const savedTitles = new Set(savedData?.map(r => r.title.toLowerCase()) || []);
        setSavedRecipeIds(savedBySourceId);
        setSavedTitles(savedTitles);
      }

      setLoading(false);
    };

    load();
  }, []);

  // Helper to calculate match percentage for sorting
  const calculateMatchPercentage = (recipe: PublicRecipe) => {
    const normalizeIngredient = (ing: string) => {
      return ing.toLowerCase()
        .replace(/\d+[\d\/\s]*(?:cups?|cup|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|tablespoons?|teaspoons?|ounces?|pounds?|grams?|pieces?|slices?|cloves?|heads?|bunches?|cans?|jars?|bottles?|packages?|bags?)/gi, '')
        .replace(/\b(?:fresh|dried|chopped|diced|minced|sliced|whole|ground|large|small|medium|optional|to taste|for serving|for garnish)\b/gi, '')
        .replace(/[,()]/g, '')
        .trim();
    };

    const toSingular = (word: string) => {
      if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
      if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('ses') || word.endsWith('zes'))) {
        return word.slice(0, -2);
      }
      if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
      return word;
    };

    const matchingIngredients = recipe.ingredients.filter((recipeIng) => {
      const normalizedRecipe = normalizeIngredient(recipeIng);
      if (normalizedRecipe === "water" || normalizedRecipe.includes(" water") || normalizedRecipe.includes("water ")) {
        return true;
      }
      return userIngredients.some((userIng) => {
        const normalizedUser = userIng.toLowerCase().trim();
        const singularRecipe = toSingular(normalizedRecipe);
        const singularUser = toSingular(normalizedUser);
        return normalizedRecipe.includes(normalizedUser) || 
               normalizedUser.includes(normalizedRecipe) ||
               singularRecipe.includes(singularUser) ||
               singularUser.includes(singularRecipe);
      });
    }).length;

    const recipeTools = recipe.tools || [];
    const matchingTools = recipeTools.filter((recipeTool) => {
      return userTools.some((userTool) => {
        const normalizedRecipe = recipeTool.toLowerCase().trim();
        const normalizedUser = userTool.toLowerCase().trim();
        return normalizedRecipe.includes(normalizedUser) || normalizedUser.includes(normalizedRecipe);
      });
    }).length;

    const totalItems = recipe.ingredients.length + recipeTools.length;
    const totalMatches = matchingIngredients + matchingTools;
    return totalItems > 0 ? Math.round((totalMatches / totalItems) * 100) : 0;
  };

  // Sort recipes based on selected option
  const sortedRecipes = [...publicRecipes].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "most_saved":
        return (b.saves_count || 0) - (a.saves_count || 0);
      case "best_match":
        return calculateMatchPercentage(b) - calculateMatchPercentage(a);
      default:
        return 0;
    }
  });

  const addToCookbook = async (recipe: PublicRecipe) => {
    if (!user) {
      navigate("/auth");
      return;
    }

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

    await supabase
      .from("public_recipes")
      .update({ saves_count: recipe.saves_count + 1 })
      .eq("id", recipe.id);

    setSavedRecipeIds(prev => new Set(prev).add(recipe.id));
    setPublicRecipes(prev =>
      prev.map(r => r.id === recipe.id ? { ...r, saves_count: r.saves_count + 1 } : r)
    );

    const { data } = await supabase
      .from("saved_recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSavedRecipes(data || []);

    toast.success("Added to your cookbook!");
  };

  const refreshUserData = async () => {
    if (!user) return;
    
    const [ingredientsRes, toolsRes] = await Promise.all([
      supabase.from("user_recipe_ingredients").select("ingredients").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_recipe_tools").select("tools").eq("user_id", user.id).maybeSingle(),
    ]);
    
    setUserIngredients(ingredientsRes.data?.ingredients || []);
    setUserTools(toolsRes.data?.tools || []);
  };

  if (loading) {
    return <PageLoadingState />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnifiedHeader />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pt-24">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">🍳 Recipe Pal</h1>
          <p className="text-muted-foreground">
            Create recipes, explore community favorites, and build your cookbook
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" id="recipe-gallery-tabs">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="maker" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Recipe Maker</span>
              <span className="sm:hidden">Make</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Community</span>
              <span className="sm:hidden">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="cookbook" className="gap-2">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">My Cookbook</span>
              <span className="sm:hidden">Saved</span>
              {savedRecipes.length > 0 && <span className="text-xs">({savedRecipes.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping List</span>
              <span className="sm:hidden">Shop</span>
            </TabsTrigger>
          </TabsList>

          {/* Recipe Maker Tab */}
          <TabsContent value="maker" className="space-y-6">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to use the Recipe Maker</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : (
              <>
                <RecipeMakerWizard 
                  userId={user.id} 
                  onSaved={() => {
                    // Refresh cookbook data and switch to cookbook tab
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
                    handleTabChange("cookbook");
                  }}
                />
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-sm text-muted-foreground">
                      Or import your own recipe
                    </span>
                  </div>
                </div>

                <RecipeImporter
                  userId={user.id}
                  onSaved={() => {
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
                    handleTabChange("cookbook");
                  }}
                />
              </>
            )}
          </TabsContent>

          {/* Community Recipes Tab */}
          <TabsContent value="community" className="space-y-4">
            {user && (
              <CollapsibleShoppingTips
                ingredients={userIngredients}
                tools={userTools}
                userId={user.id}
                defaultOpen={false}
                onIngredientAdded={refreshUserData}
                onToolAdded={refreshUserData}
              />
            )}
            
            {publicRecipes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No recipes shared yet. Be the first to share one!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-muted-foreground">Sort by</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_match">Best Match</SelectItem>
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
                      userTools={userTools}
                      isInCookbook={savedRecipeIds.has(recipe.id) || savedTitles.has(recipe.title.toLowerCase())}
                      onAddToCookbook={() => addToCookbook(recipe)}
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* My Cookbook Tab */}
          <TabsContent value="cookbook" className="space-y-4">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to save recipes to your cookbook</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : (
              <>
                {/* Import Recipe Button - Always visible */}
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">Add Your Own Recipe</h3>
                          <p className="text-sm text-muted-foreground">Paste any recipe to add it to your cookbook</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowImportDialog(true)}
                        className="gap-2 shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        Add Your Recipe
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <CollapsibleShoppingTips
                  ingredients={userIngredients}
                  tools={userTools}
                  userId={user.id}
                  defaultOpen={false}
                  onIngredientAdded={refreshUserData}
                  onToolAdded={refreshUserData}
                />
                
                {savedRecipes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Your cookbook is empty. Start saving recipes!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {savedRecipes.map(recipe => (
                      <SavedRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        userId={user.id}
                        onRecipeUpdated={() => {
                          // Refresh saved recipes after cooking
                          supabase
                            .from("saved_recipes")
                            .select("*")
                            .eq("user_id", user.id)
                            .order("created_at", { ascending: false })
                            .then(({ data }) => setSavedRecipes(data || []));
                        }}
                        onClick={() => {
                          const publicRecipe = recipe.source_recipe_id
                            ? publicRecipes.find((pr) => pr.id === recipe.source_recipe_id)
                            : publicRecipes.find(
                                (pr) => pr.title.toLowerCase() === recipe.title.toLowerCase(),
                              );

                          setSelectedRecipe({
                            ...recipe,
                            creator_id: publicRecipe?.creator_id,
                            creator_name: publicRecipe?.creator_name,
                            saves_count: publicRecipe?.saves_count,
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Shopping List Tab */}
          <TabsContent value="shopping" className="space-y-4">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to use the shopping list</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : (
              <ShoppingListTab userId={user.id} onAddToInventory={refreshUserData} />
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
          isAdmin={isAdmin}
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
          onAddToCookbook={() => {
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
          onImageRegenerated={(newImageUrl) => {
            setPublicRecipes(prev => prev.map(r => 
              r.id === selectedRecipe.id ? { ...r, image_url: newImageUrl } : r
            ));
            setSelectedRecipe(prev => prev ? { ...prev, image_url: newImageUrl } : null);
          }}
          onIngredientChanged={refreshUserData}
        />
      )}

      {/* Import Recipe Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Your Own Recipe</DialogTitle>
            <DialogDescription>
              Paste a recipe from anywhere and we'll help you add it to your cookbook
            </DialogDescription>
          </DialogHeader>
          {user && (
            <RecipeImporter 
              userId={user.id} 
              onSaved={() => {
                setShowImportDialog(false);
                // Refresh saved recipes
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
                toast.success("Recipe added to your cookbook!");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface RecipeCardProps {
  recipe: PublicRecipe;
  userIngredients: string[];
  userTools?: string[];
  isInCookbook: boolean;
  onAddToCookbook: () => void;
  onClick: () => void;
}

const RecipeCard = ({ recipe, userIngredients, userTools = [], isInCookbook, onAddToCookbook, onClick }: RecipeCardProps) => {
  const normalizeIngredient = (ing: string) => {
    const cleaned = ing.toLowerCase()
      .replace(/\d+[\d\/\s]*(?:cups?|cup|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|tablespoons?|teaspoons?|ounces?|pounds?|grams?|pieces?|slices?|cloves?|heads?|bunches?|cans?|jars?|bottles?|packages?|bags?)/gi, '')
      .replace(/\b(?:fresh|dried|chopped|diced|minced|sliced|whole|ground|large|small|medium|optional|to taste|for serving|for garnish)\b/gi, '')
      .replace(/[,()]/g, '')
      .trim();
    return cleaned;
  };

  // Normalize to singular form for better matching
  const toSingular = (word: string) => {
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('ses') || word.endsWith('zes'))) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  };

  const matchingCount = recipe.ingredients.filter((recipeIng) => {
    const normalizedRecipe = normalizeIngredient(recipeIng);
    if (normalizedRecipe === "water" || normalizedRecipe.includes(" water") || normalizedRecipe.includes("water ")) {
      return true;
    }
    return userIngredients.some((userIng) => {
      const normalizedUser = userIng.toLowerCase().trim();
      const singularRecipe = toSingular(normalizedRecipe);
      const singularUser = toSingular(normalizedUser);
      return normalizedRecipe.includes(normalizedUser) || 
             normalizedUser.includes(normalizedRecipe) ||
             singularRecipe.includes(singularUser) ||
             singularUser.includes(singularRecipe);
    });
  }).length;

  // Calculate tool matches
  const recipeTools = recipe.tools || [];
  const matchingToolsCount = recipeTools.filter((recipeTool) => {
    return userTools.some((userTool) => {
      const normalizedRecipe = recipeTool.toLowerCase().trim();
      const normalizedUser = userTool.toLowerCase().trim();
      return normalizedRecipe.includes(normalizedUser) || normalizedUser.includes(normalizedRecipe);
    });
  }).length;

  // Combined match percentage (ingredients + tools)
  const totalItems = recipe.ingredients.length + recipeTools.length;
  const totalMatches = matchingCount + matchingToolsCount;
  const matchPercentage = totalItems > 0
    ? Math.round((totalMatches / totalItems) * 100)
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
          {recipe.creator_name && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
              <p className="text-xs text-white/90 font-medium">
                Recipe by Chef {recipe.creator_name}
              </p>
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
          <TextToSpeech 
            text={`${recipe.title}. ${recipe.description}. ${recipe.ingredients.length} ingredients. ${(recipe.tools?.length ?? 0) > 0 ? `${recipe.tools!.length} tools needed.` : ''}`}
            size="icon"
          />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{recipe.ingredients.length} ingredients</span>
            {(recipe.tools?.length ?? 0) > 0 && (
              <span>{recipe.tools!.length} tools</span>
            )}
            <span className="flex items-center gap-1">
              <BookmarkPlus className="h-3 w-3" />
              In {recipe.saves_count ?? 0} {(recipe.saves_count ?? 0) === 1 ? "cookbook" : "cookbooks"}
            </span>
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
  userId: string;
  onClick: () => void;
  onRecipeUpdated?: () => void;
}

const SavedRecipeCard = ({ recipe, userId, onClick, onRecipeUpdated }: SavedRecipeCardProps) => {
  const [showCookingMode, setShowCookingMode] = useState(false);

  return (
    <>
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
        {recipe.image_url && (
          <div className="aspect-video relative">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            {recipe.times_made > 0 && (
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                Made {recipe.times_made}x
              </div>
            )}
            <Button
              size="sm"
              className="absolute bottom-2 right-2 gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowCookingMode(true);
              }}
            >
              <ChefHat className="h-4 w-4" />
              Start Cooking
            </Button>
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold line-clamp-1">{recipe.title}</h3>
            <TextToSpeech 
              text={`${recipe.title}. ${recipe.description}. ${recipe.ingredients.length} ingredients.`}
              size="icon"
            />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{recipe.description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{recipe.ingredients.length} ingredients</span>
            {recipe.last_made_at && (
              <span>Last made: {new Date(recipe.last_made_at).toLocaleDateString()}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <CookingModeDialog
        recipe={recipe}
        userId={userId}
        open={showCookingMode}
        onOpenChange={setShowCookingMode}
        onComplete={onRecipeUpdated}
      />
    </>
  );
};

export default RecipeGallery;
