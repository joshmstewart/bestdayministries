import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { Loader2, Plus, RefreshCw, Store, Eye, EyeOff, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

interface StoreType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_default: boolean;
}

export const CashRegisterStoresManager = () => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
        toast.success("Store updated");
      } else {
        const maxOrder = Math.max(...stores.map((s) => s.display_order), 0);
        const { error } = await supabase.from("cash_register_stores").insert({
          name: formData.name,
          description: formData.description,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast.success("Store created");
      }

      setDialogOpen(false);
      setEditingStore(null);
      setFormData({ name: "", description: "" });
      await loadStores();
    } catch (error) {
      console.error("Error saving store:", error);
      showErrorToastWithCopy(editingStore ? "Updating store" : "Creating store", error);
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
                    <Label htmlFor="description">Description</Label>
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
                  <Button type="submit" className="w-full">
                    {editingStore ? "Update Store" : "Create Store"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
    </>
  );
};