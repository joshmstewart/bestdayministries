import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage, Textbox } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  RotateCcw, Save, Download, Brush, Undo2, 
  Sticker, Trash2, Type, Image as ImageIcon,
  Share2, Loader2, Palette, LetterText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickerPicker } from "@/components/coloring-book/StickerPicker";
import { WordArtPicker } from "@/components/card-creator/WordArtPicker";
import { useCoins } from "@/hooks/useCoins";

// Card-friendly color palette
const COLORS = [
  // Reds & Pinks
  "#FF6B6B", "#FF1493", "#FFC0CB",
  // Oranges & Yellows
  "#FF8C00", "#FFD700", "#FFA500",
  // Greens
  "#32CD32", "#90EE90", "#228B22",
  // Blues
  "#4169E1", "#87CEEB", "#00CED1",
  // Purples
  "#9370DB", "#8B00FF", "#DDA0DD",
  // Neutrals
  "#000000", "#808080", "#FFFFFF",
];

interface CardDesign {
  id: string;
  title: string;
  image_url: string;
  template_id: string | null;
}

interface CardCanvasProps {
  design: CardDesign | null;
  savedCanvasData?: string | null;
  isPublic?: boolean;
  onClose: () => void;
}

export function CardCanvas({ design, savedCanvasData, isPublic = false, onClose }: CardCanvasProps) {
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF6B6B");
  const [brushSize, setBrushSize] = useState(8);
  const [activeTool, setActiveTool] = useState<"select" | "brush" | "text" | "sticker" | "wordart">("select");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showWordArtPicker, setShowWordArtPicker] = useState(false);
  const { user } = useAuth();
  const { awardCoins } = useCoins();
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isShared, setIsShared] = useState(isPublic);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [existingCardId, setExistingCardId] = useState<string | null>(null);
  
  // Card dimensions (standard greeting card aspect ratio ~5:7)
  const CARD_WIDTH = 500;
  const CARD_HEIGHT = 700;

  // Store initial savedCanvasData in a ref to prevent it from being lost on re-renders
  const initialSavedDataRef = useRef<string | null>(savedCanvasData || null);
  const hasInitializedRef = useRef(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Check for existing user card for this design (like coloring upsert pattern)
  useEffect(() => {
    const checkExisting = async () => {
      if (!user?.id || !design?.id) return;
      
      const { data } = await supabase
        .from("user_cards")
        .select("id, canvas_data, is_public")
        .eq("user_id", user.id)
        .eq("card_design_id", design.id)
        .maybeSingle();
      
      if (data) {
        setExistingCardId(data.id);
        initialSavedDataRef.current = data.canvas_data;
        setIsShared(data.is_public || false);
      }
    };
    
    checkExisting();
  }, [user?.id, design?.id]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabricCanvasRef.current || !design) return;
    if (hasInitializedRef.current) return;

    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: "#FFFFFF",
      isDrawingMode: false,
      preserveObjectStacking: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    // Load saved canvas data if available
    const savedData = initialSavedDataRef.current;
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        canvas.loadFromJSON(parsed, () => {
          canvas.renderAll();
          hasInitializedRef.current = true;
        });
        
        // Still need to store original image for clear function
        const origImg = new Image();
        origImg.crossOrigin = "anonymous";
        origImg.onload = () => {
          originalImageRef.current = origImg;
        };
        origImg.src = design.image_url;
        
        setFabricCanvas(canvas);
        return () => {
          canvas.dispose();
        };
      } catch (e) {
        console.error("Failed to restore saved card:", e);
      }
    }
    
    hasInitializedRef.current = true;

    // Load the card design image as background
    FabricImage.fromURL(design.image_url, { crossOrigin: 'anonymous' }).then((img) => {
      // Scale to fill canvas while maintaining aspect ratio
      const scaleX = CARD_WIDTH / img.width!;
      const scaleY = CARD_HEIGHT / img.height!;
      const scale = Math.max(scaleX, scaleY);
      
      img.scale(scale);
      img.set({
        left: (CARD_WIDTH - img.width! * scale) / 2,
        top: (CARD_HEIGHT - img.height! * scale) / 2,
        selectable: false,
        evented: false,
      });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      
      // Store original image for clear function
      const origImg = new Image();
      origImg.crossOrigin = "anonymous";
      origImg.onload = () => {
        originalImageRef.current = origImg;
      };
      origImg.src = design.image_url;
    });

    // Track selection changes
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:updated', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));
    canvas.on('object:modified', () => setHasChanges(true));
    canvas.on('object:added', () => setHasChanges(true));
    canvas.on('path:created', () => setHasChanges(true));

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [design]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === "brush") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = brushSize;
      }
    } else {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Keyboard handler for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && activeObject.selectable !== false) {
          e.preventDefault();
          fabricCanvas.remove(activeObject);
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          setHasSelection(false);
          setHasChanges(true);
          toast.success("Deleted");
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas]);

  const handleDeleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.selectable !== false) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setHasSelection(false);
      setHasChanges(true);
      toast.success("Deleted");
    }
  }, [fabricCanvas]);

  const handleAddText = useCallback(() => {
    if (!fabricCanvas) return;
    
    const text = new Textbox("Add your message!", {
      left: CARD_WIDTH / 2 - 100,
      top: CARD_HEIGHT / 2 - 20,
      width: 200,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: activeColor,
      textAlign: 'center',
      editable: true,
    });
    
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    setActiveTool("select");
    setHasChanges(true);
  }, [fabricCanvas, activeColor]);

  const handleStickerSelect = useCallback((stickerUrl: string) => {
    if (!fabricCanvas) return;
    
    FabricImage.fromURL(stickerUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = Math.min(120 / img.width!, 120 / img.height!);
      img.scale(scale);
      img.set({
        left: CARD_WIDTH / 2 - (img.width! * scale) / 2,
        top: CARD_HEIGHT / 2 - (img.height! * scale) / 2,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      setHasChanges(true);
    });
    
    setShowStickerPicker(false);
    setActiveTool("select");
  }, [fabricCanvas]);

  const handleWordArtSelect = useCallback((wordArtUrl: string) => {
    if (!fabricCanvas) return;
    
    FabricImage.fromURL(wordArtUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Word arts are bigger than stickers - scale to fit nicely
      const scale = Math.min(200 / img.width!, 150 / img.height!);
      img.scale(scale);
      img.set({
        left: CARD_WIDTH / 2 - (img.width! * scale) / 2,
        top: CARD_HEIGHT / 3 - (img.height! * scale) / 2,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      setHasChanges(true);
    });
    
    setShowWordArtPicker(false);
    setActiveTool("select");
  }, [fabricCanvas]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas || !design) return;
    
    // Keep only the background image
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj) => {
      if (obj.selectable !== false) {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.renderAll();
    setHasChanges(true);
    setShowClearDialog(false);
    toast.success("Card cleared");
  }, [fabricCanvas, design]);

  const handleSave = async () => {
    if (!fabricCanvas || !user || !design) {
      toast.error("Please sign in to save");
      return;
    }

    setSaving(true);
    try {
      // Get canvas data
      const canvasData = JSON.stringify(fabricCanvas.toJSON());
      
      // Generate thumbnail
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.3,
      });

      // Upload thumbnail to storage
      const fileName = `card_${design.id}_${Date.now()}.png`;
      const blob = await fetch(dataUrl).then(r => r.blob());
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(`user-cards/${user.id}/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('app-assets')
        .getPublicUrl(`user-cards/${user.id}/${fileName}`);

      const thumbnailUrl = urlData.publicUrl;

      // Upsert pattern - like coloring book (1 save per design)
      if (existingCardId) {
        // Update existing card
        const { error } = await supabase
          .from('user_cards')
          .update({
            canvas_data: canvasData,
            thumbnail_url: thumbnailUrl,
            title: design.title,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCardId);

        if (error) throw error;
      } else {
        // Create new card
        const { data: newCard, error } = await supabase
          .from('user_cards')
          .insert({
            user_id: user.id,
            template_id: design.template_id,
            card_design_id: design.id,
            canvas_data: canvasData,
            thumbnail_url: thumbnailUrl,
            title: design.title,
          })
          .select('id')
          .single();

        if (error) throw error;
        setExistingCardId(newCard.id);
      }

      setHasChanges(false);
      toast.success("Card saved!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!fabricCanvas || !design) return;
    
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement('a');
    link.download = `${design.title.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success("Card downloaded!");
  };

  const handleShare = async () => {
    if (!existingCardId || !user) {
      toast.error("Save your card first to share it");
      return;
    }

    setSharing(true);
    try {
      const newShareState = !isShared;
      
      const { error } = await supabase
        .from('user_cards')
        .update({ is_public: newShareState })
        .eq('id', existingCardId);

      if (error) throw error;

      // Award coins on first share
      if (newShareState && !isShared && user) {
        await awardCoins(user.id, 5, 'Shared a card with the community');
      }

      setIsShared(newShareState);
      toast.success(newShareState ? "Card shared with community! +5 coins" : "Card is now private");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to update sharing");
    } finally {
      setSharing(false);
    }
  };

  if (!design) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
        {/* Tool buttons */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={activeTool === "select" ? "default" : "outline"}
            onClick={() => setActiveTool("select")}
            title="Select & Move"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "brush" ? "default" : "outline"}
            onClick={() => setActiveTool("brush")}
            title="Draw"
          >
            <Brush className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "text" ? "default" : "outline"}
            onClick={() => {
              setActiveTool("text");
              handleAddText();
            }}
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "sticker" ? "default" : "outline"}
            onClick={() => {
              setActiveTool("sticker");
              setShowStickerPicker(true);
            }}
            title="Add Sticker"
          >
            <Sticker className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "wordart" ? "default" : "outline"}
            onClick={() => {
              setActiveTool("wordart");
              setShowWordArtPicker(true);
            }}
            title="Add Word Art"
          >
            <LetterText className="w-4 h-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Brush size (when brush active) */}
        {activeTool === "brush" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={2}
              max={30}
              step={1}
              className="w-24"
            />
          </div>
        )}

        {/* Color picker */}
        <div className="flex items-center gap-1">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-0.5 flex-wrap max-w-[200px]">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded-sm border-2 transition-transform hover:scale-110 ${
                  activeColor === color ? "border-primary ring-1 ring-primary" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setActiveColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Action buttons */}
        <div className="flex gap-1">
          {hasSelection && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowClearDialog(true)}
            title="Clear All"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save/Download/Share */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={isShared ? "secondary" : "outline"}
            onClick={handleShare}
            disabled={sharing || !existingCardId}
            title={existingCardId ? (isShared ? "Make Private" : "Share to Community") : "Save first to share"}
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            title="Save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex justify-center">
        <div className="border rounded-lg shadow-lg overflow-hidden bg-white">
          <canvas ref={fabricCanvasRef} />
        </div>
      </div>

      {/* Sticker Picker Dialog */}
      <StickerPicker
        open={showStickerPicker}
        onOpenChange={setShowStickerPicker}
        onSelectSticker={handleStickerSelect}
      />

      {/* Word Art Picker Dialog */}
      <WordArtPicker
        open={showWordArtPicker}
        onOpenChange={setShowWordArtPicker}
        onSelectWordArt={handleWordArtSelect}
        templateId={design?.template_id}
      />

      {/* Clear confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all your drawings, text, and stickers. The background design will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
