import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage, FabricText, Textbox } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
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
  Share2, Loader2, Palette
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickerPicker } from "@/components/coloring-book/StickerPicker";
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

interface CardCanvasProps {
  template: {
    id: string;
    title: string;
    background_image_url?: string | null;
    cover_image_url: string;
  } | null;
  savedCard?: {
    id: string;
    canvas_data: string;
    title?: string;
    is_public?: boolean;
  } | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function CardCanvas({ template, savedCard, onClose, onSaved }: CardCanvasProps) {
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF6B6B");
  const [brushSize, setBrushSize] = useState(8);
  const [activeTool, setActiveTool] = useState<"select" | "brush" | "text" | "sticker">("select");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const { user } = useAuth();
  const { awardCoins } = useCoins();
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isShared, setIsShared] = useState(savedCard?.is_public || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [cardTitle, setCardTitle] = useState(savedCard?.title || template?.title || "My Card");
  const [hasSelection, setHasSelection] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  // Card dimensions (standard greeting card aspect ratio ~5:7)
  const CARD_WIDTH = 500;
  const CARD_HEIGHT = 700;

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

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
    if (savedCard?.canvas_data) {
      try {
        const savedData = JSON.parse(savedCard.canvas_data);
        canvas.loadFromJSON(savedData, () => {
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to restore saved card:", e);
      }
    } else if (template?.background_image_url) {
      // Load template background
      FabricImage.fromURL(template.background_image_url, { crossOrigin: 'anonymous' }).then((img) => {
        img.scaleToWidth(CARD_WIDTH);
        img.scaleToHeight(CARD_HEIGHT);
        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
        });
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });
    }

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
  }, [template, savedCard]);

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

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    
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
  }, [fabricCanvas]);

  const handleSave = async () => {
    if (!fabricCanvas || !user) {
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
      const fileName = `card_${savedCard?.id || 'new'}_${Date.now()}.png`;
      const blob = await fetch(dataUrl).then(r => r.blob());
      
      const { data: uploadData, error: uploadError } = await supabase.storage
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

      if (savedCard?.id) {
        // Update existing card
        const { error } = await supabase
          .from('user_cards')
          .update({
            canvas_data: canvasData,
            thumbnail_url: thumbnailUrl,
            title: cardTitle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedCard.id);

        if (error) throw error;
      } else {
        // Create new card
        const { error } = await supabase
          .from('user_cards')
          .insert({
            user_id: user.id,
            template_id: template?.id || null,
            canvas_data: canvasData,
            thumbnail_url: thumbnailUrl,
            title: cardTitle,
          });

        if (error) throw error;
      }

      setHasChanges(false);
      toast.success("Card saved!");
      onSaved?.();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement('a');
    link.download = `${cardTitle.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success("Card downloaded!");
  };

  const handleShare = async () => {
    if (!savedCard?.id || !user) {
      toast.error("Save your card first to share it");
      return;
    }

    setSharing(true);
    try {
      const newShareState = !isShared;
      
      const { error } = await supabase
        .from('user_cards')
        .update({ is_public: newShareState })
        .eq('id', savedCard.id);

      if (error) throw error;

      // Award coins on first share
      if (newShareState && !isShared) {
        await awardCoins(5, 'card_shared', 'Shared a card with the community');
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

  return (
    <div className="space-y-4">
      {/* Title input */}
      <div className="flex items-center gap-2">
        <Input
          value={cardTitle}
          onChange={(e) => {
            setCardTitle(e.target.value);
            setHasChanges(true);
          }}
          className="max-w-xs font-medium"
          placeholder="Card title..."
        />
      </div>

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

        {/* Delete selected */}
        {hasSelection && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        )}

        {/* Clear */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowClearDialog(true)}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex justify-center bg-muted/30 rounded-lg p-4 overflow-auto"
      >
        <div className="shadow-lg rounded-lg overflow-hidden border-4 border-white">
          <canvas ref={fabricCanvasRef} />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={onClose}>
          Back to Templates
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          
          {savedCard?.id && (
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 mr-1" />
              )}
              {isShared ? "Unshare" : "Share"}
            </Button>
          )}
          
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Sticker Picker */}
      <StickerPicker
        open={showStickerPicker}
        onOpenChange={setShowStickerPicker}
        onSelect={handleStickerSelect}
      />

      {/* Clear confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all your drawings, text, and stickers. The background will be kept.
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
