import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff, Coins, Smile, Loader2, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";

interface JokeCategory {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  coin_price: number;
  is_free: boolean;
  is_active: boolean;
  show_in_selector: boolean;
  display_order: number;
  joke_count?: number;
}

export function JokeCategoriesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<JokeCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    emoji: "🎲",
    coin_price: 50,
    is_free: true,
    display_order: 0,
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-joke-categories"],
    queryFn: async () => {
      // First get all existing categories
      const { data: existingCategories, error } = await supabase
        .from("joke_categories")
        .select("*");
      if (error) throw error;

      // Get all distinct categories from joke_library
      const { data: jokeCategories, error: jokeError } = await supabase
        .from("joke_library")
        .select("category");
      if (jokeError) throw jokeError;

      // Count jokes per category name
      const categoryCountsByName: Record<string, number> = {};
      (jokeCategories || []).forEach((joke) => {
        const cat = joke.category || "uncategorized";
        categoryCountsByName[cat] = (categoryCountsByName[cat] || 0) + 1;
      });

      // Get unique category names from joke_library
      const usedCategoryNames = new Set(Object.keys(categoryCountsByName));
      const existingCategoryNames = new Set((existingCategories || []).map(c => c.name.toLowerCase()));

      // Find missing categories (in joke_library but not in joke_categories)
      const missingCategories: string[] = [];
      usedCategoryNames.forEach(name => {
        if (!existingCategoryNames.has(name.toLowerCase())) {
          missingCategories.push(name);
        }
      });

      // Insert missing categories as inactive
      if (missingCategories.length > 0) {
        const newCategories = missingCategories.map((name, idx) => ({
          name: name.toLowerCase(),
          is_active: false,
          show_in_selector: false,
          is_free: true,
          coin_price: 0,
          emoji: "🎲",
          display_order: 999 + idx,
        }));

        await supabase.from("joke_categories").insert(newCategories);

        // Re-fetch categories after insert
        const { data: updatedCategories, error: refetchError } = await supabase
          .from("joke_categories")
          .select("*");
        if (refetchError) throw refetchError;
        
        // Add counts and sort
        const categoriesWithCounts = (updatedCategories || []).map((cat) => ({
          ...cat,
          joke_count: categoryCountsByName[cat.name] || 0,
        }));

        return categoriesWithCounts.sort((a, b) => b.joke_count - a.joke_count) as JokeCategory[];
      }

      // Add counts to existing categories and sort by count descending
      const categoriesWithCounts = (existingCategories || []).map((cat) => ({
        ...cat,
        joke_count: categoryCountsByName[cat.name] || 0,
      }));

      return categoriesWithCounts.sort((a, b) => b.joke_count - a.joke_count) as JokeCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name.toLowerCase().trim(),
        description: data.description || null,
        emoji: data.emoji || "🎲",
        coin_price: data.is_free ? 0 : data.coin_price,
        is_free: data.is_free,
        display_order: data.display_order,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("joke_categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("joke_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-joke-categories"] });
      toast.success(editingCategory ? "Category updated!" : "Category created!");
      handleCloseDialog();
    },
    onError: (error) => {
      showErrorToastWithCopy("Saving category", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("joke_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-joke-categories"] });
      toast.success("Category deleted!");
    },
    onError: (error) => showErrorToastWithCopy("Deleting category", error),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("joke_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-joke-categories"] });
    },
  });

  const toggleSelectorMutation = useMutation({
    mutationFn: async ({ id, show_in_selector }: { id: string; show_in_selector: boolean }) => {
      const { error } = await supabase
        .from("joke_categories")
        .update({ show_in_selector })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-joke-categories"] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", emoji: "🎲", coin_price: 50, is_free: true, display_order: 0 });
  };

  const handleEdit = (category: JokeCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      emoji: category.emoji || "🎲",
      coin_price: category.coin_price || 50,
      is_free: category.is_free,
      display_order: category.display_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Joke Categories
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit" : "Add"} Joke Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., dinosaurs"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description for the store"
                  rows={2}
                />
              </div>

              <div>
                <Label>Emoji</Label>
                <Input
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🎲"
                  className="text-2xl"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter an emoji to represent this category
                </p>
              </div>

              {/* Pricing */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Free Category
                  </Label>
                  <Switch
                    checked={formData.is_free}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })}
                  />
                </div>
                {!formData.is_free && (
                  <div>
                    <Label>Price (coins)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.coin_price}
                      onChange={(e) => setFormData({ ...formData, coin_price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emoji</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Jokes</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">In Game</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <span className="text-2xl">{category.emoji || "🎲"}</span>
                  </TableCell>
                  <TableCell className="font-medium capitalize">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {category.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{category.joke_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {category.is_free ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">Free</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Coins className="w-3 h-3" /> {category.coin_price}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSelectorMutation.mutate({ id: category.id, show_in_selector: !category.show_in_selector })}
                      title={category.show_in_selector ? "Showing in game selector" : "Hidden from game selector"}
                    >
                      {category.show_in_selector ? (
                        <Gamepad2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Gamepad2 className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActiveMutation.mutate({ id: category.id, is_active: !category.is_active })}
                    >
                      {category.is_active ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-500" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(category.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={category.joke_count && category.joke_count > 0}
                        title={category.joke_count && category.joke_count > 0 ? "Cannot delete category with jokes" : "Delete category"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No categories yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
