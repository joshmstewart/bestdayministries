import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorToast";
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
import { Loader2, Wand2, RefreshCw, Check, ImageOff, AlertTriangle, X, Copy, Plus, Trash2, Package, Eye, EyeOff, Edit, Star, Play } from "lucide-react";
import { Lightbulb } from "lucide-react";
import { MemoryMatchPreview } from "./MemoryMatchPreview";
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
import { ScrollArea } from "@/components/ui/scroll-area";


interface ImagePack {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  card_back_url: string | null;
  is_default: boolean;
  is_active: boolean;
  is_purchasable: boolean;
  price_coins: number;
  display_order: number;
  design_style: string | null;
  background_color: string | null;
  module_color: string | null;
  card_text_color: string;
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

interface PackIdea {
  id: string;
  name: string;
  description: string | null;
  is_used: boolean;
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
    is_purchasable: false,
    price_coins: 0,
    is_active: false, // New packs start inactive
    design_style: "Clean modern illustration, elegant and sophisticated, warm earthy tones, simple shapes, white background, approachable but adult aesthetic, no cartoon faces or childish elements",
    background_color: "#F97316",
    module_color: "#FFFFFF",
    card_text_color: "black" as "white" | "black",
  });
  const [savingPack, setSavingPack] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingColors, setGeneratingColors] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<string[]>([]);
  const [generatingAllContent, setGeneratingAllContent] = useState(false);

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Game preview state
  const [gamePreviewPack, setGamePreviewPack] = useState<{ name: string; images: { name: string; image_url: string | null }[]; cardBackUrl: string | null; backgroundColor: string | null; moduleColor: string | null } | null>(null);

  // Pack ideas state
  const [packIdeasDialogOpen, setPackIdeasDialogOpen] = useState(false);
  const [packIdeas, setPackIdeas] = useState<PackIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [generatingMoreIdeas, setGeneratingMoreIdeas] = useState(false);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    const { data: packsData, error: packsError } = await supabase
      .from("memory_match_packs")
      .select("*")
      .order("display_order");

    if (packsError) {
      showErrorToast("Failed to load packs");
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
      showErrorToast("Please enter an image name");
      return;
    }

    // Check if already exists in this pack
    const existingImages = packImages[packId] || [];
    const exists = existingImages.some(
      (img) => img.name.toLowerCase() === newImageName.toLowerCase()
    );
    if (exists) {
      showErrorToast("This image already exists in this pack");
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
      const result = await generateIcon(newImage as PackImage, pack?.name || "Custom", pack?.design_style);

      if (result.ok) {
        toast.success(`Icon generated for ${newImageName}!`);
      } else {
        toast.warning(`Added ${newImageName} but icon generation failed. You can regenerate it later.`);
        setErrors((prev) => [...prev, { imageName: newImageName, error: result.errorMessage || "Unknown error" }]);
      }

      await loadPacks();
    } catch (error) {
      console.error("Failed to add image:", error);
      showErrorToast("Failed to add image");
    } finally {
      setAddingImage(false);
    }
  };

  const generateIcon = async (
    image: PackImage,
    packName: string,
    designStyle?: string | null
  ): Promise<{ ok: boolean; imageUrl?: string; errorMessage?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-icon",
        {
          body: {
            imageId: image.id,
            imageName: image.name,
            packName,
            designStyle: designStyle || undefined,
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
        const result = await generateIcon(image, pack?.name || "Custom", pack?.design_style);
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
    const result = await generateIcon(image, pack?.name || "Custom", pack?.design_style);

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
      // Check if it's a network/timeout error - the icon might still be generating
      // ONLY real network errors should trigger recovery, not API errors
      const isNetworkError = (
        result.errorMessage?.includes("Failed to fetch") || 
        result.errorMessage?.includes("Failed to send a request") ||
        result.errorMessage?.includes("network") ||
        result.errorMessage?.includes("timeout")
      ) && !result.errorMessage?.includes("AI") && !result.errorMessage?.includes("API");
      
      if (isNetworkError) {
        // The edge function might still be running - poll with delays to check if it completes
        toast.info(`Request timed out for ${image.name}. Checking if generation completed...`);
        
        // Record when we clicked regenerate (before the API call started)
        // Use a timestamp from ~2 seconds BEFORE now to account for when we initiated
        const requestStartTime = Date.now();
        
        // First, get the CURRENT file's last-modified time so we know what to compare against
        let originalFileTime = 0;
        const storageBaseUrl = `https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/game-assets/memory-match/${image.id}.png`;
        try {
          const initialHead = await fetch(`${storageBaseUrl}?t=${Date.now()}`, { method: 'HEAD' });
          const initialLastModified = initialHead.headers.get('last-modified');
          if (initialLastModified) {
            originalFileTime = new Date(initialLastModified).getTime();
          }
        } catch {
          // File might not exist yet, that's fine
        }
        
        // Poll a few times with delays to give the backend time to finish
        for (let attempt = 1; attempt <= 3; attempt++) {
          // Wait progressively longer: 5s, 10s, 15s
          await new Promise(r => setTimeout(r, attempt * 5000));
          
          try {
            const headResponse = await fetch(`${storageBaseUrl}?t=${Date.now()}`, { method: 'HEAD' });
            const lastModified = headResponse.headers.get('last-modified');
            
            if (lastModified) {
              const fileTime = new Date(lastModified).getTime();
              // File must be NEWER than both our request start AND the original file time
              const isNewlyModified = fileTime > requestStartTime && fileTime > originalFileTime + 1000;
              
              if (isNewlyModified) {
                // Update state with the new image
                const cacheBustedUrl = `${storageBaseUrl}?t=${Date.now()}`;
                setPackImages((prev) => ({
                  ...prev,
                  [image.pack_id]: (prev[image.pack_id] || []).map((img) =>
                    img.id === image.id ? { ...img, image_url: cacheBustedUrl } : img
                  ),
                }));
                setErrors((prev) => prev.filter((e) => e.imageName !== image.name));
                toast.success(`Regenerated icon for ${image.name} (recovered after timeout)`);
                setRegeneratingId(null);
                return;
              }
            }
          } catch (fetchError) {
            // Ignore fetch errors during polling
            console.log(`Poll attempt ${attempt} failed:`, fetchError);
          }
        }
        
        // After all polling attempts, give up
        toast.warning(`Generation may still be in progress for ${image.name}. Try refreshing the page in a moment.`);
      }
      
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.imageName !== image.name);
        return [...filtered, { imageName: image.name, error: result.errorMessage || "Unknown error" }];
      });
      showErrorToast(`Failed to regenerate icon for ${image.name}`);
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
      showErrorToast("Failed to delete image");
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
    const defaultStyle = "Clean modern illustration, elegant and sophisticated, warm earthy tones, simple shapes, white background, approachable but adult aesthetic, no cartoon faces or childish elements";
    if (pack) {
      setEditingPack(pack);
      setPackFormData({
        name: pack.name,
        description: pack.description || "",
        is_purchasable: pack.is_purchasable,
        price_coins: pack.price_coins,
        is_active: pack.is_active,
        design_style: pack.design_style || defaultStyle,
        background_color: pack.background_color || "#F97316",
        module_color: pack.module_color || "#FFFFFF",
        card_text_color: (pack.card_text_color || "black") as "white" | "black",
      });
    } else {
      setEditingPack(null);
      setPackFormData({
        name: "",
        description: "",
        is_purchasable: false,
        price_coins: 0,
        is_active: true,
        design_style: defaultStyle,
        background_color: "#F97316",
        module_color: "#FFFFFF",
        card_text_color: "black",
      });
    }
    setPackDialogOpen(true);
  };

  // State for individual regeneration
  const [generatingStyle, setGeneratingStyle] = useState(false);
  const [generatingItems, setGeneratingItems] = useState(false);

  const handleGenerateAll = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-description",
        { body: { packName: packFormData.name.trim(), generateOnly: "all" } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.description) {
        setPackFormData((prev) => ({ ...prev, description: data.description }));
      }
      if (data?.suggestedItems) {
        setSuggestedItems(data.suggestedItems);
      }
      if (data?.designStyle) {
        setPackFormData((prev) => ({ ...prev, design_style: data.designStyle }));
      }

      toast.success("All content generated!");
    } catch (error) {
      console.error("Failed to generate content:", error);
      showErrorToast("Failed to generate content");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name first");
      return;
    }

    setGeneratingDescription(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-description",
        { body: { packName: packFormData.name.trim(), generateOnly: "description" } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.description) {
        setPackFormData((prev) => ({ ...prev, description: data.description }));
        toast.success("Description generated!");
      }
    } catch (error) {
      console.error("Failed to generate description:", error);
      showErrorToast("Failed to generate description");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleGenerateStyle = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name first");
      return;
    }

    setGeneratingStyle(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-description",
        { body: { packName: packFormData.name.trim(), generateOnly: "style" } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.designStyle) {
        setPackFormData((prev) => ({ ...prev, design_style: data.designStyle }));
        toast.success("Style generated!");
      }
    } catch (error) {
      console.error("Failed to generate style:", error);
      showErrorToast("Failed to generate style");
    } finally {
      setGeneratingStyle(false);
    }
  };

  const handleGenerateColors = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name first");
      return;
    }

    setGeneratingColors(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-description",
        { body: { packName: packFormData.name.trim(), generateOnly: "colors" } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.backgroundGlow && data?.moduleColor) {
        setPackFormData((prev) => ({
          ...prev,
          background_color: data.backgroundGlow,
          module_color: data.moduleColor,
        }));
        toast.success("Colors generated!");
      }
    } catch (error) {
      console.error("Failed to generate colors:", error);
      showErrorToast("Failed to generate colors");
    } finally {
      setGeneratingColors(false);
    }
  };

  const handleGenerateItems = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name first");
      return;
    }

    setGeneratingItems(true);
    try {
      // Collect existing items to exclude (from packImages + suggestedItems)
      const existingFromPack = editingPack 
        ? (packImages[editingPack.id] || []).map(img => img.name)
        : [];
      const existingItems = [...new Set([...existingFromPack, ...suggestedItems])];
      
      const { data, error } = await supabase.functions.invoke(
        "generate-memory-match-description",
        { body: { packName: packFormData.name.trim(), generateOnly: "items", existingItems } }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.suggestedItems) {
        setSuggestedItems(data.suggestedItems);
        toast.success("Items generated!");
      }
    } catch (error) {
      console.error("Failed to generate items:", error);
      showErrorToast("Failed to generate items");
    } finally {
      setGeneratingItems(false);
    }
  };

  const handleSavePack = async () => {
    if (!packFormData.name.trim()) {
      showErrorToast("Please enter a pack name");
      return;
    }

    setSavingPack(true);
    try {
      let packId: string | null = null;

      if (editingPack) {
        const { error } = await supabase
          .from("memory_match_packs")
          .update({
            name: packFormData.name.trim(),
            description: packFormData.description.trim() || null,
            is_purchasable: packFormData.is_purchasable,
            price_coins: packFormData.is_purchasable ? packFormData.price_coins : 0,
            is_active: packFormData.is_active,
            design_style: packFormData.design_style.trim() || null,
            background_color: packFormData.background_color || "#F97316",
            module_color: packFormData.module_color || "#FFFFFF",
            card_text_color: packFormData.card_text_color,
          })
          .eq("id", editingPack.id);

        if (error) throw error;
        packId = editingPack.id;
        toast.success("Pack updated");
      } else {
        const { data: newPack, error } = await supabase
          .from("memory_match_packs")
          .insert({
            name: packFormData.name.trim(),
            description: packFormData.description.trim() || null,
            is_purchasable: packFormData.is_purchasable,
            price_coins: packFormData.is_purchasable ? packFormData.price_coins : 0,
            is_active: false, // Always start inactive
            display_order: packs.length,
            design_style: packFormData.design_style.trim() || null,
            background_color: packFormData.background_color || "#F97316",
            module_color: packFormData.module_color || "#FFFFFF",
            card_text_color: packFormData.card_text_color,
          })
          .select()
          .single();

        if (error) throw error;
        packId = newPack.id;
        toast.success("Pack created (inactive - activate when ready)");
      }

      setPackDialogOpen(false);
      await loadPacks();

      // Only add suggested items for NEW packs (not when editing)
      // Run in background so dialog can close immediately
      if (!editingPack && packId && suggestedItems.length > 0) {
        toast.info(`Adding ${suggestedItems.length} card items - icons will generate in background...`);
        handleAddSuggestedItems(packId, suggestedItems, true); // true = run in background
      }

      setSuggestedItems([]);
    } catch (error) {
      console.error("Failed to save pack:", error);
      showErrorToast("Failed to save pack");
    } finally {
      setSavingPack(false);
    }
  };

  const formatErrorForDisplay = (err: unknown) => {
    if (!err) return "Unknown error";
    const anyErr = err as any;

    // PostgrestError typically contains: message, details, hint, code
    const parts: string[] = [];
    if (typeof anyErr.message === "string" && anyErr.message.trim()) parts.push(anyErr.message.trim());
    if (typeof anyErr.details === "string" && anyErr.details.trim()) parts.push(`Details: ${anyErr.details.trim()}`);
    if (typeof anyErr.hint === "string" && anyErr.hint.trim()) parts.push(`Hint: ${anyErr.hint.trim()}`);
    if (typeof anyErr.code === "string" && anyErr.code.trim()) parts.push(`Code: ${anyErr.code.trim()}`);
    if (typeof anyErr.status === "number") parts.push(`HTTP: ${anyErr.status}`);

    if (parts.length > 0) return parts.join("\n");

    try {
      return JSON.stringify(anyErr, null, 2);
    } catch {
      return String(anyErr);
    }
  };

  // Background generation - doesn't block UI
  const runBackgroundGeneration = async (
    packId: string, 
    packName: string, 
    packDescription: string,
    designStyle: string,
    insertedImages: PackImage[],
    existingCardBackUrl?: string | null
  ) => {
    // Generate icons in batches of 3
    const BATCH_SIZE = 3;
    let successCount = 0;
    const generationErrors: GenerationError[] = [];

    for (let i = 0; i < insertedImages.length; i += BATCH_SIZE) {
      const batch = insertedImages.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map((img) => generateIcon(img, packName, designStyle)));

      results.forEach((result, idx) => {
        if (result.ok) {
          successCount++;
        } else {
          generationErrors.push({
            imageName: batch[idx].name,
            error: result.errorMessage || "Unknown error",
          });
        }
      });
      
      // Progress toast every batch
      toast.info(`Generated ${successCount}/${insertedImages.length} icons...`, { id: `gen-progress-${packId}` });
    }

    if (generationErrors.length > 0) {
      setErrors(prev => [...prev, ...generationErrors]);
      toast.warning(
        `Generated ${successCount}/${insertedImages.length} icons. ${generationErrors.length} failed.`,
        { id: `gen-progress-${packId}` }
      );
    } else {
      toast.success(`Generated all ${successCount} icons!`, { id: `gen-progress-${packId}` });
    }

    // Only generate card back if one doesn't already exist
    if (!existingCardBackUrl) {
      const packForCardBack = {
        id: packId,
        name: packName,
        description: packDescription,
      } as ImagePack;
      await handleGenerateCardBack(packForCardBack);
    }

    await loadPacks();
    setGeneratingAllContent(false);
  };

  const handleAddSuggestedItems = async (packId: string, items: string[], runInBackground = false) => {
    setGeneratingAllContent(true);
    const pack = packs.find((p) => p.id === packId);
    const packName = pack?.name || packFormData.name.trim();
    const designStyle = packFormData.design_style;
    const packDescription = packFormData.description;
    const existingCardBackUrl = pack?.card_back_url;

    try {
      // Insert all items first
      const insertData = items.map((name, idx) => ({
        pack_id: packId,
        name,
        display_order: idx,
        image_url: null,
      }));

      const { data: insertedImages, error: insertError } = await supabase
        .from("memory_match_images")
        .insert(insertData)
        .select();

      if (insertError) throw insertError;

      toast.success(`Added ${items.length} items! Generating icons in background...`);

      if (runInBackground) {
        // Don't await - let it run in background
        runBackgroundGeneration(packId, packName, packDescription, designStyle, insertedImages as PackImage[], existingCardBackUrl);
        return; // Return immediately, generation continues in background
      }

      // Original synchronous flow for "Generate All" button
      const BATCH_SIZE = 3;
      let successCount = 0;
      const generationErrors: GenerationError[] = [];

      for (let i = 0; i < (insertedImages?.length || 0); i += BATCH_SIZE) {
        const batch = insertedImages!.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((img) => generateIcon(img as PackImage, packName, designStyle)));

        results.forEach((result, idx) => {
          if (result.ok) {
            successCount++;
          } else {
            generationErrors.push({
              imageName: batch[idx].name,
              error: result.errorMessage || "Unknown error",
            });
          }
        });
      }

      if (generationErrors.length > 0) {
        setErrors(generationErrors);
        toast.warning(
          `Generated ${successCount}/${items.length} icons. ${generationErrors.length} failed.`
        );
      } else {
        toast.success(`Generated all ${successCount} icons!`);
      }

      // Only generate card back if one doesn't already exist
      if (!existingCardBackUrl) {
        const packForCardBack = {
          id: packId,
          name: packName,
          description: packDescription,
        } as ImagePack;
        await handleGenerateCardBack(packForCardBack);
      }

      await loadPacks();
    } catch (error) {
      const message = formatErrorForDisplay(error);
      console.error("Failed to add suggested items:", error);

      // Persistent, copyable error panel
      setErrors((prev) => [
        ...prev,
        {
          imageName: "Add suggested items",
          error: message,
        },
      ]);

      showErrorToast("Failed to add suggested items (see error panel above)");
    } finally {
      if (!runInBackground) {
        setGeneratingAllContent(false);
      }
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
      showErrorToast("Failed to update pack");
    }
  };

  const setAsDefaultPack = async (pack: ImagePack) => {
    try {
      // First, unset any existing default
      await supabase
        .from("memory_match_packs")
        .update({ is_default: false })
        .eq("is_default", true);

      // Then set this pack as default
      const { error } = await supabase
        .from("memory_match_packs")
        .update({ is_default: true })
        .eq("id", pack.id);

      if (error) throw error;

      setPacks((prev) =>
        prev.map((p) => ({ ...p, is_default: p.id === pack.id }))
      );
      toast.success(`"${pack.name}" is now the default pack`);
    } catch (error) {
      console.error("Failed to set default pack:", error);
      showErrorToast("Failed to set default pack");
    }
  };

  const setPreviewImageForPack = async (packId: string, imageUrl: string) => {
    try {
      const { error } = await supabase
        .from("memory_match_packs")
        .update({ preview_image_url: imageUrl })
        .eq("id", packId);

      if (error) throw error;

      setPacks((prev) =>
        prev.map((p) => (p.id === packId ? { ...p, preview_image_url: imageUrl } : p))
      );
      toast.success("Preview image set!");
    } catch (error) {
      console.error("Failed to set preview image:", error);
      showErrorToast("Failed to set preview image");
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
        showErrorToast(`Failed to generate card back: ${error.message}`);
        return;
      }

      if ((data as any)?.error) {
        showErrorToast(`Failed to generate card back: ${(data as any).error}`);
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
      showErrorToast("Failed to generate card back");
    } finally {
      setGeneratingCardBack(null);
    }
  };

  // Load pack ideas from database
  const loadPackIdeas = async () => {
    setLoadingIdeas(true);
    const { data, error } = await supabase
      .from("memory_match_pack_ideas")
      .select("*")
      .order("is_used", { ascending: true })
      .order("name");
    
    if (error) {
      console.error("Failed to load pack ideas:", error);
      showErrorToast("Failed to load pack ideas");
    } else {
      setPackIdeas(data || []);
    }
    setLoadingIdeas(false);
  };

  // Generate more pack ideas using AI
  const handleGenerateMoreIdeas = async () => {
    setGeneratingMoreIdeas(true);
    try {
      const existingNames = packIdeas.map(idea => idea.name);
      const usedNames = packs.map(pack => pack.name);
      const allExisting = [...existingNames, ...usedNames];

      const { data, error } = await supabase.functions.invoke("lovable-ai", {
        body: {
          messages: [
            {
              role: "system",
              content: "You are a creative theme generator for a Memory Match card game designed for ADULTS with special needs. Generate fun, engaging pack themes that would make great matching games. Focus on concrete, drawable objects - NOT movies, books, or abstract concepts."
            },
            {
              role: "user",
              content: `Generate 10 new unique pack theme ideas for a Memory Match game. Each should be a category with 15-20 distinct, drawable items.

AVOID these existing themes: ${allExisting.join(", ")}

Respond with ONLY a JSON array of objects with "name" and "description" fields. Example:
[{"name": "Theme Name", "description": "Brief description of what items would be in this pack"}]`
            }
          ]
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const content = data?.content || "";
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Invalid response format");
      
      const newIdeas = JSON.parse(jsonMatch[0]) as { name: string; description: string }[];
      
      // Insert new ideas into database
      const { error: insertError } = await supabase
        .from("memory_match_pack_ideas")
        .insert(newIdeas.map(idea => ({
          name: idea.name,
          description: idea.description,
          is_used: false
        })));

      if (insertError) {
        // Some may already exist, that's ok
        console.log("Some ideas may already exist:", insertError);
      }

      await loadPackIdeas();
      toast.success(`Generated ${newIdeas.length} new pack ideas!`);
    } catch (error) {
      console.error("Failed to generate ideas:", error);
      showErrorToast("Failed to generate new ideas");
    } finally {
      setGeneratingMoreIdeas(false);
    }
  };

  // Use a pack idea - opens the pack dialog with the idea's name
  const handleUsePackIdea = async (idea: PackIdea) => {
    // Mark as used
    await supabase
      .from("memory_match_pack_ideas")
      .update({ is_used: true })
      .eq("id", idea.id);

    // Close ideas dialog
    setPackIdeasDialogOpen(false);

    // Open pack dialog with the idea's name pre-filled
    const defaultStyle = "Clean modern illustration, elegant and sophisticated, warm earthy tones, simple shapes, white background, approachable but adult aesthetic, no cartoon faces or childish elements";
    setEditingPack(null);
    setPackFormData({
      name: idea.name,
      description: idea.description || "",
      is_purchasable: false,
      price_coins: 0,
      is_active: true,
      design_style: defaultStyle,
      background_color: "#F97316",
      module_color: "#FFFFFF",
      card_text_color: "black",
    });
    setPackDialogOpen(true);
    
    // Auto-generate content for this pack
    setTimeout(() => {
      handleGenerateAll();
    }, 100);
  };

  // Open ideas dialog
  const openPackIdeasDialog = () => {
    setPackIdeasDialogOpen(true);
    loadPackIdeas();
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={openPackIdeasDialog}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Browse Ideas
          </Button>
          <Button onClick={() => openPackDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Pack
          </Button>
        </div>
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
                    {/* Show card back or preview image */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                      {pack.card_back_url ? (
                        <img 
                          src={pack.card_back_url} 
                          alt="Card back" 
                          className="w-full h-full object-cover"
                        />
                      ) : pack.preview_image_url ? (
                        <img 
                          src={pack.preview_image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : images[0]?.image_url ? (
                        <img 
                          src={images[0].image_url} 
                          alt="First image" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{pack.name}</span>
                        {pack.is_default && (
                          <Badge className="bg-amber-500 hover:bg-amber-600">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                        {!pack.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        {pack.is_purchasable ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                            🛒 {pack.price_coins} coins
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            Free
                          </Badge>
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
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setPreviewImage({ url: `${pack.card_back_url}?t=${Date.now()}`, name: `${pack.name} Card Back` })}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage({ url: `${pack.card_back_url}?t=${Date.now()}`, name: `${pack.name} Card Back` });
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateCardBack(pack);
                              }}
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

                  {/* Design Style Preview */}
                  {pack.design_style && (
                    <div className="mb-4 p-3 rounded-lg bg-accent/50 border border-accent">
                      <div className="flex items-center gap-2 mb-1">
                        <Wand2 className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium">Image Style</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {pack.design_style}
                      </p>
                    </div>
                  )}

                  {/* Pack Actions */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const imgs = packImages[pack.id] || [];
                        setGamePreviewPack({
                          name: pack.name,
                          images: imgs.map(img => ({ name: img.name, image_url: img.image_url })),
                          cardBackUrl: pack.card_back_url ? `${pack.card_back_url}?t=${Date.now()}` : null,
                          backgroundColor: pack.background_color,
                          moduleColor: pack.module_color,
                        });
                      }}
                      disabled={!images.some(img => img.image_url)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview Game
                    </Button>
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
                    {!pack.is_default && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAsDefaultPack(pack)}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        Set as Default
                      </Button>
                    )}
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
                      {images.map((image) => {
                        const isPreview = pack.preview_image_url === image.image_url;
                        return (
                          <div
                            key={image.id}
                            className={`relative group rounded-lg border-2 overflow-hidden aspect-square ${
                              isPreview ? 'border-primary ring-2 ring-primary/50' : 'border-border'
                            }`}
                          >
                            {image.image_url ? (
                              <img
                                src={image.image_url}
                                alt={image.name}
                                className="w-full h-full object-cover cursor-pointer"
                                loading="lazy"
                                onClick={() => setPreviewImage({ url: image.image_url!, name: image.name })}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageOff className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}

                            {/* Preview badge */}
                            {isPreview && (
                              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                                Preview
                              </div>
                            )}

                            {/* Name overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                              <span className="text-xs text-white font-medium">{image.name}</span>
                            </div>

                            {/* Actions on hover */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                              {image.image_url && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setPreviewImage({ url: image.image_url!, name: image.name })}
                                    className="text-xs h-7"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  {!isPreview && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setPreviewImageForPack(pack.id, image.image_url!)}
                                      className="text-xs h-7"
                                    >
                                      <Star className="w-3 h-3 mr-1" />
                                      Set Preview
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRegenerate(image)}
                                disabled={regeneratingId === image.id || generating}
                                className="text-xs h-7"
                              >
                                {regeneratingId === image.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regen
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setImageToDelete(image)}
                                className="text-xs h-7"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
              <div className="flex gap-2">
                <Input
                  id="pack-name"
                  placeholder="e.g., Beach Day, Space Adventure"
                  value={packFormData.name}
                  onChange={(e) => setPackFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateAll}
                  disabled={generatingDescription || generatingStyle || generatingItems || !packFormData.name.trim()}
                  title="Generate ALL: description, items, and style"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pack-description">Description</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !packFormData.name.trim()}
                  className="h-7 px-2"
                  title="Regenerate description only"
                >
                  {generatingDescription ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="pack-description"
                placeholder="Describe this image pack..."
                value={packFormData.description}
                onChange={(e) =>
                  setPackFormData((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            {/* Availability Settings */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-sm font-medium flex items-center gap-2">
                💰 Availability & Pricing
              </h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-purchasable">Require Purchase</Label>
                  <p className="text-xs text-muted-foreground">
                    If enabled, users must buy this pack with coins
                  </p>
                </div>
                <Switch
                  id="is-purchasable"
                  checked={packFormData.is_purchasable}
                  onCheckedChange={(checked) =>
                    setPackFormData((prev) => ({ ...prev, is_purchasable: checked }))
                  }
                />
              </div>
              {packFormData.is_purchasable && (
                <div className="space-y-2">
                  <Label htmlFor="price-coins">Price (JoyCoins)</Label>
                  <Input
                    id="price-coins"
                    type="number"
                    min={0}
                    value={packFormData.price_coins}
                    onChange={(e) =>
                      setPackFormData((prev) => ({ ...prev, price_coins: parseInt(e.target.value) || 0 }))
                    }
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many coins users need to unlock this pack
                  </p>
                </div>
              )}
            </div>

            {/* Design Style / Aesthetic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pack-design-style">Image Style / Aesthetic</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateStyle}
                  disabled={generatingStyle || !packFormData.name.trim()}
                  className="h-7 px-2"
                  title="Regenerate style only"
                >
                  {generatingStyle ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="pack-design-style"
                placeholder="Describe the visual style for generated images..."
                value={packFormData.design_style}
                onChange={(e) =>
                  setPackFormData((prev) => ({ ...prev, design_style: e.target.value }))
                }
                className="min-h-[80px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Describe colors, art style, mood. Examples: "Watercolor botanical", "Vintage travel poster", "Minimalist line art"
              </p>
            </div>

            {/* Color Customization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Game Colors</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateColors}
                  disabled={generatingColors || !packFormData.name.trim()}
                  className="h-7 px-2"
                >
                  {generatingColors ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="background-color" className="text-xs text-muted-foreground">
                    Background Glow
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="background-color"
                      value={packFormData.background_color}
                      onChange={(e) =>
                        setPackFormData((prev) => ({ ...prev, background_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-border"
                    />
                    <Input
                      value={packFormData.background_color}
                      onChange={(e) =>
                        setPackFormData((prev) => ({ ...prev, background_color: e.target.value }))
                      }
                      placeholder="#F97316"
                      className="flex-1 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module-color" className="text-xs text-muted-foreground">
                    Module Background
                  </Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="module-color"
                      value={packFormData.module_color}
                      onChange={(e) =>
                        setPackFormData((prev) => ({ ...prev, module_color: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-border"
                    />
                    <Input
                      value={packFormData.module_color}
                      onChange={(e) =>
                        setPackFormData((prev) => ({ ...prev, module_color: e.target.value }))
                      }
                      placeholder="#FFFFFF"
                      className="flex-1 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-text-color" className="text-xs text-muted-foreground">
                    Card Label Text Color
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={packFormData.card_text_color === "black" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPackFormData((prev) => ({ ...prev, card_text_color: "black" as const }))}
                      className="flex-1"
                    >
                      Black Text
                    </Button>
                    <Button
                      type="button"
                      variant={packFormData.card_text_color === "white" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPackFormData((prev) => ({ ...prev, card_text_color: "white" as const }))}
                      className="flex-1"
                    >
                      White Text
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose based on card image brightness. Use white for dark images, black for light images.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Background Glow: outer warm glow area. Module: the white card with game elements.
              </p>
            </div>

            {(editingPack || suggestedItems.length > 0) && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Card Items ({suggestedItems.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Generate suggestions button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateItems}
                      disabled={generatingItems || !packFormData.name.trim()}
                      className="h-7 px-2"
                      title="Regenerate items only"
                    >
                      {generatingItems ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                    </Button>
                    {suggestedItems.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSuggestedItems([])}
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
                
                {suggestedItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {suggestedItems.map((item, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="text-xs pr-1 flex items-center gap-1"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => setSuggestedItems(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Click the ✨ wand above to generate suggestions, or add items manually below
                  </p>
                )}
                
                {/* Add new item input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add another item..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const input = e.currentTarget;
                        const value = input.value.trim();
                        if (value && !suggestedItems.includes(value)) {
                          setSuggestedItems(prev => [...prev, value]);
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      const value = input?.value.trim();
                      if (value && !suggestedItems.includes(value)) {
                        setSuggestedItems(prev => [...prev, value]);
                        input.value = "";
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                {/* Generate All button - only when editing and there are items */}
                {editingPack && suggestedItems.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => handleAddSuggestedItems(editingPack.id, suggestedItems)}
                    disabled={generatingAllContent}
                    className="w-full"
                  >
                    {generatingAllContent ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating {suggestedItems.length} images...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate All {suggestedItems.length} Images
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {editingPack 
                    ? "✨ Add items to your list, then click 'Generate All' to create icons" 
                    : "✨ These items + card back will be generated after saving"}
                </p>
              </div>
            )}
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

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Game Preview Dialog */}
      <MemoryMatchPreview
        open={!!gamePreviewPack}
        onOpenChange={(open) => !open && setGamePreviewPack(null)}
        packName={gamePreviewPack?.name || ""}
        images={gamePreviewPack?.images || []}
        cardBackUrl={gamePreviewPack?.cardBackUrl}
        backgroundColor={gamePreviewPack?.backgroundColor}
        moduleColor={gamePreviewPack?.moduleColor}
      />

      {/* Pack Ideas Dialog */}
      <Dialog open={packIdeasDialogOpen} onOpenChange={setPackIdeasDialogOpen}>
        <DialogContent className="max-w-2xl h-[85vh] min-h-0 !flex !flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Pack Ideas
            </DialogTitle>
            <DialogDescription>
              Browse pre-generated pack ideas or generate more. Click "Use" to create a pack from an idea.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateMoreIdeas}
              disabled={generatingMoreIdeas || loadingIdeas}
            >
              {generatingMoreIdeas ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate More Ideas
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {loadingIdeas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : packIdeas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pack ideas yet. Click "Generate More Ideas" to get started!</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {packIdeas.map((idea) => {
                  const isAlreadyCreated = packs.some(p => p.name.toLowerCase() === idea.name.toLowerCase());
                  return (
                    <div
                      key={idea.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        idea.is_used || isAlreadyCreated
                          ? "bg-muted/50 opacity-60"
                          : "bg-card hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{idea.name}</h4>
                          {(idea.is_used || isAlreadyCreated) && (
                            <Badge variant="secondary" className="text-xs">
                              {isAlreadyCreated ? "Created" : "Used"}
                            </Badge>
                          )}
                        </div>
                        {idea.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {idea.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUsePackIdea(idea)}
                        disabled={isAlreadyCreated}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Use
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
