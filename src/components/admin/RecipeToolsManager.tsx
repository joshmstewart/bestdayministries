import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

// Tool suggestions by category - comprehensive list
const TOOL_SUGGESTIONS: Record<string, string[]> = {
  appliances: [
    "Air Fryer", "Blender", "Bread Machine", "Coffee Grinder", "Coffee Maker", 
    "Convection Oven", "Crockpot", "Deep Fryer", "Dehydrator", "Electric Griddle",
    "Electric Kettle", "Electric Skillet", "Espresso Machine", "Food Dehydrator",
    "Food Processor", "Freezer", "George Foreman Grill", "Griddle", "Grill", 
    "Hand Blender", "Hand Mixer", "Hot Plate", "Ice Cream Maker", "Immersion Blender",
    "Induction Cooktop", "Instant Pot", "Juicer", "Meat Grinder", "Microwave", 
    "Mixer", "Oven", "Panini Press", "Popcorn Maker", "Pressure Cooker", 
    "Rice Cooker", "Sandwich Maker", "Slow Cooker", "Smoker", "Sous Vide", 
    "Stand Mixer", "Stovetop", "Toaster", "Toaster Oven", "Vacuum Sealer", 
    "Waffle Iron", "Waffle Maker", "Yogurt Maker"
  ],
  cookware: [
    "Baking Dish", "Baking Pan", "Baking Sheet", "Braiser", "Broiler Pan", 
    "Bundt Pan", "Cake Pan", "Casserole Dish", "Cast Iron Skillet", "Ceramic Bakeware",
    "Cookie Sheet", "Crepe Pan", "Double Boiler", "Dutch Oven", "Fondue Pot",
    "Frying Pan", "Glass Bakeware", "Griddle Pan", "Grill Pan", "Jelly Roll Pan",
    "Loaf Pan", "Muffin Tin", "Nonstick Pan", "Omelet Pan", "Paella Pan", 
    "Pie Dish", "Pie Pan", "Pizza Pan", "Pizza Stone", "Pot", "Pressure Cooker Pot",
    "Ramekins", "Roasting Pan", "Saucepan", "Saucier", "Saute Pan", "Sheet Pan",
    "Skillet", "Souffle Dish", "Springform Pan", "Steamer", "Steamer Basket", 
    "Stock Pot", "Stockpot", "Tagine", "Tart Pan", "Tube Pan", "Wok"
  ],
  utensils: [
    "Aluminum Foil", "Apple Corer", "Baster", "Bench Scraper", "Bottle Opener",
    "Bowl", "Box Grater", "Bread Knife", "Butter Knife", "Can Opener", "Cheese Grater",
    "Cheese Slicer", "Chef's Knife", "Cherry Pitter", "Chopsticks", "Citrus Juicer",
    "Citrus Reamer", "Colander", "Cookie Cutters", "Cooling Rack", "Corkscrew",
    "Cutting Board", "Dough Scraper", "Egg Beater", "Egg Separator", "Egg Slicer",
    "Fine Mesh Strainer", "Fish Spatula", "Flour Sifter", "Food Mill", "Fork",
    "Funnel", "Garlic Press", "Grater", "Ice Cream Scoop", "Kitchen Scale",
    "Kitchen Scissors", "Kitchen Shears", "Kitchen Timer", "Kitchen Torch", "Knife",
    "Knife Sharpener", "Ladle", "Lemon Squeezer", "Mandoline", "Mandoline Slicer",
    "Marinade Injector", "Meat Mallet", "Meat Tenderizer", "Meat Thermometer",
    "Measuring Cups", "Measuring Spoons", "Melon Baller", "Microplane", "Mixing Bowl",
    "Mortar and Pestle", "Muffin Liners", "Nutcracker", "Offset Spatula", "Oven Mitts",
    "Paper Towels", "Parchment Paper", "Paring Knife", "Pasta Maker", "Pasta Server",
    "Pastry Bag", "Pastry Blender", "Pastry Brush", "Pastry Cutter", "Peeler",
    "Pepper Mill", "Pie Server", "Piping Tips", "Pizza Cutter", "Pizza Wheel",
    "Plastic Wrap", "Plate", "Potato Masher", "Potato Ricer", "Pot Holder",
    "Prep Bowls", "Ricer", "Rolling Pin", "Rubber Spatula", "Salad Spinner",
    "Santoku Knife", "Sieve", "Silicone Baking Mat", "Silicone Spatula", "Skewer",
    "Slotted Spoon", "Spatula", "Spider Strainer", "Spoon", "Spoon Rest",
    "Strainer", "Thermometer", "Timer", "Tongs", "Turner", "Vegetable Peeler",
    "Whisk", "Wire Rack", "Wire Whisk", "Wok Spatula", "Wooden Spoon", "Zester"
  ],
};

interface RecipeTool {
  id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface GenerationError {
  toolName: string;
  error: string;
}

export const RecipeToolsManager = () => {
  const [tools, setTools] = useState<RecipeTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const [errors, setErrors] = useState<GenerationError[]>([]);
  
  // New tool form state
  const [newToolName, setNewToolName] = useState("");
  const [newToolCategory, setNewToolCategory] = useState("utensils");
  const [addingTool, setAddingTool] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Delete confirmation state
  const [toolToDelete, setToolToDelete] = useState<RecipeTool | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newToolName.trim()) return [];
    
    const searchTerm = newToolName.toLowerCase();
    const existingNames = new Set(tools.map(t => t.name.toLowerCase()));
    
    // Get all suggestions across all categories
    const allSuggestions: { name: string; category: string }[] = [];
    Object.entries(TOOL_SUGGESTIONS).forEach(([category, items]) => {
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
  }, [newToolName, tools]);

  const loadTools = async () => {
    const { data, error } = await supabase
      .from("recipe_tools")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      toast.error("Failed to load tools");
      console.error(error);
    } else {
      // Add cache-busting timestamp to image URLs
      const toolsWithCacheBust = (data || []).map(tool => ({
        ...tool,
        image_url: tool.image_url 
          ? `${tool.image_url}?t=${Date.now()}`
          : null
      }));
      setTools(toolsWithCacheBust);
    }
    setLoading(false);
  };

  // Calculate smart display_order for new tool within its category
  const calculateSmartDisplayOrder = (name: string, category: string): number => {
    const categoryTools = tools
      .filter(t => t.category === category)
      .sort((a, b) => a.display_order - b.display_order);
    
    if (categoryTools.length === 0) {
      return 10;
    }
    
    // Add at end of category
    return categoryTools[categoryTools.length - 1].display_order + 10;
  };

  const handleAddTool = async (name: string, category: string) => {
    if (!name.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    // Check if already exists
    const exists = tools.some(
      t => t.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      toast.error("This tool already exists");
      return;
    }

    setAddingTool(true);
    setShowSuggestions(false);

    // Calculate smart display order
    const smartDisplayOrder = calculateSmartDisplayOrder(name.trim(), category);

    try {
      // Insert the tool
      const { data: newTool, error: insertError } = await supabase
        .from("recipe_tools")
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
      setNewToolName("");

      // Generate icon for the new tool
      const result = await generateIcon(newTool as RecipeTool);
      
      if (result.ok) {
        toast.success(`Icon generated for ${name}!`);
      } else {
        toast.warning(`Added ${name} but icon generation failed. You can regenerate it later.`);
        setErrors(prev => [...prev, { toolName: name, error: result.errorMessage || "Unknown error" }]);
      }

      await loadTools();
    } catch (error) {
      console.error("Failed to add tool:", error);
      toast.error("Failed to add tool");
    } finally {
      setAddingTool(false);
    }
  };

  const generateIcon = async (
    tool: RecipeTool
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-recipe-tool-icon",
        {
          body: {
            toolId: tool.id,
            toolName: tool.name,
            category: tool.category,
          },
        }
      );

      if (error) {
        console.error(`Failed to generate icon for ${tool.name}:`, error);
        return { ok: false, errorMessage: error.message || String(error) };
      }
      
      // Check if the response contains an error
      if ((data as any)?.error) {
        return { ok: false, errorMessage: (data as any).error };
      }

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${tool.name}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errorMessage: message };
    }
  };

  const handleGenerateMissing = async () => {
    const missingIcons = tools.filter((t) => !t.image_url);
    
    if (missingIcons.length === 0) {
      toast.info("All tools already have icons!");
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

    setCurrentTool(`${batch.map(b => b.name).join(", ")}`);

    // Run batch in parallel
    const results = await Promise.all(
      batch.map(async (tool) => {
        const result = await generateIcon(tool);
        return { tool, result };
      })
    );

    // Process results
    for (const { tool, result } of results) {
      if (result.ok) {
        successCount++;
      } else {
        newErrors.push({
          toolName: tool.name,
          error: result.errorMessage || "Unknown error",
        });
      }
    }

    setProgress(100);
    setGenerating(false);
    setCurrentTool(null);
    setErrors(newErrors);

    const remaining = missingIcons.length - BATCH_SIZE;
    if (successCount === total && remaining > 0) {
      toast.success(`Generated ${successCount} icons! ${remaining} remaining.`);
    } else if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. ${newErrors.length} failed - see errors below.`);
    }

    await loadTools();
  };

  const handleRegenerate = async (tool: RecipeTool) => {
    setRegeneratingId(tool.id);

    const result = await generateIcon(tool);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, image_url: cacheBustedUrl } : t))
        );
      }
      // Remove from errors if it was there
      setErrors((prev) => prev.filter((e) => e.toolName !== tool.name));
      toast.success(`Regenerated icon for ${tool.name}`);
    } else {
      // Add to errors for persistent display
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.toolName !== tool.name);
        return [...filtered, { toolName: tool.name, error: result.errorMessage || "Unknown error" }];
      });
      toast.error(`Failed to regenerate icon for ${tool.name}`);
    }

    setRegeneratingId(null);
  };

  const handleCopyErrors = () => {
    const errorText = errors
      .map((e) => `${e.toolName}: ${e.error}`)
      .join("\n");
    navigator.clipboard.writeText(errorText);
    toast.success("Errors copied to clipboard");
  };

  const handleDismissErrors = () => {
    setErrors([]);
  };

  const handleDeleteTool = async () => {
    if (!toolToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("recipe_tools")
        .delete()
        .eq("id", toolToDelete.id);

      if (error) throw error;

      toast.success(`Deleted ${toolToDelete.name}`);
      setTools(prev => prev.filter(t => t.id !== toolToDelete.id));
    } catch (error) {
      console.error("Failed to delete tool:", error);
      toast.error("Failed to delete tool");
    } finally {
      setDeleting(false);
      setToolToDelete(null);
    }
  };

  const missingCount = tools.filter((t) => !t.image_url).length;

  // Group tools by category
  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, RecipeTool[]>);

  // Category display names
  const categoryLabels: Record<string, string> = {
    appliances: "🔌 Appliances",
    cookware: "🍳 Cookware",
    utensils: "🥄 Utensils",
    bakeware: "🧁 Bakeware",
    prep: "🔪 Prep Tools",
    storage: "📦 Storage",
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
      {/* Add New Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Tool
          </CardTitle>
          <CardDescription>
            Type a tool name to see suggestions, or enter a custom tool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Type tool name (e.g., Rolling Pin, Wok, Blender...)"
                value={newToolName}
                onChange={(e) => {
                  setNewToolName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay hiding to allow click on suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                disabled={addingTool}
              />
              
              {/* Suggestions dropdown - only shows NEW tools not in database */}
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
                        setNewToolName(suggestion.name);
                        setNewToolCategory(suggestion.category);
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
            
            <Select value={newToolCategory} onValueChange={setNewToolCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appliances">🔌 Appliances</SelectItem>
                <SelectItem value="cookware">🍳 Cookware</SelectItem>
                <SelectItem value="utensils">🥄 Utensils</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => handleAddTool(newToolName, newToolCategory)}
              disabled={!newToolName.trim() || addingTool}
            >
              {addingTool ? (
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
          <CardTitle>Recipe Maker Kitchen Tools</CardTitle>
          <CardDescription>
            Manage kitchen tool icons for the Recipe Maker game. 
            {missingCount > 0 
              ? ` ${missingCount} tools need icons.`
              : " All tools have icons."}
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
                Generating: {currentTool}...
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
                  <span className="font-semibold">{err.toolName}:</span>{" "}
                  <span className="break-all">{err.error}</span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tools by category */}
      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {categoryLabels[category] || category}
            </CardTitle>
            <CardDescription>
              {categoryTools.filter((t) => t.image_url).length}/{categoryTools.length} have icons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryTools.map((tool) => (
                <div
                  key={tool.id}
                  className="relative group rounded-lg border-2 border-border overflow-hidden aspect-square"
                >
                  {tool.image_url ? (
                    <img
                      src={tool.image_url}
                      alt={tool.name}
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
                    <span className="text-xs text-white font-medium">{tool.name}</span>
                  </div>

                  {/* Actions on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegenerate(tool)}
                      disabled={regeneratingId === tool.id || generating}
                    >
                      {regeneratingId === tool.id ? (
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
                      onClick={() => setToolToDelete(tool)}
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
      <AlertDialog open={!!toolToDelete} onOpenChange={(open) => !open && setToolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{toolToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTool}
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
