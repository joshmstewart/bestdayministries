import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, RefreshCw, Trash2, UtensilsCrossed, Carrot, Pencil, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// Category options
const INGREDIENT_CATEGORIES = ["protein", "dairy", "grains", "fruits", "vegetables", "condiments", "pantry"] as const;
const TOOL_CATEGORIES = ["appliances", "cookware", "utensils"] as const;

// Keywords to auto-detect ingredient category
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  protein: ["chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "bacon", "sausage", "turkey", "lamb", "egg", "tofu", "tempeh"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "sour cream", "cottage", "ricotta", "mozzarella", "parmesan", "cheddar"],
  grains: ["rice", "pasta", "bread", "flour", "oats", "quinoa", "barley", "cereal", "noodle", "tortilla", "cracker", "wheat"],
  fruits: ["apple", "banana", "orange", "lemon", "lime", "berry", "strawberry", "blueberry", "grape", "mango", "peach", "pear", "cherry", "pineapple", "watermelon", "coconut"],
  vegetables: ["onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper", "broccoli", "spinach", "lettuce", "cucumber", "zucchini", "mushroom", "corn", "pea", "bean", "cabbage", "kale", "parsley", "cilantro", "basil", "mint", "oregano", "thyme", "rosemary", "dill", "chive", "scallion", "leek", "ginger"],
  condiments: ["sauce", "ketchup", "mustard", "mayo", "mayonnaise", "vinegar", "soy sauce", "hot sauce", "salsa", "dressing", "relish", "honey", "syrup", "jam", "jelly"],
  pantry: ["salt", "pepper", "sugar", "oil", "olive oil", "vegetable oil", "baking", "vanilla", "cinnamon", "paprika", "cumin", "chili", "nutmeg", "stock", "broth", "wine", "spice", "seasoning", "powder"],
};

// Keywords to auto-detect tool category
const TOOL_CATEGORY_KEYWORDS: Record<string, string[]> = {
  appliances: ["blender", "mixer", "processor", "microwave", "oven", "toaster", "grill", "fryer", "instant pot", "slow cooker", "rice cooker"],
  cookware: ["pan", "pot", "skillet", "wok", "baking", "sheet", "casserole", "dutch oven", "saucepan", "stockpot"],
  utensils: ["knife", "spoon", "fork", "spatula", "whisk", "tongs", "ladle", "peeler", "grater", "zester", "masher", "colander", "strainer", "cutting board", "bowl", "measuring"],
};

function detectCategory(name: string, isIngredient: boolean): string {
  const nameLower = name.toLowerCase();
  const keywords = isIngredient ? CATEGORY_KEYWORDS : TOOL_CATEGORY_KEYWORDS;
  
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => nameLower.includes(word))) {
      return category;
    }
  }
  
  // Default categories
  return isIngredient ? "pantry" : "utensils";
}

interface UnmatchedItem {
  id: string;
  item_name: string;
  item_type: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  is_resolved: boolean;
  resolved_to: string | null;
  resolved_at: string | null;
}

// Preparation terms that should be stripped to find the actual ingredient
const PREP_PATTERNS: { pattern: RegExp; toolSuggestion?: string }[] = [
  { pattern: /^zest\s+of\s+/i, toolSuggestion: "Zester" },
  { pattern: /\s+zest$/i, toolSuggestion: "Zester" },
  { pattern: /^juice\s+of\s+/i, toolSuggestion: "Juicer" },
  { pattern: /\s+juice$/i, toolSuggestion: "Juicer" },
  { pattern: /^minced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^diced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^chopped\s+/i, toolSuggestion: "Knife" },
  { pattern: /^sliced\s+/i, toolSuggestion: "Knife" },
  { pattern: /^grated\s+/i, toolSuggestion: "Grater" },
  { pattern: /^shredded\s+/i, toolSuggestion: "Grater" },
  { pattern: /^mashed\s+/i, toolSuggestion: "Masher" },
  { pattern: /^crushed\s+/i },
  { pattern: /^ground\s+/i },
  { pattern: /^fresh\s+/i },
  { pattern: /^dried\s+/i },
  { pattern: /^frozen\s+/i },
  { pattern: /^melted\s+/i },
  { pattern: /^softened\s+/i },
  { pattern: /^cooked\s+/i },
  { pattern: /^raw\s+/i },
];

interface FormattedResult {
  name: string;
  toolSuggestion?: string;
}

// Format item name intelligently - extract actual ingredient from prep descriptions
function formatItemName(name: string): FormattedResult {
  let cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  let toolSuggestion: string | undefined;

  // Apply preparation patterns
  for (const { pattern, toolSuggestion: tool } of PREP_PATTERNS) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
      if (tool && !toolSuggestion) {
        toolSuggestion = tool;
      }
    }
  }

  // Capitalize each word
  const formatted = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();

  return { name: formatted, toolSuggestion };
}

export function RecipeUnmatchedItemsManager() {
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ingredients");
  const [existingIngredients, setExistingIngredients] = useState<Map<string, string>>(new Map()); // name -> image_url
  const [existingTools, setExistingTools] = useState<Map<string, string>>(new Map()); // name -> image_url
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, { name: string; toolSuggestion?: string; category?: string }>>({});
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadItems();
    loadExistingItems();
  }, []);

  const loadExistingItems = async () => {
    try {
      const [ingredientsResult, toolsResult] = await Promise.all([
        supabase.from("recipe_ingredients").select("name, image_url"),
        supabase.from("recipe_tools").select("name, image_url"),
      ]);

      if (ingredientsResult.data) {
        const map = new Map<string, string>();
        ingredientsResult.data.forEach(i => map.set(i.name.toLowerCase(), i.image_url || ''));
        setExistingIngredients(map);
      }
      if (toolsResult.data) {
        const map = new Map<string, string>();
        toolsResult.data.forEach(t => map.set(t.name.toLowerCase(), t.image_url || ''));
        setExistingTools(map);
      }
    } catch (err) {
      console.error("Error loading existing items:", err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipe_unmatched_items")
        .select("*")
        .order("occurrence_count", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error loading unmatched items:", err);
      toast.error("Failed to load unmatched items");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAndResolve = async (item: UnmatchedItem) => {
    const formatted = getFormattedForItem(item);
    const isIngredient = item.item_type === "ingredient";
    const category = formatted.category || detectCategory(formatted.name, isIngredient);
    
    try {
      let insertedId: string | null = null;
      
      // First, add to the appropriate table
      if (isIngredient) {
        const { data: insertData, error: insertError } = await supabase
          .from("recipe_ingredients")
          .insert({
            name: formatted.name,
            category: category,
            is_active: true,
          })
          .select("id")
          .single();
        
        if (insertError) {
          if (insertError.code === "23505") {
            // Duplicate - already exists, just mark as resolved
            console.log("Ingredient already exists, marking as resolved");
            // Get the existing ID for image generation
            const { data: existing } = await supabase
              .from("recipe_ingredients")
              .select("id")
              .ilike("name", formatted.name)
              .single();
            insertedId = existing?.id || null;
          } else {
            throw insertError;
          }
        } else {
          insertedId = insertData?.id || null;
        }
        
        // Update existing ingredients map
        setExistingIngredients(prev => new Map([...prev, [formatted.name.toLowerCase(), '']]));
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from("recipe_tools")
          .insert({
            name: formatted.name,
            category: category,
            is_active: true,
          })
          .select("id")
          .single();
        
        if (insertError) {
          if (insertError.code === "23505") {
            console.log("Tool already exists, marking as resolved");
            // Get the existing ID for image generation
            const { data: existing } = await supabase
              .from("recipe_tools")
              .select("id")
              .ilike("name", formatted.name)
              .single();
            insertedId = existing?.id || null;
          } else {
            throw insertError;
          }
        } else {
          insertedId = insertData?.id || null;
        }
        
        // Update existing tools map
        setExistingTools(prev => new Map([...prev, [formatted.name.toLowerCase(), '']]));
      }
      
      // Also add suggested tool if present (for ingredients)
      if (isIngredient && formatted.toolSuggestion) {
        const toolCategory = detectCategory(formatted.toolSuggestion, false);
        await supabase
          .from("recipe_tools")
          .insert({
            name: formatted.toolSuggestion,
            category: toolCategory,
            is_active: true,
          })
          .then(({ error }) => {
            if (error && error.code !== "23505") {
              console.error("Failed to add suggested tool:", error);
            }
          });
      }
      
      // Mark as resolved
      const { error } = await supabase
        .from("recipe_unmatched_items")
        .update({
          is_resolved: true,
          resolved_to: `Added: ${formatted.name} (${category})`,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success(`Added "${formatted.name}" to ${isIngredient ? "ingredients" : "tools"} (${category})`);
      setEditingId(null);
      setEditedNames(prev => {
        const newNames = { ...prev };
        delete newNames[item.id];
        return newNames;
      });
      loadItems();
      
      // Auto-generate image in background
      if (insertedId) {
        generateImageForItem(item.id, insertedId, formatted.name, category, isIngredient);
      }
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Failed to add item");
    }
  };

  const generateImageForItem = async (
    unmatchedItemId: string,
    itemId: string,
    name: string,
    category: string,
    isIngredient: boolean
  ) => {
    setGeneratingImageFor(unmatchedItemId);
    
    try {
      const functionName = isIngredient ? "generate-recipe-ingredient-icon" : "generate-recipe-tool-icon";
      const payload = isIngredient
        ? { ingredientId: itemId, ingredientName: name, category }
        : { toolId: itemId, toolName: name, category };
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });
      
      if (error) {
        console.error("Image generation error:", error);
        toast.error(`Failed to generate image for "${name}"`);
        return;
      }
      
      if (data?.imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [unmatchedItemId]: data.imageUrl }));
        toast.success(`Generated image for "${name}"`);
      }
    } catch (err) {
      console.error("Error generating image:", err);
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleDelete = async (item: UnmatchedItem) => {
    try {
      const { error } = await supabase
        .from("recipe_unmatched_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      toast.success(`Deleted "${item.item_name}"`);
      loadItems();
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to delete item");
    }
  };

  const getFormattedForItem = (item: UnmatchedItem): FormattedResult & { category?: string } => {
    // If we have an edited value, use that
    if (editedNames[item.id]) {
      return editedNames[item.id];
    }
    // Otherwise calculate from original
    const formatted = formatItemName(item.item_name);
    const category = detectCategory(formatted.name, item.item_type === "ingredient");
    return { ...formatted, category };
  };

  const startEditing = (item: UnmatchedItem) => {
    const formatted = formatItemName(item.item_name);
    const category = detectCategory(formatted.name, item.item_type === "ingredient");
    setEditedNames(prev => ({
      ...prev,
      [item.id]: { ...formatted, category },
    }));
    setEditingId(item.id);
  };

  const updateEditedName = (itemId: string, field: 'name' | 'toolSuggestion' | 'category', value: string) => {
    setEditedNames(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value || undefined,
      },
    }));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  // Check if the formatted name already exists
  const checkAlreadyExists = (formattedName: string, itemType: string): boolean => {
    const nameLower = formattedName.toLowerCase();
    if (itemType === "ingredient") {
      return existingIngredients.has(nameLower);
    } else {
      return existingTools.has(nameLower);
    }
  };

  // Get the image URL for a resolved item
  const getExistingImageUrl = (item: UnmatchedItem): string | null => {
    const formatted = formatItemName(item.item_name);
    const nameLower = formatted.name.toLowerCase();
    if (item.item_type === "ingredient") {
      return existingIngredients.get(nameLower) || null;
    } else {
      return existingTools.get(nameLower) || null;
    }
  };

  // Filter items - show only those whose formatted name doesn't already exist
  const filteredItems = items.filter(item => {
    // First filter by tab
    if (activeTab === "ingredients" && item.item_type !== "ingredient") return false;
    if (activeTab === "tools" && item.item_type !== "tool") return false;
    
    // If resolved, show it
    if (item.is_resolved) return true;
    
    // Check if formatted name already exists - if so, auto-resolve it
    const formatted = formatItemName(item.item_name);
    const alreadyExists = checkAlreadyExists(formatted.name, item.item_type);
    
    return !alreadyExists;
  });

  // Auto-resolve items that match existing ingredients/tools
  useEffect(() => {
    const autoResolveMatches = async () => {
      if (existingIngredients.size === 0 && existingTools.size === 0) return;
      
      for (const item of items) {
        if (item.is_resolved) continue;
        
        const formatted = formatItemName(item.item_name);
        const alreadyExists = checkAlreadyExists(formatted.name, item.item_type);
        
        if (alreadyExists) {
          // Auto-resolve this item
          await supabase
            .from("recipe_unmatched_items")
            .update({
              is_resolved: true,
              resolved_to: `Auto-matched: ${formatted.name}`,
              resolved_at: new Date().toISOString(),
            })
            .eq("id", item.id);
        }
      }
      
      // Reload to reflect changes
      loadItems();
    };

    if (items.length > 0 && (existingIngredients.size > 0 || existingTools.size > 0)) {
      autoResolveMatches();
    }
  }, [existingIngredients, existingTools]); // Only run when existing items are loaded

  const unresolvedCount = (type: string) => {
    return items.filter(i => {
      if (i.item_type !== type || i.is_resolved) return false;
      const formatted = formatItemName(i.item_name);
      return !checkAlreadyExists(formatted.name, i.item_type);
    }).length;
  };

  const totalOccurrences = (type: string) =>
    items.filter(i => {
      if (i.item_type !== type || i.is_resolved) return false;
      const formatted = formatItemName(i.item_name);
      return !checkAlreadyExists(formatted.name, i.item_type);
    }).reduce((sum, i) => sum + i.occurrence_count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Unmatched Recipe Items
            </CardTitle>
            <CardDescription>
              Items from user-imported recipes that don't match wizard ingredients/tools. 
              Items matching existing entries are auto-resolved.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <Carrot className="h-4 w-4" />
              Ingredients
              {unresolvedCount("ingredient") > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unresolvedCount("ingredient")}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Tools
              {unresolvedCount("tool") > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unresolvedCount("tool")}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="p-4">
                <div className="text-2xl font-bold">{unresolvedCount(activeTab === "ingredients" ? "ingredient" : "tool")}</div>
                <div className="text-sm text-muted-foreground">Unresolved Items</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">{totalOccurrences(activeTab === "ingredients" ? "ingredient" : "tool")}</div>
                <div className="text-sm text-muted-foreground">Total Occurrences</div>
              </Card>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No unmatched {activeTab} found!</p>
                <p className="text-sm">All imported recipe items match the wizard.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original Name</TableHead>
                    <TableHead>Formatted Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Times Seen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Image</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const formatted = getFormattedForItem(item);
                    const isEditing = editingId === item.id;
                    
                    return (
                      <TableRow key={item.id} className={item.is_resolved ? "opacity-50" : ""}>
                        <TableCell className="font-medium text-muted-foreground">
                          {item.item_name}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={formatted.name}
                                onChange={(e) => updateEditedName(item.id, 'name', e.target.value)}
                                className="h-8 w-40"
                                placeholder={item.item_type === "ingredient" ? "Ingredient name" : "Tool name"}
                              />
                              {item.item_type === "ingredient" && formatted.toolSuggestion && (
                                <Input
                                  value={formatted.toolSuggestion || ''}
                                  onChange={(e) => updateEditedName(item.id, 'toolSuggestion', e.target.value)}
                                  className="h-8 w-40"
                                  placeholder="Tool suggestion (optional)"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="bg-primary/10 text-primary font-medium w-fit">
                                {formatted.name}
                              </Badge>
                              {formatted.toolSuggestion && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <UtensilsCrossed className="h-3 w-3" />
                                  + {formatted.toolSuggestion}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select
                              value={formatted.category || detectCategory(formatted.name, item.item_type === "ingredient")}
                              onValueChange={(value) => updateEditedName(item.id, 'category', value)}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(item.item_type === "ingredient" ? INGREDIENT_CATEGORIES : TOOL_CATEGORIES).map((cat) => (
                                  <SelectItem key={cat} value={cat} className="capitalize">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="capitalize">
                              {formatted.category || detectCategory(formatted.name, item.item_type === "ingredient")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.occurrence_count >= 5 ? "destructive" : item.occurrence_count >= 2 ? "secondary" : "outline"}>
                            {item.occurrence_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.is_resolved ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const existingImageUrl = getExistingImageUrl(item);
                            if (generatingImageFor === item.id) {
                              return (
                                <div className="flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              );
                            } else if (generatedImages[item.id]) {
                              return (
                                <img
                                  src={generatedImages[item.id]}
                                  alt={formatted.name}
                                  className="h-10 w-10 rounded object-cover mx-auto"
                                />
                              );
                            } else if (existingImageUrl) {
                              return (
                                <img
                                  src={existingImageUrl}
                                  alt={formatted.name}
                                  className="h-10 w-10 rounded object-cover mx-auto"
                                />
                              );
                            } else if (item.is_resolved) {
                              return <span className="text-muted-foreground text-xs">—</span>;
                            } else {
                              return <ImageIcon className="h-5 w-5 text-muted-foreground/30 mx-auto" />;
                            }
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!item.is_resolved && (
                              <>
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddAndResolve(item)}
                                      title="Add to list and resolve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditing}
                                      title="Cancel editing"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditing(item)}
                                      title="Edit before adding"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddAndResolve(item)}
                                      title={`Add "${formatted.name}" to ${item.item_type}s`}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="text-destructive hover:text-destructive"
                              title="Delete this item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
