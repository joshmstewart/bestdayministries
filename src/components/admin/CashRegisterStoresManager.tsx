import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { Loader2, Plus, RefreshCw, Store, Eye, EyeOff, Edit, Trash2, Lightbulb, Wand2, ShoppingCart, X, Coins } from "lucide-react";
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

// Store idea suggestions for quick creation - mix of real and fantastical!
const STORE_IDEAS = [
  // === FANTASTICAL & MAGICAL ===
  { name: "Dragon's Treasure Emporium", description: "A mystical shop inside a dragon's cave with glittering treasure piles, magical artifacts, and a friendly baby dragon assistant." },
  { name: "Wizard's Potion Brewery", description: "Bubbling cauldrons, floating spell books, colorful potions in crystal bottles, and a wise owl perched nearby." },
  { name: "Fairy Garden Market", description: "Tiny mushroom houses, glowing fairy lights, dewdrop jewelry, and magical flower seeds with fairies fluttering about." },
  { name: "Space Station Supply Depot", description: "Futuristic space station with alien snacks, astronaut gear, floating orbs, and a view of distant planets through the window." },
  { name: "Mermaid's Pearl Boutique", description: "Underwater shop with seashell displays, pearl necklaces, colorful coral decorations, and fish swimming past." },
  { name: "Monster Snack Shack", description: "Friendly monsters running a spooky-cute snack shop with eyeball gumballs, slime sodas, and monster-shaped treats." },
  { name: "Robot Repair Workshop", description: "Futuristic workshop with friendly robots, hovering tools, holographic displays, and glowing circuit boards." },
  { name: "Unicorn Bakery", description: "Magical bakery with rainbow cakes, sparkly cupcakes, cotton candy clouds, and a unicorn mascot." },
  { name: "Enchanted Forest Cafe", description: "Treehouse cafe with talking woodland creatures, glowing mushrooms, honey pots, and magical forest treats." },
  { name: "Dinosaur Diner", description: "Prehistoric themed restaurant with friendly dinosaur characters, volcano decor, fossil decorations, and dino-shaped food." },
  { name: "Cloud City Sweet Shop", description: "Floating candy shop in the clouds with cotton candy clouds, rainbow bridges, and starlight lollipops." },
  { name: "Pirate Treasure Trading Post", description: "Ship deck shop with treasure chests, parrots, gold doubloons, maps, and pirate gear galore." },
  { name: "Superhero Headquarters Store", description: "Comic book style shop with capes on display, power-up gadgets, and superhero memorabilia everywhere." },
  { name: "Gnome's Garden Supply", description: "Cozy underground shop run by friendly gnomes with magical seeds, talking garden tools, and enchanted plants." },
  { name: "Crystal Cave Gem Shop", description: "Glittering cave full of magical crystals, gemstones, geodes, and mystical jewelry with ambient purple lighting." },
  { name: "Time Traveler's Antiques", description: "Shop filled with artifacts from different eras - medieval armor, futuristic gadgets, ancient scrolls, and a time machine in the corner." },
  { name: "Alien Marketplace", description: "Colorful alien bazaar with weird and wonderful alien foods, glowing plants, and friendly extraterrestrial shopkeepers." },
  { name: "Phoenix Feather Emporium", description: "Warm golden shop with magical feathers, fire-themed decor, phoenixes perched around, and glowing ember displays." },
  { name: "Yeti's Mountain Lodge Store", description: "Cozy snowy shop with a friendly yeti, warm cocoa, winter gear, and mountain adventure supplies." },
  { name: "Underwater Submarine Snack Bar", description: "Yellow submarine interior with porthole windows, fish swimming by, nautical snacks, and captain's gear." },
  
  // === FUN REAL-WORLD STORES ===
  { name: "Pet Paradise", description: "Lively pet shop with puppies playing, kittens in cozy beds, colorful fish tanks, parrots chatting, and hamsters on wheels." },
  { name: "Bubbly Ice Cream Parlor", description: "Retro ice cream shop with towering sundaes, rainbow sprinkles everywhere, waffle cone decorations, and happy customers." },
  { name: "Magical Toy Emporium", description: "Whimsical toy store with giant teddy bears, toy trains running overhead, colorful balloons, and kids' excitement everywhere." },
  { name: "Candy Wonderland", description: "Over-the-top candy store with lollipop trees, chocolate fountains, gummy waterfalls, and jars of every candy imaginable." },
  { name: "Cozy Bookworm Cafe", description: "Charming bookstore cafe with cats lounging on shelves, comfy reading chairs, steaming coffee, and stacks of magical-looking books." },
  { name: "Rainbow Donut Palace", description: "Colorful donut shop with towers of rainbow-frosted donuts, sprinkle walls, and a giant donut throne." },
  { name: "Jungle Adventure Pet Shop", description: "Exotic pet store styled like a jungle with tropical birds, lizards, snakes, and a mini waterfall." },
  { name: "Retro Arcade Snack Bar", description: "Neon-lit arcade with vintage games, prize wall, slushie machines, and 80s vibes everywhere." },
  { name: "Magical Music Shop", description: "Enchanting music store with instruments that seem to play themselves, floating notes, and a grand piano centerpiece." },
  { name: "Treehouse Toy Store", description: "Multi-level treehouse toy shop with rope bridges, slides between floors, and stuffed animals in every corner." },
  { name: "Flower Fairy Garden Shop", description: "Overflowing flower shop with butterflies, hummingbirds, hanging gardens, and magical-looking blooms." },
  { name: "Cosmic Pizza Planet", description: "Space-themed pizza restaurant with planet decorations, UFO-shaped pizzas, and an asteroid salad bar." },
  { name: "Safari Gift Shop", description: "Zoo gift shop with stuffed safari animals, jungle vines, elephant and giraffe decorations, and adventure gear." },
  { name: "Mermaid Smoothie Cove", description: "Beach-themed smoothie bar with seashell decorations, surfboards, tropical fruits, and ocean vibes." },
  { name: "Cupcake Castle", description: "Princess-themed cupcake shop with turrets made of cupcakes, crown decorations, and glittery frosting everywhere." },
  { name: "Dino Dig Fossil Shop", description: "Museum-style shop with dinosaur skeletons, dig kits, amber specimens, and prehistoric themed everything." },
  { name: "Circus Snack Stand", description: "Big top themed stand with striped tents, cotton candy machines, popcorn towers, and carnival prizes." },
  { name: "Enchanted Garden Nursery", description: "Magical plant shop with oversized flowers, fairy statues, wishing wells, and secret garden vibes." },
  { name: "Cozy Mountain Cabin Store", description: "Rustic cabin shop with log furniture, warm fireplaces, wildlife art, and mountain adventure gear." },
  { name: "Haunted Mansion Gift Shop", description: "Spooky-fun shop with friendly ghosts, cobwebs, jack-o-lanterns, and Halloween treats year-round." },
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
  price_coins: number;
  is_free: boolean;
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
    is_free: true,
    price_coins: 0,
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
            is_free: formData.is_free,
            price_coins: formData.is_free ? 0 : formData.price_coins,
          })
          .eq("id", editingStore.id);

        if (error) throw error;
        
        // Optimistic update - immediately update local state
        setStores(prev => prev.map(s => 
          s.id === editingStore.id 
            ? { ...s, name: formData.name, description: formData.description, is_free: formData.is_free, price_coins: formData.is_free ? 0 : formData.price_coins }
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
            is_free: formData.is_free,
            price_coins: formData.is_free ? 0 : formData.price_coins,
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
      setFormData({ name: "", description: "", is_free: true, price_coins: 0 });
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
      is_free: store.is_free ?? true,
      price_coins: store.price_coins ?? 0,
    });
    setDialogOpen(true);
  };

  const selectStoreIdea = (idea: { name: string; description: string }) => {
    setFormData({
      name: idea.name,
      description: idea.description,
      is_free: true,
      price_coins: 0,
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
                      setFormData({ name: "", description: "", is_free: true, price_coins: 0 });
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
                    
                    {/* Pricing */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Coins className="w-4 h-4" />
                          Free Store
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
                            value={formData.price_coins}
                            onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      )}
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
                  {!store.is_free && store.price_coins > 0 && (
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {store.price_coins}
                    </span>
                  )}
                  {store.is_free && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      Free
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
