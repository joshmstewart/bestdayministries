import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { Loader2, Plus, RefreshCw, Store, Eye, EyeOff, Edit, Trash2, Lightbulb, Wand2, ShoppingCart, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImageLightbox from "@/components/ImageLightbox";

// Import local fallback images
import coffeeShopBg from "@/assets/games/stores/coffee-shop-pov.jpg";
import groceryBg from "@/assets/games/stores/grocery-store-pov.jpg";
import clothingBg from "@/assets/games/stores/clothing-store-pov.jpg";
import convenienceBg from "@/assets/games/stores/convenience-store-pov.jpg";
import bakeryBg from "@/assets/games/stores/bakery-pov.jpg";

const FALLBACK_IMAGES: Record<string, string> = {
  "Coffee Shop": coffeeShopBg,
  "Grocery Store": groceryBg,
  "Clothing Store": clothingBg,
  "Convenience Store": convenienceBg,
  "Bakery": bakeryBg,
};

// Store idea suggestions for quick creation
const STORE_IDEAS = [
  { name: "Pet Store", description: "Colorful pet supply shop with aquariums, bird cages, and shelves of pet food and toys." },
  { name: "Ice Cream Parlor", description: "Retro ice cream shop with display freezers showing various flavors, waffle cones, and toppings bar." },
  { name: "Hardware Store", description: "Well-organized hardware store with tool displays, paint mixing station, and lumber section." },
  { name: "Bookstore", description: "Cozy bookstore with tall wooden shelves, reading nooks, and a bestseller display table." },
  { name: "Flower Shop", description: "Vibrant florist shop with refrigerated display cases full of fresh flowers and potted plants." },
  { name: "Toy Store", description: "Bright toy store with colorful displays, action figures, board games, and stuffed animals." },
  { name: "Electronics Store", description: "Modern electronics retailer with phones, laptops, TVs on display, and accessory walls." },
  { name: "Pharmacy", description: "Clean pharmacy with medicine aisles, health products, and a prescription pickup counter." },
  { name: "Sports Store", description: "Athletic store with jerseys, shoes on wall displays, and equipment sections." },
  { name: "Music Store", description: "Instrument shop with guitars hanging on walls, keyboard displays, and sheet music racks." },
  { name: "Art Supply Store", description: "Creative art store with paint tubes, canvas displays, brushes, and craft supplies." },
  { name: "Candy Shop", description: "Whimsical candy store with jars of colorful sweets, chocolate displays, and lollipop trees." },
  { name: "Jewelry Store", description: "Elegant jewelry boutique with glass display cases showing rings, necklaces, and watches." },
  { name: "Shoe Store", description: "Shoe retailer with wall displays of sneakers, boots, and dress shoes with try-on benches." },
  { name: "Antique Shop", description: "Vintage antique store with old furniture, collectibles, clocks, and nostalgic memorabilia." },
  { name: "Farmers Market Stand", description: "Rustic market stand with fresh produce, handmade signs, and wooden crates." },
  { name: "Deli Counter", description: "Traditional deli with meat and cheese display case, scale, and hanging salamis." },
  { name: "Pizza Shop", description: "Cozy pizza restaurant with brick oven visible, menu boards, and pizza display warmer." },
  { name: "Donut Shop", description: "Sweet donut shop with glass display cases full of colorful donuts and pastries." },
  { name: "Thrift Store", description: "Eclectic thrift shop with clothing racks, vintage items, and miscellaneous treasures." },
  { name: "Game Store", description: "Video game retailer with game displays, console showcases, and gaming merchandise." },
  { name: "Smoothie Bar", description: "Fresh smoothie bar with fruit displays, blenders, and colorful menu boards." },
  { name: "Bike Shop", description: "Bicycle store with bikes on display racks, accessories wall, and repair station." },
  { name: "Camping Store", description: "Outdoor gear shop with tents, sleeping bags, hiking equipment, and camping supplies." },
  { name: "Craft Store", description: "Creative craft store with yarn, fabric bolts, scrapbooking supplies, and DIY kits." },
  { name: "Auto Parts Store", description: "Car parts retailer with oil displays, battery section, and automotive accessories." },
  { name: "Garden Center", description: "Plant nursery with potted flowers, gardening tools, seeds, and outdoor furniture." },
  { name: "Movie Theater Concession", description: "Cinema snack bar with popcorn machine, candy display, and drink fountains." },
  { name: "Butcher Shop", description: "Classic butcher with meat display case, cutting boards, and specialty meats hanging." },
  { name: "Cheese Shop", description: "Artisan cheese store with refrigerated wheels, crackers, and wine pairings." },
  { name: "Tea Shop", description: "Cozy tea boutique with loose leaf containers, teapots, and brewing accessories." },
  { name: "Salon Supply Store", description: "Beauty supply shop with hair products, styling tools, and nail polish displays." },
  { name: "Office Supply Store", description: "Office retailer with pens, paper products, desk accessories, and technology." },
  { name: "Furniture Store", description: "Modern furniture showroom with couches, tables, and home decor displays." },
  { name: "Kitchen Store", description: "Cookware shop with pots, pans, utensils, and small appliances on display." },
  { name: "Surf Shop", description: "Beach surf store with surfboards, wetsuits, sunglasses, and beach gear." },
  { name: "Wine Shop", description: "Upscale wine store with bottle racks, tasting bar, and cheese pairings." },
  { name: "Record Store", description: "Vintage vinyl shop with record bins, turntables, and band posters on walls." },
  { name: "Comic Book Store", description: "Colorful comic shop with graphic novels, action figures, and collectible displays." },
  { name: "Candle Shop", description: "Aromatic candle store with jar candles, wax melts, and diffuser displays." },
];

interface MenuItem {
  name: string;
  priceRange: [number, number];
}

interface StoreType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
  menu_items: Json | null;
  receipt_address: string | null;
  receipt_tagline: string | null;
}

const parseMenuItems = (json: Json | null): MenuItem[] => {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((item) => 
      typeof item === 'object' && 
      item !== null && 
      'name' in item && 
      'priceRange' in item
    )
    .map((item) => {
      const obj = item as { name: string; priceRange: number[] };
      return {
        name: obj.name,
        priceRange: [obj.priceRange[0], obj.priceRange[1]] as [number, number]
      };
    });
};

export const CashRegisterStoresManager = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [selectedStoreForMenu, setSelectedStoreForMenu] = useState<StoreType | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [savingMenu, setSavingMenu] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingDetails, setGeneratingDetails] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_register_stores")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error loading stores:", error);
      showErrorToastWithCopy("Loading stores", error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateImage = async (store: StoreType) => {
    setRegenerating(store.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-store-image", {
        body: { storeId: store.id, storeName: store.name, storeDescription: store.description },
      });

      if (error) throw error;

      toast.success(`Image regenerated for ${store.name}`);
      await loadStores();
    } catch (error) {
      console.error("Error regenerating image:", error);
      showErrorToastWithCopy(`Regenerating image for ${store.name}`, error);
    } finally {
      setRegenerating(null);
    }
  };

  const toggleActive = async (store: StoreType) => {
    try {
      const { error } = await supabase
        .from("cash_register_stores")
        .update({ is_active: !store.is_active })
        .eq("id", store.id);

      if (error) throw error;
      toast.success(`${store.name} ${store.is_active ? "hidden" : "visible"}`);
      await loadStores();
    } catch (error) {
      console.error("Error toggling store:", error);
      showErrorToastWithCopy(`Updating store visibility (${store.name})`, error);
    }
  };

  const setDefault = async (store: StoreType) => {
    try {
      // First, unset all defaults
      await supabase
        .from("cash_register_stores")
        .update({ is_default: false })
        .neq("id", store.id);

      // Set the new default
      const { error } = await supabase
        .from("cash_register_stores")
        .update({ is_default: true })
        .eq("id", store.id);

      if (error) throw error;
      toast.success(`${store.name} is now the default store`);
      await loadStores();
    } catch (error) {
      console.error("Error setting default:", error);
      showErrorToastWithCopy(`Setting default store (${store.name})`, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStore) {
        const { error } = await supabase
          .from("cash_register_stores")
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq("id", editingStore.id);

        if (error) throw error;
        
        // Optimistic update - immediately update local state
        setStores(prev => prev.map(s => 
          s.id === editingStore.id 
            ? { ...s, name: formData.name, description: formData.description }
            : s
        ));
        toast.success("Store updated");
      } else {
        const maxOrder = Math.max(...stores.map((s) => s.display_order), 0);
        const { data, error } = await supabase
          .from("cash_register_stores")
          .insert({
            name: formData.name,
            description: formData.description,
            display_order: maxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;
        
        // Optimistic update - add to local state immediately
        if (data) {
          setStores(prev => [...prev, data]);
          
          // Auto-generate menu items and receipt details in background
          toast.info("Generating store details...");
          supabase.functions.invoke("generate-store-details", {
            body: { 
              storeId: data.id, 
              storeName: formData.name, 
              storeDescription: formData.description 
            },
          }).then(({ data: genData, error: genError }) => {
            if (genError) {
              console.error("Error generating store details:", genError);
              toast.error("Failed to auto-generate store details. You can add them manually.");
            } else {
              // Update the store in local state with the generated data
              setStores(prev => prev.map(s => 
                s.id === data.id 
                  ? { 
                      ...s, 
                      menu_items: genData?.menuItems || null,
                      receipt_address: genData?.receiptAddress || null,
                      receipt_tagline: genData?.receiptTagline || null,
                    }
                  : s
              ));
              toast.success("Store details generated!");
            }
          });
        }
        toast.success("Store created");
      }

      setDialogOpen(false);
      setEditingStore(null);
      setFormData({ name: "", description: "" });
    } catch (error) {
      console.error("Error saving store:", error);
      showErrorToastWithCopy(editingStore ? "Updating store" : "Creating store", error);
      // On error, refresh to get accurate state
      loadStores();
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (store: StoreType) => {
    if (!confirm(`Delete ${store.name}?`)) return;

    try {
      const { error } = await supabase
        .from("cash_register_stores")
        .delete()
        .eq("id", store.id);

      if (error) throw error;
      toast.success("Store deleted");
      await loadStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      showErrorToastWithCopy(`Deleting store (${store.name})`, error);
    }
  };

  const openEditDialog = (store: StoreType) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      description: store.description || "",
    });
    setDialogOpen(true);
  };

  const selectStoreIdea = (idea: { name: string; description: string }) => {
    setFormData({
      name: idea.name,
      description: idea.description,
    });
    setIdeasOpen(false);
    setEditingStore(null);
    setDialogOpen(true);
  };

  const generateDescription = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a store name first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke("lovable-ai", {
        body: {
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "user",
              content: `Generate a brief, vivid description (2-3 sentences) of a "${formData.name}" store for a cash register game. Describe what the store looks like from behind the checkout counter, including visible products, displays, and atmosphere. Focus on visual details that would help generate an image. Be specific and evocative.`,
            },
          ],
        },
      });

      if (error) throw error;

      if (data?.content) {
        setFormData((prev) => ({ ...prev, description: data.content.trim() }));
        toast.success("Description generated!");
      } else {
        throw new Error("No content returned");
      }
    } catch (error) {
      console.error("Error generating description:", error);
      showErrorToastWithCopy("Generating description", error);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const openMenuDialog = (store: StoreType) => {
    setSelectedStoreForMenu(store);
    setMenuItems(parseMenuItems(store.menu_items));
    setMenuDialogOpen(true);
  };

  const addMenuItem = () => {
    setMenuItems(prev => [...prev, { name: "", priceRange: [1.00, 5.00] }]);
  };

  const updateMenuItem = (index: number, field: keyof MenuItem, value: string | number) => {
    setMenuItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'name') {
        return { ...item, name: value as string };
      } else if (field === 'priceRange') {
        return item; // handled separately
      }
      return item;
    }));
  };

  const updateMenuItemPrice = (index: number, priceIndex: 0 | 1, value: number) => {
    setMenuItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newRange: [number, number] = [...item.priceRange] as [number, number];
      newRange[priceIndex] = value;
      return { ...item, priceRange: newRange };
    }));
  };

  const removeMenuItem = (index: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveMenuItems = async () => {
    if (!selectedStoreForMenu) return;
    setSavingMenu(true);
    try {
      const { error } = await supabase
        .from("cash_register_stores")
        .update({ menu_items: menuItems as unknown as Json })
        .eq("id", selectedStoreForMenu.id);

      if (error) throw error;

      // Optimistic update
      setStores(prev => prev.map(s => 
        s.id === selectedStoreForMenu.id 
          ? { ...s, menu_items: menuItems as unknown as Json }
          : s
      ));
      toast.success("Menu items saved");
      setMenuDialogOpen(false);
    } catch (error) {
      console.error("Error saving menu items:", error);
      showErrorToastWithCopy("Saving menu items", error);
    } finally {
      setSavingMenu(false);
    }
  };

  const generateStoreDetails = async (store: StoreType) => {
    setGeneratingDetails(store.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-store-details", {
        body: { 
          storeId: store.id, 
          storeName: store.name, 
          storeDescription: store.description 
        },
      });

      if (error) throw error;

      // Update the store in local state with the generated data
      setStores(prev => prev.map(s => 
        s.id === store.id 
          ? { 
              ...s, 
              menu_items: data?.menuItems || null,
              receipt_address: data?.receiptAddress || null,
              receipt_tagline: data?.receiptTagline || null,
            }
          : s
      ));
      toast.success(`Details generated for ${store.name}!`);
    } catch (error) {
      console.error("Error generating store details:", error);
      showErrorToastWithCopy(`Generating details for ${store.name}`, error);
    } finally {
      setGeneratingDetails(null);
    }
  };

  const getStoreImageUrl = (store: StoreType) => {
    return store.image_url ? `${store.image_url}?v=${Date.now()}` : FALLBACK_IMAGES[store.name] || "";
  };

  const lightboxImages = stores.map((store) => ({
    image_url: getStoreImageUrl(store),
    caption: store.name,
  }));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Filter out already existing stores from ideas
  const existingStoreNames = new Set(stores.map((s) => s.name.toLowerCase()));
  const availableIdeas = STORE_IDEAS.filter(
    (idea) => !existingStoreNames.has(idea.name.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Cash Register Stores
              </CardTitle>
              <CardDescription>
                Manage store types for the cash register game
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Store Ideas Popover */}
              <Popover open={ideasOpen} onOpenChange={setIdeasOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Store Ideas ({availableIdeas.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b">
                    <h4 className="font-medium">Choose a Store Idea</h4>
                    <p className="text-sm text-muted-foreground">
                      Select to pre-fill the form, then edit as needed
                    </p>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="p-2 space-y-1">
                      {availableIdeas.map((idea) => (
                        <button
                          key={idea.name}
                          onClick={() => selectStoreIdea(idea)}
                          className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                        >
                          <div className="font-medium text-sm">{idea.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {idea.description}
                          </div>
                        </button>
                      ))}
                      {availableIdeas.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          All store ideas have been added!
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* Add Store Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingStore(null);
                      setFormData({ name: "", description: "" });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Store
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingStore ? "Edit Store" : "Add New Store"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingStore
                        ? "Update the store details"
                        : "Create a new store type for the cash register game"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Store Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., Coffee Shop"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description">Description</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateDescription}
                          disabled={generatingDescription || !formData.name.trim()}
                          className="h-7 px-2 text-xs"
                        >
                          {generatingDescription ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Wand2 className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      </div>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Describe the store for image generation..."
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingStore ? "Update Store" : "Create Store"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stores.map((store, index) => (
            <div
              key={store.id}
              className="flex items-center gap-4 p-3 border rounded-lg"
            >
              {/* Clickable thumbnail */}
              <button
                onClick={() => openLightbox(index)}
                className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              >
                {getStoreImageUrl(store) ? (
                  <img
                    src={getStoreImageUrl(store)}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </button>

              {/* Store info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{store.name}</span>
                  {store.is_default && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                  {!store.is_active && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {store.description || "No description"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => regenerateImage(store)}
                  disabled={regenerating === store.id}
                  title="Regenerate Image"
                >
                  {regenerating === store.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleActive(store)}
                  title={store.is_active ? "Hide" : "Show"}
                >
                  {store.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                {/* Generate Details button - show if no menu items */}
                {(!store.menu_items || (Array.isArray(store.menu_items) && store.menu_items.length === 0)) && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => generateStoreDetails(store)}
                    disabled={generatingDetails === store.id}
                    title="Generate Menu & Receipt Details"
                  >
                    {generatingDetails === store.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openMenuDialog(store)}
                  title="Menu Items"
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEditDialog(store)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!store.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDefault(store)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteStore(store)}
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => setLightboxIndex((prev) => (prev - 1 + stores.length) % stores.length)}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % stores.length)}
      />

      {/* Menu Items Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="!flex !flex-col max-w-2xl h-[80vh] overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Menu Items - {selectedStoreForMenu?.name}
            </DialogTitle>
            <DialogDescription>
              Configure the purchasable items and price ranges for this store ({menuItems.length} items)
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 pr-4 -mr-4">
            <div className="space-y-3">
              {menuItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No menu items yet. Click "Add Item" to create one.
                </p>
              )}
              {menuItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateMenuItem(index, 'name', e.target.value)}
                      placeholder="Item name (e.g., Coffee, Sandwich)"
                      className="font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Price:</span>
                      <span className="text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.priceRange[0]}
                        onChange={(e) => updateMenuItemPrice(index, 0, parseFloat(e.target.value) || 0)}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <span className="text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.priceRange[1]}
                        onChange={(e) => updateMenuItemPrice(index, 1, parseFloat(e.target.value) || 0)}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        className="w-20"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMenuItem(index)}
                    className="text-destructive hover:text-destructive flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex-shrink-0 flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={addMenuItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            <Button onClick={saveMenuItems} disabled={savingMenu}>
              {savingMenu ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Menu Items"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
