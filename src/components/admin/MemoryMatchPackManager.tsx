import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Wand2, RefreshCw, Check, ImageOff, AlertTriangle, X, Copy, Plus, Trash2, Package, Eye, EyeOff, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

// Default bundled images (Coffee Shop pack - always available as fallback)
import croissantImg from "@/assets/games/memory-match/croissant.png";
import coffeeBeansImg from "@/assets/games/memory-match/coffee-beans.png";
import muffinImg from "@/assets/games/memory-match/muffin.png";
import donutImg from "@/assets/games/memory-match/donut.png";
import frenchPressImg from "@/assets/games/memory-match/french-press.png";
import cookieImg from "@/assets/games/memory-match/cookie.png";
import milkPitcherImg from "@/assets/games/memory-match/milk-pitcher.png";
import coffeeGrinderImg from "@/assets/games/memory-match/coffee-grinder.png";
import cinnamonSticksImg from "@/assets/games/memory-match/cinnamon-sticks.png";
import sugarBowlImg from "@/assets/games/memory-match/sugar-bowl.png";
import coffeeShopCardBackImg from "@/assets/games/memory-match/card-back-coffee-shop.png";

const DEFAULT_BUNDLED_IMAGES = [
  { name: "French Press", image_url: frenchPressImg },
  { name: "Croissant", image_url: croissantImg },
  { name: "Coffee Beans", image_url: coffeeBeansImg },
  { name: "Muffin", image_url: muffinImg },
  { name: "Donut", image_url: donutImg },
  { name: "Cookie", image_url: cookieImg },
  { name: "Milk Pitcher", image_url: milkPitcherImg },
  { name: "Coffee Grinder", image_url: coffeeGrinderImg },
  { name: "Cinnamon Sticks", image_url: cinnamonSticksImg },
  { name: "Sugar Bowl", image_url: sugarBowlImg },
];

const DEFAULT_CARD_BACK = coffeeShopCardBackImg;

interface ImagePack {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  card_back_url: string | null;
  is_default: boolean;
  is_active: boolean;
  price_coins: number;
  display_order: number;
}

interface PackImage {
  id: string;
  pack_id: string;
  name: string;
  image_url: string | null;
  display_order: number;
}

interface GenerationError {
  imageName: string;
  error: string;
}

export const MemoryMatchPackManager = () => {
  const [packs, setPacks] = useState<ImagePack[]>([]);
  const [packImages, setPackImages] = useState<Record<string, PackImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<GenerationError[]>([]);

  // New image form state
  const [newImageName, setNewImageName] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [activePackId, setActivePackId] = useState<string | null>(null);

  // Delete confirmation state
  const [imageToDelete, setImageToDelete] = useState<PackImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Card back generation state
  const [generatingCardBack, setGeneratingCardBack] = useState<string | null>(null);

  // Pack dialog state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<ImagePack | null>(null);
  const [packFormData, setPackFormData] = useState({
    name: "",
    description: "",
    price_coins: 0,
    is_active: true,
  });
  const [savingPack, setSavingPack] = useState(false);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    const { data: packsData, error: packsError } = await supabase
      .from("memory_match_packs")
      .select("*")
      .order("display_order");

    if (packsError) {
      toast.error("Failed to load packs");
      console.error(packsError);
      setLoading(false);
      return;
    }

    setPacks(packsData || []);

    // Load images for all packs
    if (packsData && packsData.length > 0) {
      const packIds = packsData.map((p) => p.id);
      const { data: imagesData, error: imagesError } = await supabase
        .from("memory_match_images")
        .select("*")
        .in("pack_id", packIds)
        .order("display_order");

      if (imagesError) {
        console.error(imagesError);
      } else {
        const grouped: Record<string, PackImage[]> = {};
        (imagesData || []).forEach((img) => {
          if (!grouped[img.pack_id]) {
            grouped[img.pack_id] = [];
          }
          // Add cache-busting timestamp
          grouped[img.pack_id].push({
            ...img,
            image_url: img.image_url ? `${img.image_url}?t=${Date.now()}` : null,
          });
        });
        setPackImages(grouped);
      }
    }

    setLoading(false);
  };

  const handleAddImage = async (packId: string) => {
    if (!newImageName.trim()) {
      toast.error("Please enter an image name");
      return;
    }

    // Check if already exists in this pack
    const existingImages = packImages[packId] || [];
    const exists = existingImages.some(
      (img) => img.name.toLowerCase() === newImageName.toLowerCase()
    );
    if (exists) {
      toast.error("This image already exists in this pack");
      return;
    }

    setAddingImage(true);

    try {
      // Insert the image
      const { data: newImage, error: insertError } = await supabase
        .from("memory_match_images")
        .insert([{
          pack_id: packId,
          name: newImageName.trim(),
          display_order: existingImages.length,
          image_url: null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      const pack = packs.find((p) => p.id === packId);
      toast.success(`Added ${newImageName}! Generating icon...`);
      setNewImageName("");

      // Generate icon for the new image
      const result = await generateIcon(newImage as PackImage, pack?.name || "Custom");

      if (result.ok) {
        toast.success(`Icon generated for ${newImageName}!`);
      } else {
        toast.warning(`Added ${newImageName} but icon generation failed. You can regenerate it later.`);
        setErrors((prev) => [...prev, { imageName: newImageName, error: result.errorMessage || "Unknown error" }]);
      }

      await loadPacks();
    } catch (error) {
      console.error("Failed to add image:", error);
      toast.error("Failed to add image");
    } finally {
      setAddingImage(false);
    }
  };

  const generateIcon = async (
    image: PackImage,
    packName: string
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-icon",
        {
          body: {
            imageId: image.id,
            imageName: image.name,
            packName,
          },
        }
      );

      if (error) {
        console.error(`Failed to generate icon for ${image.name}:`, error);
        return { ok: false, errorMessage: error.message || String(error) };
      }

      if ((data as any)?.error) {
        return { ok: false, errorMessage: (data as any).error };
      }

      const imageUrl = (data as any)?.imageUrl as string | undefined;
      return { ok: true, imageUrl };
    } catch (error) {
      console.error(`Failed to generate icon for ${image.name}:`, error);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, errorMessage: message };
    }
  };

  const handleGenerateMissing = async (packId: string) => {
    const images = packImages[packId] || [];
    const missingIcons = images.filter((img) => !img.image_url);

    if (missingIcons.length === 0) {
      toast.info("All images already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setErrors([]);

    const pack = packs.find((p) => p.id === packId);
    let successCount = 0;
    const BATCH_SIZE = 5;
    const batch = missingIcons.slice(0, BATCH_SIZE);
    const total = batch.length;
    const newErrors: GenerationError[] = [];

    setCurrentImage(batch.map((b) => b.name).join(", "));

    const results = await Promise.all(
      batch.map(async (image) => {
        const result = await generateIcon(image, pack?.name || "Custom");
        return { image, result };
      })
    );

    for (const { image, result } of results) {
      if (result.ok) {
        successCount++;
      } else {
        newErrors.push({
          imageName: image.name,
          error: result.errorMessage || "Unknown error",
        });
      }
    }

    setProgress(100);
    setGenerating(false);
    setCurrentImage(null);
    setErrors(newErrors);

    const remaining = missingIcons.length - BATCH_SIZE;
    if (successCount === total && remaining > 0) {
      toast.success(`Generated ${successCount} icons! ${remaining} remaining.`);
    } else if (successCount === total) {
      toast.success(`Generated ${successCount} icons!`);
    } else {
      toast.warning(`Generated ${successCount}/${total} icons. ${newErrors.length} failed.`);
    }

    await loadPacks();
  };

  const handleRegenerate = async (image: PackImage) => {
    setRegeneratingId(image.id);

    const pack = packs.find((p) => p.id === image.pack_id);
    const result = await generateIcon(image, pack?.name || "Custom");

    if (result.ok) {
      if (result.imageUrl) {
        const cacheBustedUrl = `${result.imageUrl}?t=${Date.now()}`;
        setPackImages((prev) => ({
          ...prev,
          [image.pack_id]: (prev[image.pack_id] || []).map((img) =>
            img.id === image.id ? { ...img, image_url: cacheBustedUrl } : img
          ),
        }));
      }
      setErrors((prev) => prev.filter((e) => e.imageName !== image.name));
      toast.success(`Regenerated icon for ${image.name}`);
    } else {
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.imageName !== image.name);
        return [...filtered, { imageName: image.name, error: result.errorMessage || "Unknown error" }];
      });
      toast.error(`Failed to regenerate icon for ${image.name}`);
    }

    setRegeneratingId(null);
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("memory_match_images")
        .delete()
        .eq("id", imageToDelete.id);

      if (error) throw error;

      toast.success(`Deleted ${imageToDelete.name}`);
      setPackImages((prev) => ({
        ...prev,
        [imageToDelete.pack_id]: (prev[imageToDelete.pack_id] || []).filter(
          (img) => img.id !== imageToDelete.id
        ),
      }));
    } catch (error) {
      console.error("Failed to delete image:", error);
      toast.error("Failed to delete image");
    } finally {
      setDeleting(false);
      setImageToDelete(null);
    }
  };

  const handleCopyErrors = () => {
    const errorText = errors.map((e) => `${e.imageName}: ${e.error}`).join("\n");
    navigator.clipboard.writeText(errorText);
    toast.success("Errors copied to clipboard");
  };

  const handleDismissErrors = () => {
    setErrors([]);
  };

  const openPackDialog = (pack?: ImagePack) => {
    if (pack) {
      setEditingPack(pack);
      setPackFormData({
        name: pack.name,
        description: pack.description || "",
        price_coins: pack.price_coins,
        is_active: pack.is_active,
      });
    } else {
      setEditingPack(null);
      setPackFormData({
        name: "",
        description: "",
        price_coins: 0,
        is_active: true,
      });
    }
    setPackDialogOpen(true);
  };

  const handleSavePack = async () => {
    if (!packFormData.name.trim()) {
      toast.error("Please enter a pack name");
      return;
    }

    setSavingPack(true);
    try {
      if (editingPack) {
        const { error } = await supabase
          .from("memory_match_packs")
          .update({
            name: packFormData.name.trim(),
            description: packFormData.description.trim() || null,
            price_coins: packFormData.price_coins,
            is_active: packFormData.is_active,
          })
          .eq("id", editingPack.id);

        if (error) throw error;
        toast.success("Pack updated");
      } else {
        const { error } = await supabase.from("memory_match_packs").insert({
          name: packFormData.name.trim(),
          description: packFormData.description.trim() || null,
          price_coins: packFormData.price_coins,
          is_active: packFormData.is_active,
          display_order: packs.length,
        });

        if (error) throw error;
        toast.success("Pack created");
      }

      setPackDialogOpen(false);
      await loadPacks();
    } catch (error) {
      console.error("Failed to save pack:", error);
      toast.error("Failed to save pack");
    } finally {
      setSavingPack(false);
    }
  };

  const togglePackActive = async (pack: ImagePack) => {
    try {
      const { error } = await supabase
        .from("memory_match_packs")
        .update({ is_active: !pack.is_active })
        .eq("id", pack.id);

      if (error) throw error;

      setPacks((prev) =>
        prev.map((p) => (p.id === pack.id ? { ...p, is_active: !p.is_active } : p))
      );
      toast.success(`Pack ${!pack.is_active ? "activated" : "deactivated"}`);
    } catch (error) {
      console.error("Failed to toggle pack:", error);
      toast.error("Failed to update pack");
    }
  };

  const handleGenerateCardBack = async (pack: ImagePack) => {
    setGeneratingCardBack(pack.id);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-card-back",
        {
          body: {
            packId: pack.id,
            packName: pack.name,
            themeDescription: pack.description,
          },
        }
      );

      if (error) {
        console.error("Failed to generate card back:", error);
        toast.error(`Failed to generate card back: ${error.message}`);
        return;
      }

      if ((data as any)?.error) {
        toast.error(`Failed to generate card back: ${(data as any).error}`);
        return;
      }

      const cardBackUrl = (data as any)?.cardBackUrl;
      if (cardBackUrl) {
        const cacheBustedUrl = `${cardBackUrl}?t=${Date.now()}`;
        setPacks((prev) =>
          prev.map((p) => (p.id === pack.id ? { ...p, card_back_url: cacheBustedUrl } : p))
        );
        toast.success(`Card back generated for ${pack.name}!`);
      }
    } catch (error) {
      console.error("Failed to generate card back:", error);
      toast.error("Failed to generate card back");
    } finally {
      setGeneratingCardBack(null);
    }
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
      {/* Header with create pack button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Memory Match Image Packs</h2>
          <p className="text-muted-foreground">
            Manage image packs for the Memory Match game
          </p>
        </div>
        <Button onClick={() => openPackDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Pack
        </Button>
      </div>

      {/* Persistent Error Display */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{errors.length} Generation Error{errors.length > 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyErrors} className="h-7 px-2">
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismissErrors} className="h-7 px-2">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
              {errors.map((err, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 rounded">
                  <span className="font-semibold">{err.imageName}:</span> {err.error}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Default Bundled Pack (Coffee Shop) - Static fallback display */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">☕ Coffee Shop (Bundled Default)</CardTitle>
                <CardDescription>These 10 images are bundled with the app and always available as fallback</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Static Assets</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Back Preview */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              🎴 Card Back Design
            </h4>
            <div className="flex items-start gap-4">
              <div className="relative rounded-lg border-2 border-primary overflow-hidden w-24 h-24 flex-shrink-0">
                <img
                  src={DEFAULT_CARD_BACK}
                  alt="Coffee Shop Card Back"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Elegant coffee-themed playing card back with ornate borders and symmetrical design.
              </p>
            </div>
          </div>

          {/* Images Grid */}
          <div>
            <h4 className="text-sm font-medium mb-2">Card Face Images ({DEFAULT_BUNDLED_IMAGES.length} bundled)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {DEFAULT_BUNDLED_IMAGES.map((img, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg border-2 border-border overflow-hidden aspect-square"
                >
                  <img
                    src={img.image_url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                    <span className="text-xs text-white font-medium">{img.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 To customize packs with add/delete/regenerate features, create a new pack or use an existing database pack below.
          </p>
        </CardContent>
      </Card>

      {/* Database Packs */}
      {packs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No custom packs yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a new image pack to get started
            </p>
            <Button onClick={() => openPackDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Pack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {packs.map((pack) => {
            const images = packImages[pack.id] || [];
            const missingCount = images.filter((img) => !img.image_url).length;

            return (
              <AccordionItem key={pack.id} value={pack.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Package className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pack.name}</span>
                        {!pack.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        {pack.price_coins > 0 && (
                          <Badge variant="secondary">{pack.price_coins} coins</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {images.length} images
                        {missingCount > 0 && ` (${missingCount} need icons)`}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  {/* Card Back Section */}
                  <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      🎴 Card Back Design
                    </h4>
                    <div className="flex items-start gap-4">
                      {pack.card_back_url ? (
                        <div className="relative group rounded-lg border-2 border-primary overflow-hidden w-24 h-24 flex-shrink-0">
                          <img
                            src={`${pack.card_back_url}?t=${Date.now()}`}
                            alt={`${pack.name} Card Back`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleGenerateCardBack(pack)}
                              disabled={generatingCardBack === pack.id}
                            >
                              {generatingCardBack === pack.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 w-24 h-24 flex-shrink-0 flex items-center justify-center bg-muted">
                          <ImageOff className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          {pack.card_back_url 
                            ? "Hover over the card back to regenerate it with a new design."
                            : "Generate a themed playing card back design for this pack."}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateCardBack(pack)}
                          disabled={generatingCardBack === pack.id}
                        >
                          {generatingCardBack === pack.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-1" />
                              {pack.card_back_url ? "Regenerate Card Back" : "Generate Card Back"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Pack Actions */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePackActive(pack)}
                    >
                      {pack.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openPackDialog(pack)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit Pack
                    </Button>
                    {missingCount > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleGenerateMissing(pack.id)}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-1" />
                            Generate Missing ({missingCount})
                          </>
                        )}
                      </Button>
                    )}
                    {missingCount === 0 && images.length > 0 && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        All icons generated
                      </span>
                    )}
                  </div>

                  {generating && activePackId === pack.id && (
                    <div className="mb-4 space-y-2">
                      <Progress value={progress} />
                      <p className="text-sm text-center text-muted-foreground">
                        Generating: {currentImage}...
                      </p>
                    </div>
                  )}

                  {/* Add New Image */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Enter image name (e.g., Tea Pot, Scone...)"
                      value={activePackId === pack.id ? newImageName : ""}
                      onChange={(e) => {
                        setActivePackId(pack.id);
                        setNewImageName(e.target.value);
                      }}
                      onFocus={() => setActivePackId(pack.id)}
                      disabled={addingImage}
                    />
                    <Button
                      onClick={() => handleAddImage(pack.id)}
                      disabled={!newImageName.trim() || addingImage || activePackId !== pack.id}
                    >
                      {addingImage && activePackId === pack.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add & Generate
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Images Grid */}
                  {images.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No images yet. Add your first image above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {images.map((image) => (
                        <div
                          key={image.id}
                          className="relative group rounded-lg border-2 border-border overflow-hidden aspect-square"
                        >
                          {image.image_url ? (
                            <img
                              src={image.image_url}
                              alt={image.name}
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
                            <span className="text-xs text-white font-medium">{image.name}</span>
                          </div>

                          {/* Actions on hover */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRegenerate(image)}
                              disabled={regeneratingId === image.id || generating}
                            >
                              {regeneratingId === image.id ? (
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
                              onClick={() => setImageToDelete(image)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Pack Dialog */}
      <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPack ? "Edit Pack" : "Create New Pack"}</DialogTitle>
            <DialogDescription>
              {editingPack
                ? "Update the pack details below"
                : "Enter details for your new image pack"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Pack Name</Label>
              <Input
                id="pack-name"
                placeholder="e.g., Beach Day, Space Adventure"
                value={packFormData.name}
                onChange={(e) => setPackFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea
                id="pack-description"
                placeholder="Describe this image pack..."
                value={packFormData.description}
                onChange={(e) =>
                  setPackFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-price">Price (coins)</Label>
              <Input
                id="pack-price"
                type="number"
                min="0"
                value={packFormData.price_coins}
                onChange={(e) =>
                  setPackFormData((prev) => ({ ...prev, price_coins: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pack-active">Active</Label>
              <Switch
                id="pack-active"
                checked={packFormData.is_active}
                onCheckedChange={(checked) =>
                  setPackFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePack} disabled={savingPack}>
              {savingPack ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPack ? (
                "Update Pack"
              ) : (
                "Create Pack"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{imageToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
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
