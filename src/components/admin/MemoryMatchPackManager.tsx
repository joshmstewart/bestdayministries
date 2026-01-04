import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Package, Image, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Default bundled images (for reference)
import espressoImg from "@/assets/games/memory-match/espresso.png";
import latteImg from "@/assets/games/memory-match/latte.png";
import croissantImg from "@/assets/games/memory-match/croissant.png";
import coffeeBeansImg from "@/assets/games/memory-match/coffee-beans.png";
import cappuccinoImg from "@/assets/games/memory-match/cappuccino.png";
import muffinImg from "@/assets/games/memory-match/muffin.png";
import donutImg from "@/assets/games/memory-match/donut.png";
import frenchPressImg from "@/assets/games/memory-match/french-press.png";
import takeawayCupImg from "@/assets/games/memory-match/takeaway-cup.png";
import cookieImg from "@/assets/games/memory-match/cookie.png";

const DEFAULT_BUNDLED_IMAGES = [
  { name: "Espresso", image_url: espressoImg },
  { name: "Latte", image_url: latteImg },
  { name: "Croissant", image_url: croissantImg },
  { name: "Coffee Beans", image_url: coffeeBeansImg },
  { name: "Cappuccino", image_url: cappuccinoImg },
  { name: "Muffin", image_url: muffinImg },
  { name: "Donut", image_url: donutImg },
  { name: "French Press", image_url: frenchPressImg },
  { name: "Takeaway Cup", image_url: takeawayCupImg },
  { name: "Cookie", image_url: cookieImg },
];

interface ImagePack {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  is_default: boolean;
  is_active: boolean;
  price_coins: number;
  display_order: number;
}

interface PackImage {
  id: string;
  pack_id: string;
  name: string;
  image_url: string;
  display_order: number;
}

export const MemoryMatchPackManager = () => {
  const { toast } = useToast();
  const [packs, setPacks] = useState<ImagePack[]>([]);
  const [packImages, setPackImages] = useState<Record<string, PackImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingPack, setEditingPack] = useState<ImagePack | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_coins: 0,
    is_active: true,
  });

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    setLoading(true);
    
    const { data: packsData, error: packsError } = await supabase
      .from("memory_match_packs")
      .select("*")
      .order("display_order");

    if (packsError) {
      console.error("Error loading packs:", packsError);
      toast({
        title: "Error",
        description: "Failed to load image packs",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setPacks(packsData || []);

    // Load images for each pack
    if (packsData && packsData.length > 0) {
      const { data: imagesData } = await supabase
        .from("memory_match_images")
        .select("*")
        .in("pack_id", packsData.map(p => p.id))
        .order("display_order");

      if (imagesData) {
        const imagesByPack: Record<string, PackImage[]> = {};
        imagesData.forEach(img => {
          if (!imagesByPack[img.pack_id]) {
            imagesByPack[img.pack_id] = [];
          }
          imagesByPack[img.pack_id].push(img);
        });
        setPackImages(imagesByPack);
      }
    }

    setLoading(false);
  };

  const handleSavePack = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Pack name is required",
        variant: "destructive",
      });
      return;
    }

    if (editingPack) {
      const { error } = await supabase
        .from("memory_match_packs")
        .update({
          name: formData.name,
          description: formData.description || null,
          price_coins: formData.price_coins,
          is_active: formData.is_active,
        })
        .eq("id", editingPack.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update pack",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Pack updated successfully" });
    } else {
      const { error } = await supabase
        .from("memory_match_packs")
        .insert({
          name: formData.name,
          description: formData.description || null,
          price_coins: formData.price_coins,
          is_active: formData.is_active,
          display_order: packs.length,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create pack",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Pack created successfully" });
    }

    setIsDialogOpen(false);
    setEditingPack(null);
    setFormData({ name: "", description: "", price_coins: 0, is_active: true });
    loadPacks();
  };

  const handleDeletePack = async (pack: ImagePack) => {
    if (pack.is_default) {
      toast({
        title: "Cannot delete",
        description: "Cannot delete the default pack",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${pack.name}"? This will also delete all images in this pack.`)) {
      return;
    }

    const { error } = await supabase
      .from("memory_match_packs")
      .delete()
      .eq("id", pack.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete pack",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Pack deleted successfully" });
    loadPacks();
  };

  const togglePackActive = async (pack: ImagePack) => {
    const { error } = await supabase
      .from("memory_match_packs")
      .update({ is_active: !pack.is_active })
      .eq("id", pack.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update pack",
        variant: "destructive",
      });
      return;
    }

    loadPacks();
  };

  const openEditDialog = (pack: ImagePack) => {
    setEditingPack(pack);
    setFormData({
      name: pack.name,
      description: pack.description || "",
      price_coins: pack.price_coins,
      is_active: pack.is_active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPack(null);
    setFormData({ name: "", description: "", price_coins: 0, is_active: true });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Memory Match Image Packs</h3>
          <p className="text-sm text-muted-foreground">
            Manage themed image packs for the Memory Match game
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Pack
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPack ? "Edit Pack" : "Create New Pack"}</DialogTitle>
              <DialogDescription>
                {editingPack ? "Update the pack details" : "Create a new themed image pack"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Pack Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Halloween Theme"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Spooky themed cards for Halloween..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (JoyCoins)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price_coins}
                  onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <Button onClick={handleSavePack} className="w-full">
                {editingPack ? "Update Pack" : "Create Pack"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Default Bundled Pack (Coffee Shop) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">☕ Coffee Shop (Default - Bundled)</CardTitle>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Always Available</span>
          </div>
          <CardDescription>
            Default bundled images that are always available to all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {DEFAULT_BUNDLED_IMAGES.map((img, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-lg bg-accent/20 p-1 flex items-center justify-center">
                  <img
                    src={img.image_url}
                    alt={img.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs text-muted-foreground text-center truncate w-full">
                  {img.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Packs */}
      <Accordion type="multiple" className="space-y-2">
        {packs.map((pack) => (
          <AccordionItem key={pack.id} value={pack.id} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <Package className={`h-5 w-5 ${pack.is_active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={pack.is_active ? "" : "text-muted-foreground"}>
                  {pack.name}
                </span>
                {pack.is_default && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default DB</span>
                )}
                {pack.price_coins > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                    {pack.price_coins} coins
                  </span>
                )}
                {!pack.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {pack.description && (
                  <p className="text-sm text-muted-foreground">{pack.description}</p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePackActive(pack)}
                  >
                    {pack.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(pack)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {!pack.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePack(pack)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Pack Images */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Images ({packImages[pack.id]?.length || 0})
                  </h4>
                  {packImages[pack.id] && packImages[pack.id].length > 0 ? (
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                      {packImages[pack.id].map((img) => (
                        <div key={img.id} className="flex flex-col items-center gap-1">
                          <div className="w-16 h-16 rounded-lg bg-accent/20 p-1 flex items-center justify-center">
                            <img
                              src={img.image_url}
                              alt={img.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground text-center truncate w-full">
                            {img.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No images uploaded to this pack yet. Images can be added via database.
                    </p>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {packs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No database packs yet. The bundled Coffee Shop pack is always available.
            </p>
            <Button onClick={openCreateDialog} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create First Pack
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
