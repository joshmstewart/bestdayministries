import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Wand2, RefreshCw, Check, ImageOff, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Ingredient = Database["public"]["Tables"]["drink_ingredients"]["Row"];
type IngredientCategory = Database["public"]["Enums"]["ingredient_category"];

const CATEGORIES: IngredientCategory[] = ["base", "flavor", "topping", "extra"];

interface IngredientFormData {
  name: string;
  category: IngredientCategory;
  description: string;
  color_hint: string;
  is_active: boolean;
}

const defaultFormData: IngredientFormData = {
  name: "",
  category: "flavor",
  description: "",
  color_hint: "",
  is_active: true,
};

export const DrinkIngredientsManager = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIngredient, setCurrentIngredient] = useState<string | null>(null);
  
  // CRUD state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState<IngredientFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const { data, error } = await supabase
      .from("drink_ingredients")
      .select("*")
      .order("category")
      .order("display_order");

    if (error) {
      toast.error("Failed to load ingredients");
      console.error(error);
    } else {
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

  const generateIcon = async (
    ingredient: Ingredient
  ): Promise<{ ok: boolean; imageUrl?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-ingredient-icon",
        {
          body: {
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            category: ingredient.category,
          },
        }
      );

      if (error) throw error;

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${ingredient.name}:`, error);
      return { ok: false };
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

    let successCount = 0;
    const total = missingIcons.length;

    for (let i = 0; i < missingIcons.length; i++) {
      const ingredient = missingIcons[i];
      setCurrentIngredient(ingredient.name);

      const success = await generateIcon(ingredient);
      if (success) successCount++;

      setProgress(((i + 1) / total) * 100);

      if (i < missingIcons.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setGenerating(false);
    setCurrentIngredient(null);

    if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. Some failed.`);
    }

    await loadIngredients();
  };

  const handleRegenerate = async (ingredient: Ingredient) => {
    setRegeneratingId(ingredient.id);

    const result = await generateIcon(ingredient);

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setIngredients((prev) =>
          prev.map((i) => (i.id === ingredient.id ? { ...i, image_url: cacheBustedUrl } : i))
        );
      }
      toast.success(`Regenerated icon for ${ingredient.name}`);
    } else {
      toast.error(`Failed to regenerate icon for ${ingredient.name}`);
    }

    setRegeneratingId(null);
  };

  // CRUD handlers
  const openAddDialog = () => {
    setEditingIngredient(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      description: ingredient.description || "",
      color_hint: ingredient.color_hint || "",
      is_active: ingredient.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingIngredient) {
        // Update
        const { error } = await supabase
          .from("drink_ingredients")
          .update({
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null,
            color_hint: formData.color_hint.trim() || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingIngredient.id);

        if (error) throw error;
        toast.success("Ingredient updated!");
      } else {
        // Insert - get max display_order for the category
        const { data: maxOrderData } = await supabase
          .from("drink_ingredients")
          .select("display_order")
          .eq("category", formData.category)
          .order("display_order", { ascending: false })
          .limit(1)
          .single();

        const newOrder = (maxOrderData?.display_order || 0) + 1;

        const { error } = await supabase
          .from("drink_ingredients")
          .insert({
            name: formData.name.trim(),
            category: formData.category,
            description: formData.description.trim() || null,
            color_hint: formData.color_hint.trim() || null,
            is_active: formData.is_active,
            display_order: newOrder,
          });

        if (error) throw error;
        toast.success("Ingredient added!");
      }

      setIsDialogOpen(false);
      await loadIngredients();
    } catch (error) {
      console.error("Error saving ingredient:", error);
      toast.error("Failed to save ingredient");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ingredient: Ingredient) => {
    if (!confirm(`Delete "${ingredient.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("drink_ingredients")
      .delete()
      .eq("id", ingredient.id);

    if (error) {
      toast.error("Failed to delete ingredient");
      console.error(error);
    } else {
      toast.success("Ingredient deleted");
      await loadIngredients();
    }
  };

  const toggleActive = async (ingredient: Ingredient) => {
    const { error } = await supabase
      .from("drink_ingredients")
      .update({ is_active: !ingredient.is_active, updated_at: new Date().toISOString() })
      .eq("id", ingredient.id);

    if (error) {
      toast.error("Failed to update ingredient");
    } else {
      setIngredients(prev => 
        prev.map(i => i.id === ingredient.id ? { ...i, is_active: !ingredient.is_active } : i)
      );
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
  }, {} as Record<string, Ingredient[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Drink Creator Ingredients</span>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </CardTitle>
          <CardDescription>
            Manage ingredient icons for the Drink Creator game. 
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

      {/* Ingredients by category */}
      {CATEGORIES.map((category) => {
        const categoryIngredients = groupedIngredients[category] || [];
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg capitalize">{category}</CardTitle>
              <CardDescription>
                {categoryIngredients.filter((i) => i.image_url).length}/{categoryIngredients.length} have icons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryIngredients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No ingredients in this category yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categoryIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className={`relative group rounded-lg border-2 overflow-hidden aspect-square ${
                        !ingredient.is_active ? "opacity-50" : ""
                      }`}
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

                      {/* Active indicator */}
                      {!ingredient.is_active && (
                        <div className="absolute top-2 left-2">
                          <EyeOff className="w-4 h-4 text-white drop-shadow-md" />
                        </div>
                      )}

                      {/* Action buttons on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => openEditDialog(ingredient)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handleRegenerate(ingredient)}
                          disabled={regeneratingId === ingredient.id || generating}
                          title="Regenerate icon"
                        >
                          {regeneratingId === ingredient.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => toggleActive(ingredient)}
                          title={ingredient.is_active ? "Hide" : "Show"}
                        >
                          {ingredient.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(ingredient)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIngredient ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
            <DialogDescription>
              {editingIngredient ? "Update the ingredient details below." : "Add a new ingredient to the Drink Creator."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Vanilla Syrup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: IngredientCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the ingredient"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color_hint">Color Hint</Label>
              <Input
                id="color_hint"
                value={formData.color_hint}
                onChange={(e) => setFormData({ ...formData, color_hint: e.target.value })}
                placeholder="e.g., amber, pink, green"
              />
              <p className="text-xs text-muted-foreground">Used for AI icon generation</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingIngredient ? "Save Changes" : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
