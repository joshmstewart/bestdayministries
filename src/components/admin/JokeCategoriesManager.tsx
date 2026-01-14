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
import { Plus, Edit, Trash2, Eye, EyeOff, Coins, Smile, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { compressImage } from "@/lib/imageUtils";

interface JokeCategory {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  coin_price: number;
  is_free: boolean;
  is_active: boolean;
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
    coin_price: 50,
    is_free: true,
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [generatingAllIcons, setGeneratingAllIcons] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-joke-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("joke_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;

      // Get joke counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from("joke_library")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);
          return { ...cat, joke_count: count || 0 };
        })
      );

      return categoriesWithCounts as JokeCategory[];
    },
  });

  const handleGenerateIcon = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a category name first");
      return;
    }

    setGeneratingIcon(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-joke-category-icon", {
        body: { categoryName: formData.name },
      });

      if (error) throw error;
      setGeneratedImageUrl(data.imageUrl);
      setImageFile(null);
      toast.success("Icon generated!");
    } catch (error) {
      showErrorToastWithCopy("Generating icon", error);
    } finally {
      setGeneratingIcon(false);
    }
  };

  const handleGenerateAllIcons = async () => {
    const categoriesWithoutIcons = categories?.filter(cat => !cat.icon_url) || [];
    if (categoriesWithoutIcons.length === 0) {
      toast.info("All categories already have icons!");
      return;
    }

    setGeneratingAllIcons(true);
    let successCount = 0;
    let failCount = 0;

    for (const category of categoriesWithoutIcons) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-joke-category-icon", {
          body: { categoryName: category.name },
        });

        if (error) throw error;

        const { error: updateError } = await supabase
          .from("joke_categories")
          .update({ icon_url: data.imageUrl })
          .eq("id", category.id);

        if (updateError) throw updateError;
        successCount++;
      } catch (error) {
        console.error(`Failed to generate icon for ${category.name}:`, error);
        failCount++;
      }
    }

    setGeneratingAllIcons(false);
    queryClient.invalidateQueries({ queryKey: ["admin-joke-categories"] });

    if (failCount === 0) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount} icons, ${failCount} failed`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let iconUrl = generatedImageUrl || editingCategory?.icon_url;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`joke-categories/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`joke-categories/${fileName}`);
        iconUrl = urlData.publicUrl;
        setUploading(false);
      }

      const payload = {
        name: data.name.toLowerCase().trim(),
        description: data.description || null,
        icon_url: iconUrl,
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
      setUploading(false);
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

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", description: "", coin_price: 50, is_free: true, display_order: 0 });
    setImageFile(null);
    setGeneratedImageUrl(null);
  };

  const handleEdit = (category: JokeCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      coin_price: category.coin_price || 50,
      is_free: category.is_free,
      display_order: category.display_order || 0,
    });
    setImageFile(null);
    setGeneratedImageUrl(null);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const currentIconUrl = generatedImageUrl || editingCategory?.icon_url;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Smile className="w-5 h-5" />
          Joke Categories
        </CardTitle>
        <div className="flex gap-2">
          {categories && categories.some(c => !c.icon_url) && (
            <Button
              variant="outline"
              onClick={handleGenerateAllIcons}
              disabled={generatingAllIcons}
              className="gap-2"
            >
              {generatingAllIcons ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Generate All Icons
            </Button>
          )}
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

              {/* Icon */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Category Icon
                </Label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateIcon}
                    disabled={generatingIcon || !formData.name.trim()}
                    className="flex-1"
                  >
                    {generatingIcon ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Icon
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setImageFile(e.target.files[0]);
                          setGeneratedImageUrl(null);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Button type="button" variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(currentIconUrl || imageFile) && (
                  <div className="flex justify-center">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : currentIconUrl!}
                      alt="Category icon"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending || uploading} className="flex-1">
                  {(saveMutation.isPending || uploading) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCategory ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
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
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Jokes</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.icon_url ? (
                      <img src={category.icon_url} alt={category.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Smile className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
