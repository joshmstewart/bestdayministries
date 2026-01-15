import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage } from "fabric";
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
  Eraser, RotateCcw, Save, Download, PaintBucket, Brush, 
  Undo2, Sticker, Trash2, Share2, Loader2, Type
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StickerPicker } from "@/components/coloring-book/StickerPicker";
import { useCoins } from "@/hooks/useCoins";
import { Textbox } from "fabric";

// Colors organized by hue
const COLORS = [
  // Reds
  "#8B0000", "#FF0000", "#FF6B6B",
  // Oranges  
  "#FF4500", "#FF8C00", "#FFA500",
  // Yellows
  "#FFD700", "#FFFF00", "#FFFACD",
  // Greens
  "#006400", "#228B22", "#32CD32", "#90EE90", "#98FB98",
  // Cyans/Teals
  "#008B8B", "#00CED1", "#40E0D0",
  // Blues
  "#00008B", "#0000FF", "#4169E1", "#87CEEB", "#ADD8E6",
  // Purples
  "#4B0082", "#8B00FF", "#9370DB", "#DDA0DD",
  // Pinks
  "#C71585", "#FF1493", "#FF69B4", "#FFC0CB",
  // Browns
  "#4A2C2A", "#8B4513", "#D2691E", "#DEB887",
  // Neutrals
  "#000000", "#404040", "#808080", "#C0C0C0", "#FFFFFF",
];

interface CardColoringCanvasProps {
  design: {
    id: string;
    title: string;
    image_url: string;
    template_id?: string | null;
  };
  savedCard?: {
    id: string;
    canvas_data: string;
    title?: string;
    is_public?: boolean;
  } | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function CardColoringCanvas({ design, savedCard, onClose, onSaved }: CardColoringCanvasProps) {
  // Two-layer system: base canvas for image/fills, fabric canvas for brush strokes
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(10);
  const [activeTool, setActiveTool] = useState<"fill" | "brush" | "eraser" | "sticker" | "text">("fill");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const { user } = useAuth();
  const { awardCoins } = useCoins();
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isShared, setIsShared] = useState(savedCard?.is_public || false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [hasSelection, setHasSelection] = useState(false);
  const [cardTitle, setCardTitle] = useState(savedCard?.title || design.title || "My Card");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const MAX_HISTORY = 20;

  // Card dimensions (5:7 aspect ratio)
  const [canvasWidth, setCanvasWidth] = useState(500);
  const [canvasHeight, setCanvasHeight] = useState(700);
  const MAX_CANVAS_WIDTH = 500;

  // Store initial savedCanvasData in a ref
  const initialSavedDataRef = useRef<string | null>(savedCard?.canvas_data || null);
  const hasInitializedRef = useRef(false);

  // Initialize base canvas with the card design image
  useEffect(() => {
    if (!baseCanvasRef.current) return;
    if (hasInitializedRef.current) return;

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    const savedCanvasData = initialSavedDataRef.current;

    // Check if we have saved canvas data to restore
    if (savedCanvasData) {
      try {
        const savedData = JSON.parse(savedCanvasData);
        if (savedData.baseCanvas) {
          hasInitializedRef.current = true;
          
          const savedImg = new Image();
          savedImg.onload = () => {
            const restoreWidth = savedData.canvasWidth || savedImg.width;
            const restoreHeight = savedData.canvasHeight || savedImg.height;
            
            setCanvasWidth(restoreWidth);
            setCanvasHeight(restoreHeight);
            baseCanvas.width = restoreWidth;
            baseCanvas.height = restoreHeight;
            
            ctx.drawImage(savedImg, 0, 0);
            
            // Still need to store original image for clear function
            const origImg = new Image();
            origImg.crossOrigin = "anonymous";
            origImg.onload = () => {
              originalImageRef.current = origImg;
              setImageLoaded(true);
            };
            origImg.src = design.image_url;
          };
          savedImg.src = savedData.baseCanvas;
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved canvas data:", e);
      }
    }
    
    hasInitializedRef.current = true;

    // Load the card design image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Calculate canvas dimensions based on image aspect ratio
      const aspectRatio = img.width / img.height;
      let newWidth: number;
      let newHeight: number;
      
      // Standard card ratio is 5:7, but use image aspect if different
      if (aspectRatio >= 1) {
        newWidth = MAX_CANVAS_WIDTH;
        newHeight = MAX_CANVAS_WIDTH / aspectRatio;
      } else {
        newHeight = MAX_CANVAS_WIDTH / aspectRatio;
        newWidth = MAX_CANVAS_WIDTH;
        if (newHeight > 700) {
          newHeight = 700;
          newWidth = 700 * aspectRatio;
        }
      }
      
      setCanvasWidth(newWidth);
      setCanvasHeight(newHeight);
      baseCanvas.width = newWidth;
      baseCanvas.height = newHeight;

      // Fill with white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Draw image to fill the canvas
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      originalImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("Failed to load card design image");
      toast.error("Failed to load image");
    };
    img.src = design.image_url;
  }, [design.image_url]);

  // Initialize Fabric.js canvas for brush strokes
  useEffect(() => {
    if (!fabricCanvasRef.current || !imageLoaded) return;

    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "transparent",
      isDrawingMode: false,
      preserveObjectStacking: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    // Restore saved fabric objects
    const savedCanvasData = initialSavedDataRef.current;
    if (savedCanvasData) {
      try {
        const savedData = JSON.parse(savedCanvasData);
        if (savedData.fabricObjects) {
          canvas.loadFromJSON(savedData.fabricObjects, () => {
            canvas.renderAll();
          });
        }
      } catch (e) {
        console.error("Failed to restore fabric objects:", e);
      }
    }

    // Track selection changes
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:updated', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));
    canvas.on('path:created', () => setHasChanges(true));
    canvas.on('object:modified', () => setHasChanges(true));

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageLoaded, canvasWidth, canvasHeight]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === "brush") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = brushSize;
        (fabricCanvas.freeDrawingBrush as any)._isEraser = false;
      }
    } else if (activeTool === "eraser") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.selection = false;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = "rgba(255,255,255,0)";
        fabricCanvas.freeDrawingBrush.width = brushSize * 2;
        (fabricCanvas.freeDrawingBrush as any)._isEraser = true;
      }
    } else {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Flood fill on base canvas
  const handleFill = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "fill" || !baseCanvasRef.current || !originalImageRef.current) return;

    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Save current state to history
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), currentImageData]);

    // Get image data and perform flood fill
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Get the color at click point
    const getPixelColor = (px: number, py: number) => {
      const pos = (py * width + px) * 4;
      return { r: data[pos], g: data[pos + 1], b: data[pos + 2], a: data[pos + 3] };
    };

    const startColor = getPixelColor(x, y);
    
    // Parse target color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    const fillColor = hexToRgb(activeColor);

    // Don't fill very dark pixels (the outlines)
    const isDark = (r: number, g: number, b: number) => r < 60 && g < 60 && b < 60;
    if (isDark(startColor.r, startColor.g, startColor.b)) {
      return;
    }

    const tolerance = 40;
    const colorMatch = (px: number, py: number): boolean => {
      if (px < 0 || px >= width || py < 0 || py >= height) return false;
      const pixel = getPixelColor(px, py);
      if (isDark(pixel.r, pixel.g, pixel.b)) return false;
      return (
        Math.abs(pixel.r - startColor.r) <= tolerance &&
        Math.abs(pixel.g - startColor.g) <= tolerance &&
        Math.abs(pixel.b - startColor.b) <= tolerance
      );
    };

    // Flood fill algorithm
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[x, y]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const idx = cy * width + cx;

      if (visited[idx]) continue;
      if (!colorMatch(cx, cy)) continue;

      let left = cx;
      let right = cx;

      while (left > 0 && colorMatch(left - 1, cy) && !visited[cy * width + left - 1]) left--;
      while (right < width - 1 && colorMatch(right + 1, cy) && !visited[cy * width + right + 1]) right++;

      for (let i = left; i <= right; i++) {
        const pos = (cy * width + i) * 4;
        data[pos] = fillColor.r;
        data[pos + 1] = fillColor.g;
        data[pos + 2] = fillColor.b;
        data[pos + 3] = 255;
        visited[cy * width + i] = 1;

        if (cy > 0 && !visited[(cy - 1) * width + i] && colorMatch(i, cy - 1)) {
          stack.push([i, cy - 1]);
        }
        if (cy < height - 1 && !visited[(cy + 1) * width + i] && colorMatch(i, cy + 1)) {
          stack.push([i, cy + 1]);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setHasChanges(true);
  }, [activeTool, activeColor]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || !baseCanvasRef.current) return;
    const ctx = baseCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const handleClear = useCallback(() => {
    if (!baseCanvasRef.current || !originalImageRef.current) return;
    
    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save to history
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), currentImageData]);

    // Redraw original
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);

    // Clear fabric canvas
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = "transparent";
      fabricCanvas.renderAll();
    }

    setHasChanges(true);
    setShowClearDialog(false);
    toast.success("Card cleared");
  }, [fabricCanvas]);

  const handleDeleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setHasSelection(false);
      toast.success("Deleted");
    }
  }, [fabricCanvas]);

  const handleAddText = useCallback(() => {
    if (!fabricCanvas) return;
    
    const text = new Textbox("Your message!", {
      left: canvasWidth / 2 - 100,
      top: canvasHeight / 2 - 20,
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
    setActiveTool("fill");
    setHasChanges(true);
  }, [fabricCanvas, activeColor, canvasWidth, canvasHeight]);

  const handleStickerSelect = useCallback((stickerUrl: string) => {
    if (!fabricCanvas) return;
    
    FabricImage.fromURL(stickerUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = Math.min(100 / img.width!, 100 / img.height!);
      img.scale(scale);
      img.set({
        left: canvasWidth / 2 - (img.width! * scale) / 2,
        top: canvasHeight / 2 - (img.height! * scale) / 2,
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      setHasChanges(true);
    });
    
    setShowStickerPicker(false);
    setActiveTool("fill");
  }, [fabricCanvas, canvasWidth, canvasHeight]);

  const handleSave = async () => {
    if (!baseCanvasRef.current || !fabricCanvas || !user) {
      toast.error("Please sign in to save");
      return;
    }

    setSaving(true);
    try {
      // Combine both canvases for saving
      const baseCanvas = baseCanvasRef.current;
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = canvasWidth;
      combinedCanvas.height = canvasHeight;
      const combinedCtx = combinedCanvas.getContext('2d');
      
      if (combinedCtx) {
        combinedCtx.drawImage(baseCanvas, 0, 0);
        const fabricDataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
        const fabricImg = new Image();
        await new Promise<void>((resolve) => {
          fabricImg.onload = () => {
            combinedCtx.drawImage(fabricImg, 0, 0);
            resolve();
          };
          fabricImg.src = fabricDataUrl;
        });
      }

      // Save canvas data
      const canvasData = JSON.stringify({
        baseCanvas: baseCanvas.toDataURL('image/png'),
        fabricObjects: fabricCanvas.toJSON(),
        canvasWidth,
        canvasHeight,
      });

      // Generate thumbnail
      const thumbnailUrl = combinedCanvas.toDataURL('image/png', 0.8);
      
      // Upload thumbnail
      const fileName = `card_${savedCard?.id || 'new'}_${Date.now()}.png`;
      const blob = await fetch(thumbnailUrl).then(r => r.blob());
      
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

      if (savedCard?.id) {
        const { error } = await supabase
          .from('user_cards')
          .update({
            canvas_data: canvasData,
            thumbnail_url: urlData.publicUrl,
            title: cardTitle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedCard.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_cards')
          .insert({
            user_id: user.id,
            template_id: design.template_id || null,
            canvas_data: canvasData,
            thumbnail_url: urlData.publicUrl,
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

  const handleDownload = async () => {
    if (!baseCanvasRef.current || !fabricCanvas) return;
    
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = canvasWidth;
    combinedCanvas.height = canvasHeight;
    const ctx = combinedCanvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(baseCanvasRef.current, 0, 0);
      const fabricDataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
      const fabricImg = new Image();
      await new Promise<void>((resolve) => {
        fabricImg.onload = () => {
          ctx.drawImage(fabricImg, 0, 0);
          resolve();
        };
        fabricImg.src = fabricDataUrl;
      });
    }
    
    const link = document.createElement('a');
    link.download = `${cardTitle.replace(/\s+/g, '_')}.png`;
    link.href = combinedCanvas.toDataURL('image/png');
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

      if (newShareState && !isShared) {
        await awardCoins(user.id, 5, 'Shared a card with the community');
      }

      setIsShared(newShareState);
      toast.success(newShareState ? "Card shared! +5 coins" : "Card is now private");
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
            variant={activeTool === "fill" ? "default" : "outline"}
            onClick={() => setActiveTool("fill")}
            title="Fill"
          >
            <PaintBucket className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "brush" ? "default" : "outline"}
            onClick={() => setActiveTool("brush")}
            title="Brush"
          >
            <Brush className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={activeTool === "eraser" ? "default" : "outline"}
            onClick={() => setActiveTool("eraser")}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
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

        <div className="h-6 w-px bg-border" />

        {/* Brush size */}
        {(activeTool === "brush" || activeTool === "eraser") && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={2}
              max={30}
              step={1}
              className="w-20"
            />
          </div>
        )}

        {/* Color palette */}
        <div className="flex gap-0.5 flex-wrap max-w-[280px]">
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

        <div className="h-6 w-px bg-border" />

        {/* Actions */}
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={history.length === 0} title="Undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        
        {hasSelection && (
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={() => setShowClearDialog(true)}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex justify-center bg-muted/30 rounded-lg p-4 overflow-auto">
        <div 
          className="relative shadow-lg rounded-lg overflow-hidden border-4 border-white"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <canvas
            ref={baseCanvasRef}
            onClick={handleFill}
            className="absolute inset-0"
            style={{ cursor: activeTool === "fill" ? "crosshair" : "default" }}
          />
          <canvas
            ref={fabricCanvasRef}
            className="absolute inset-0"
            style={{ pointerEvents: activeTool === "fill" ? "none" : "auto" }}
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onClose}>
          Back to Designs
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        {savedCard?.id && (
          <Button 
            variant={isShared ? "secondary" : "outline"} 
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            {isShared ? "Shared" : "Share"}
          </Button>
        )}
      </div>

      {/* Sticker picker */}
      <StickerPicker
        open={showStickerPicker}
        onOpenChange={(open) => {
          setShowStickerPicker(open);
          if (!open) setActiveTool("fill");
        }}
        onSelectSticker={handleStickerSelect}
      />

      {/* Clear confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all your coloring and start fresh. This cannot be undone.
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
