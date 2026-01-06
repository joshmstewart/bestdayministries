import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Coffee } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_small: number | null;
  price_large: number | null;
  price_hot_12oz: number | null;
  price_hot_16oz: number | null;
  price_iced_16oz: number | null;
  price_iced_24oz: number | null;
  single_price: number | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
}

interface MenuAddon {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  display_order: number;
  is_active: boolean;
}

const CoffeeShopMenuManager = () => {
  const queryClient = useQueryClient();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingAddon, setEditingAddon] = useState<MenuAddon | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price_small: "",
    price_large: "",
    price_hot_12oz: "",
    price_hot_16oz: "",
    price_iced_16oz: "",
    price_iced_24oz: "",
    single_price: "",
    is_featured: false
  });
  const [addonForm, setAddonForm] = useState({ category_id: "", name: "", price: "" });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["coffee-menu-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as MenuCategory[];
    }
  });

  // Fetch items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["coffee-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_items")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as MenuItem[];
    }
  });

  // Fetch addons
  const { data: addons = [], isLoading: addonsLoading } = useQuery({
    queryKey: ["coffee-menu-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coffee_shop_menu_addons")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as MenuAddon[];
    }
  });

  // Category mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; description: string | null }) => {
      if (editingCategory) {
        const { error } = await supabase
          .from("coffee_shop_menu_categories")
          .update(category)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...categories.map(c => c.display_order));
        const { error } = await supabase
          .from("coffee_shop_menu_categories")
          .insert({ 
            name: category.name, 
            description: category.description,
            display_order: maxOrder + 1 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
      toast.success(editingCategory ? "Category updated" : "Category created");
    },
    onError: () => toast.error("Failed to save category")
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coffee_shop_menu_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-items"] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category")
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coffee_shop_menu_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-categories"] });
    }
  });

  // Item mutations
  const saveItemMutation = useMutation({
    mutationFn: async (item: {
      category_id: string;
      name: string;
      description: string | null;
      price_small: number | null;
      price_large: number | null;
      price_hot_12oz: number | null;
      price_hot_16oz: number | null;
      price_iced_16oz: number | null;
      price_iced_24oz: number | null;
      single_price: number | null;
      is_featured: boolean;
    }) => {
      if (editingItem) {
        const { error } = await supabase
          .from("coffee_shop_menu_items")
          .update(item)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const categoryItems = items.filter(i => i.category_id === item.category_id);
        const maxOrder = Math.max(0, ...categoryItems.map(i => i.display_order));
        const { error } = await supabase
          .from("coffee_shop_menu_items")
          .insert({ 
            ...item, 
            display_order: maxOrder + 1 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-items"] });
      setItemDialogOpen(false);
      setEditingItem(null);
      resetItemForm();
      toast.success(editingItem ? "Item updated" : "Item created");
    },
    onError: () => toast.error("Failed to save item")
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coffee_shop_menu_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-items"] });
      toast.success("Item deleted");
    },
    onError: () => toast.error("Failed to delete item")
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coffee_shop_menu_items")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-items"] });
    }
  });

  // Addon mutations
  const saveAddonMutation = useMutation({
    mutationFn: async (addon: { category_id: string | null; name: string; price: number }) => {
      if (editingAddon) {
        const { error } = await supabase
          .from("coffee_shop_menu_addons")
          .update(addon)
          .eq("id", editingAddon.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...addons.map(a => a.display_order));
        const { error } = await supabase
          .from("coffee_shop_menu_addons")
          .insert({ 
            name: addon.name,
            price: addon.price,
            category_id: addon.category_id,
            display_order: maxOrder + 1 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-addons"] });
      setAddonDialogOpen(false);
      setEditingAddon(null);
      setAddonForm({ category_id: "", name: "", price: "" });
      toast.success(editingAddon ? "Add-on updated" : "Add-on created");
    },
    onError: () => toast.error("Failed to save add-on")
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coffee_shop_menu_addons")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee-menu-addons"] });
      toast.success("Add-on deleted");
    },
    onError: () => toast.error("Failed to delete add-on")
  });

  const resetItemForm = () => {
    setItemForm({
      category_id: selectedCategoryId || "",
      name: "",
      description: "",
      price_small: "",
      price_large: "",
      price_hot_12oz: "",
      price_hot_16oz: "",
      price_iced_16oz: "",
      price_iced_24oz: "",
      single_price: "",
      is_featured: false
    });
  };

  const openEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || "" });
    setCategoryDialogOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || "",
      price_small: item.price_small?.toString() || "",
      price_large: item.price_large?.toString() || "",
      price_hot_12oz: item.price_hot_12oz?.toString() || "",
      price_hot_16oz: item.price_hot_16oz?.toString() || "",
      price_iced_16oz: item.price_iced_16oz?.toString() || "",
      price_iced_24oz: item.price_iced_24oz?.toString() || "",
      single_price: item.single_price?.toString() || "",
      is_featured: item.is_featured
    });
    setItemDialogOpen(true);
  };

  const openEditAddon = (addon: MenuAddon) => {
    setEditingAddon(addon);
    setAddonForm({
      category_id: addon.category_id || "",
      name: addon.name,
      price: addon.price.toString()
    });
    setAddonDialogOpen(true);
  };

  const handleSaveCategory = () => {
    saveCategoryMutation.mutate({
      name: categoryForm.name,
      description: categoryForm.description || null
    });
  };

  const handleSaveItem = () => {
    const parsePrice = (val: string) => val ? parseFloat(val) : null;
    saveItemMutation.mutate({
      category_id: itemForm.category_id,
      name: itemForm.name,
      description: itemForm.description || null,
      price_small: parsePrice(itemForm.price_small),
      price_large: parsePrice(itemForm.price_large),
      price_hot_12oz: parsePrice(itemForm.price_hot_12oz),
      price_hot_16oz: parsePrice(itemForm.price_hot_16oz),
      price_iced_16oz: parsePrice(itemForm.price_iced_16oz),
      price_iced_24oz: parsePrice(itemForm.price_iced_24oz),
      single_price: parsePrice(itemForm.single_price),
      is_featured: itemForm.is_featured
    });
  };

  const handleSaveAddon = () => {
    saveAddonMutation.mutate({
      category_id: addonForm.category_id || null,
      name: addonForm.name,
      price: parseFloat(addonForm.price)
    });
  };

  const isLoading = categoriesLoading || itemsLoading || addonsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coffee className="w-6 h-6" />
            Menu Management
          </h2>
          <p className="text-muted-foreground">
            Manage menu categories, items, and pricing
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons.length})</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", description: "" }); setCategoryDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
          
          <div className="grid gap-4">
            {categories.map((cat) => (
              <Card key={cat.id} className={!cat.is_active ? "opacity-60" : ""}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">{cat.name}</CardTitle>
                        {cat.description && <CardDescription>{cat.description}</CardDescription>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {items.filter(i => i.category_id === cat.id).length} items
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => toggleCategoryMutation.mutate({ id: cat.id, is_active: !cat.is_active })}
                        title={cat.is_active ? "Hide category" : "Show category"}
                      >
                        {cat.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => openEditCategory(cat)} title="Edit category">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Delete this category and all its items?")) {
                            deleteCategoryMutation.mutate(cat.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No categories yet. Add your first category to get started.</p>
            )}
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingItem(null); resetItemForm(); setItemDialogOpen(true); }} disabled={categories.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
          
          <div className="grid gap-3">
            {items
              .filter(item => !selectedCategoryId || selectedCategoryId === "all" || item.category_id === selectedCategoryId)
              .map((item) => {
                const category = categories.find(c => c.id === item.category_id);
                return (
                  <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {category?.name} • {item.description || "No description"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-medium text-primary whitespace-nowrap">
                            {item.single_price ? `$${item.single_price.toFixed(2)}` : 
                             item.price_small ? `$${item.price_small.toFixed(2)}+` :
                             item.price_hot_12oz ? `$${item.price_hot_12oz.toFixed(2)}+` : "—"}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => toggleItemMutation.mutate({ id: item.id, is_active: !item.is_active })}
                          >
                            {item.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => openEditItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { if (confirm("Delete this item?")) deleteItemMutation.mutate(item.id); }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            {items.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No menu items yet. Add a category first, then add items.</p>
            )}
          </div>
        </TabsContent>

        {/* Add-ons Tab */}
        <TabsContent value="addons" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingAddon(null); setAddonForm({ category_id: "", name: "", price: "" }); setAddonDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Add-on
            </Button>
          </div>
          
          <div className="grid gap-3">
            {addons.map((addon) => (
              <Card key={addon.id} className={!addon.is_active ? "opacity-60" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{addon.name}</p>
                        {addon.category_id && (
                          <p className="text-sm text-muted-foreground">
                            {categories.find(c => c.id === addon.category_id)?.name || "Unknown category"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">${addon.price.toFixed(2)}</span>
                      <Button size="icon" variant="outline" onClick={() => openEditAddon(addon)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { if (confirm("Delete this add-on?")) deleteAddonMutation.mutate(addon.id); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {addons.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No add-ons yet. Add common add-ons like extra shots or milk substitutes.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Menu categories group similar items together</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Coffee, Crepes, Specialty Drinks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Textarea
                id="cat-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name || saveCategoryMutation.isPending}>
              {saveCategoryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>Add or update menu item details and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-cat">Category</Label>
                <Select value={itemForm.category_id} onValueChange={(val) => setItemForm(prev => ({ ...prev, category_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Caramel Latte"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item-desc">Description (optional)</Label>
              <Textarea
                id="item-desc"
                value={itemForm.description}
                onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Espresso with steamed milk and caramel syrup"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Pricing</Label>
              <p className="text-sm text-muted-foreground">Fill in the pricing tiers that apply to this item. Leave others empty.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="price-single" className="text-xs">Single Price</Label>
                  <Input
                    id="price-single"
                    type="number"
                    step="0.01"
                    value={itemForm.single_price}
                    onChange={(e) => setItemForm(prev => ({ ...prev, single_price: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-small" className="text-xs">Small</Label>
                  <Input
                    id="price-small"
                    type="number"
                    step="0.01"
                    value={itemForm.price_small}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_small: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-large" className="text-xs">Large</Label>
                  <Input
                    id="price-large"
                    type="number"
                    step="0.01"
                    value={itemForm.price_large}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_large: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground pt-2">Coffee-style sizing (Hot/Iced):</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="price-hot12" className="text-xs">Hot 12oz</Label>
                  <Input
                    id="price-hot12"
                    type="number"
                    step="0.01"
                    value={itemForm.price_hot_12oz}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_hot_12oz: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-hot16" className="text-xs">Hot 16oz</Label>
                  <Input
                    id="price-hot16"
                    type="number"
                    step="0.01"
                    value={itemForm.price_hot_16oz}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_hot_16oz: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-iced16" className="text-xs">Iced 16oz</Label>
                  <Input
                    id="price-iced16"
                    type="number"
                    step="0.01"
                    value={itemForm.price_iced_16oz}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_iced_16oz: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="price-iced24" className="text-xs">Iced 24oz</Label>
                  <Input
                    id="price-iced24"
                    type="number"
                    step="0.01"
                    value={itemForm.price_iced_24oz}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price_iced_24oz: e.target.value }))}
                    placeholder="$0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.is_featured}
                onCheckedChange={(checked) => setItemForm(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label>Featured item</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={!itemForm.name || !itemForm.category_id || saveItemMutation.isPending}>
              {saveItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Addon Dialog */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddon ? "Edit Add-on" : "Add Add-on"}</DialogTitle>
            <DialogDescription>Add-ons are extras customers can add to their orders</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addon-cat">Category (optional)</Label>
              <Select value={addonForm.category_id} onValueChange={(val) => setAddonForm(prev => ({ ...prev, category_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories (global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories (global)</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addon-name">Name</Label>
              <Input
                id="addon-name"
                value={addonForm.name}
                onChange={(e) => setAddonForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Add Espresso Shot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addon-price">Price</Label>
              <Input
                id="addon-price"
                type="number"
                step="0.01"
                value={addonForm.price}
                onChange={(e) => setAddonForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="1.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddonDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAddon} disabled={!addonForm.name || !addonForm.price || saveAddonMutation.isPending}>
              {saveAddonMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoffeeShopMenuManager;