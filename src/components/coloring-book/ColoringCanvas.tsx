import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Eraser, RotateCcw, Save, Download, PaintBucket, Brush, Undo2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLORS = [
  "#FF0000", "#FF6B00", "#FFD700", "#00FF00", "#00CED1", 
  "#0000FF", "#8B00FF", "#FF69B4", "#8B4513", "#000000",
  "#FFFFFF", "#808080", "#FFC0CB", "#90EE90", "#87CEEB",
];

interface ColoringCanvasProps {
  page: any;
  onBack: () => void;
}

export function ColoringCanvas({ page, onBack }: ColoringCanvasProps) {
  // Two-layer system: base canvas for image/fills, fabric canvas for brush strokes
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(10);
  const [activeTool, setActiveTool] = useState<"fill" | "brush" | "eraser">("fill");
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const MAX_HISTORY = 20;

  const CANVAS_SIZE = 600;

  // Initialize base canvas with the coloring image
  useEffect(() => {
    if (!baseCanvasRef.current) return;

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    baseCanvas.width = CANVAS_SIZE;
    baseCanvas.height = CANVAS_SIZE;

    // Fill with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Load the coloring page image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
      const offsetY = (CANVAS_SIZE - scaledHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      originalImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("Failed to load coloring page image");
      toast.error("Failed to load image");
    };
    img.src = page.image_url;
  }, [page.image_url]);

  // Initialize Fabric.js canvas for brush strokes (transparent overlay)
  useEffect(() => {
    if (!fabricCanvasRef.current || !imageLoaded) return;

    const canvas = new FabricCanvas(fabricCanvasRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "transparent",
      isDrawingMode: false,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageLoaded]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    if (activeTool === "brush") {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = brushSize;
      }
    } else if (activeTool === "eraser") {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        // For eraser, we'll use white to "erase" on the overlay
        fabricCanvas.freeDrawingBrush.color = "#FFFFFF";
        fabricCanvas.freeDrawingBrush.width = brushSize * 2;
      }
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const saveToHistory = useCallback(() => {
    if (!baseCanvasRef.current) return;
    const ctx = baseCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), imageData]);
  }, []);

  const handleUndo = useCallback(() => {
    if (!baseCanvasRef.current || history.length === 0) return;
    const ctx = baseCanvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    if (!baseCanvasRef.current) return;

    const canvas = baseCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fillRGB = hexToRgb(fillColor);
    if (!fillRGB) return;

    // Get the color at the clicked position
    const getPixelColor = (x: number, y: number) => {
      const pos = (y * width + x) * 4;
      return {
        r: data[pos],
        g: data[pos + 1],
        b: data[pos + 2],
        a: data[pos + 3],
      };
    };

    const startColor = getPixelColor(startX, startY);

    // Don't fill if clicking on the same color
    if (
      startColor.r === fillRGB.r &&
      startColor.g === fillRGB.g &&
      startColor.b === fillRGB.b
    ) {
      return;
    }

    // Don't fill very dark pixels (the outlines) - threshold of 60
    const isDark = (r: number, g: number, b: number) => r < 60 && g < 60 && b < 60;
    if (isDark(startColor.r, startColor.g, startColor.b)) {
      return;
    }

    const tolerance = 40;

    const colorMatch = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const pixel = getPixelColor(x, y);
      
      // Don't cross dark lines
      if (isDark(pixel.r, pixel.g, pixel.b)) return false;

      return (
        Math.abs(pixel.r - startColor.r) <= tolerance &&
        Math.abs(pixel.g - startColor.g) <= tolerance &&
        Math.abs(pixel.b - startColor.b) <= tolerance
      );
    };

    // Use a scanline flood fill algorithm (more efficient)
    const visited = new Uint8Array(width * height);
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * width + x;

      if (visited[idx]) continue;
      if (!colorMatch(x, y)) continue;

      // Find the left and right boundaries
      let left = x;
      let right = x;

      while (left > 0 && colorMatch(left - 1, y) && !visited[(y * width) + left - 1]) {
        left--;
      }
      while (right < width - 1 && colorMatch(right + 1, y) && !visited[(y * width) + right + 1]) {
        right++;
      }

      // Fill the scanline
      for (let i = left; i <= right; i++) {
        const pos = (y * width + i) * 4;
        data[pos] = fillRGB.r;
        data[pos + 1] = fillRGB.g;
        data[pos + 2] = fillRGB.b;
        data[pos + 3] = 255;
        visited[y * width + i] = 1;

        // Check above and below
        if (y > 0 && !visited[(y - 1) * width + i] && colorMatch(i, y - 1)) {
          stack.push([i, y - 1]);
        }
        if (y < height - 1 && !visited[(y + 1) * width + i] && colorMatch(i, y + 1)) {
          stack.push([i, y + 1]);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Handle click for fill tool
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "fill" || !baseCanvasRef.current) return;

    const rect = baseCanvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      saveToHistory();
      floodFill(x, y, activeColor);
    }
  }, [activeTool, activeColor, floodFill, saveToHistory]);

  const handleClear = () => {
    if (!baseCanvasRef.current) return;

    const baseCanvas = baseCanvasRef.current;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw original image
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (originalImageRef.current) {
      const img = originalImageRef.current;
      const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (CANVAS_SIZE - scaledWidth) / 2;
      const offsetY = (CANVAS_SIZE - scaledHeight) / 2;
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    // Clear Fabric.js canvas
    if (fabricCanvas) {
      fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
    }

    toast("Canvas cleared!");
  };

  const getCompositeCanvas = (): HTMLCanvasElement | null => {
    if (!baseCanvasRef.current || !fabricCanvasRef.current) return null;

    // Create a composite canvas
    const composite = document.createElement("canvas");
    composite.width = CANVAS_SIZE;
    composite.height = CANVAS_SIZE;
    const ctx = composite.getContext("2d");
    if (!ctx) return null;

    // Draw base canvas (fills + original image)
    ctx.drawImage(baseCanvasRef.current, 0, 0);

    // Draw Fabric.js canvas (brush strokes) on top
    ctx.drawImage(fabricCanvasRef.current, 0, 0);

    return composite;
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save your work");
      return;
    }

    const composite = getCompositeCanvas();
    if (!composite) return;

    setSaving(true);
    try {
      const thumbnailUrl = composite.toDataURL("image/png", 0.5);
      const canvasData = JSON.stringify({
        baseCanvas: baseCanvasRef.current?.toDataURL("image/png"),
        fabricObjects: fabricCanvas?.toJSON(),
      });

      const { error } = await supabase.from("user_colorings").upsert({
        user_id: user.id,
        coloring_page_id: page.id,
        canvas_data: canvasData,
        thumbnail_url: thumbnailUrl,
      }, { onConflict: 'user_id,coloring_page_id' });

      if (error) throw error;
      toast.success("Saved!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const composite = getCompositeCanvas();
    if (!composite) return;

    const dataUrl = composite.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${page.title}-colored.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Downloaded!");
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container max-w-4xl mx-auto px-4">
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pages
        </Button>

        <h2 className="text-2xl font-bold text-center mb-4">{page.title}</h2>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Canvas Container */}
          <div ref={containerRef} className="flex-1 flex justify-center">
            <div
              className="relative border-4 border-primary/20 rounded-lg overflow-hidden shadow-lg cursor-crosshair"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, maxWidth: "100%" }}
              onClick={handleCanvasClick}
            >
              {/* Base canvas for image and fills */}
              <canvas
                ref={baseCanvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ pointerEvents: "none" }}
              />
              {/* Fabric.js canvas for brush strokes */}
              <canvas
                ref={fabricCanvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ pointerEvents: activeTool === "fill" ? "none" : "auto" }}
              />
            </div>
          </div>

          {/* Tools */}
          <div className="lg:w-56 space-y-4">
            {/* Tool Selection */}
            <div>
              <p className="text-sm font-medium mb-2">Tool</p>
              <div className="flex gap-2">
                <Button
                  variant={activeTool === "fill" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("fill")}
                  className="flex-1"
                  title="Tap an area to fill it with color"
                >
                  <PaintBucket className="w-4 h-4 mr-1" />
                  Fill
                </Button>
                <Button
                  variant={activeTool === "brush" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("brush")}
                  className="flex-1"
                  title="Freehand drawing"
                >
                  <Brush className="w-4 h-4 mr-1" />
                  Brush
                </Button>
                <Button
                  variant={activeTool === "eraser" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTool("eraser")}
                  className="flex-1"
                  title="Erase colors"
                >
                  <Eraser className="w-4 h-4 mr-1" />
                  Eraser
                </Button>
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-sm font-medium mb-2">Colors</p>
              <div className="grid grid-cols-5 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      activeColor === color && activeTool !== "eraser"
                        ? "border-primary ring-2 ring-primary"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setActiveColor(color);
                      if (activeTool === "eraser") setActiveTool("fill");
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Brush Size (only for brush/eraser) */}
            {(activeTool === "brush" || activeTool === "eraser") && (
              <div>
                <p className="text-sm font-medium mb-2">Brush Size: {brushSize}</p>
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0])}
                  min={2}
                  max={50}
                  step={1}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex-1"
              >
                <Undo2 className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will erase all your coloring and start fresh. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>

            {/* Tool hint */}
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              {activeTool === "fill" && "Tap inside any white area to fill it with color"}
              {activeTool === "brush" && "Draw freely with your finger or mouse"}
              {activeTool === "eraser" && "Erase brush strokes"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
