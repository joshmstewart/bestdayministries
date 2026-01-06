import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Eraser, RotateCcw, Save, Download, PaintBucket, Brush } from "lucide-react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(10);
  const [activeTool, setActiveTool] = useState<"fill" | "brush" | "eraser">("fill");
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: "#ffffff",
      isDrawingMode: false, // Start with fill mode, not drawing
    });

    // Load the coloring page image as background
    FabricImage.fromURL(page.image_url, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = Math.min(600 / (img.width || 600), 600 / (img.height || 600));
      img.scale(scale);
      canvas.backgroundImage = img;
      canvas.renderAll();
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [page.image_url]);

  // Update brush/tool settings when they change
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
        fabricCanvas.freeDrawingBrush.color = "#FFFFFF";
        fabricCanvas.freeDrawingBrush.width = brushSize * 2;
      }
    } else {
      // Fill mode - disable drawing
      fabricCanvas.isDrawingMode = false;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Handle canvas click for flood fill
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool !== "fill") return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      const x = Math.floor(pointer.x);
      const y = Math.floor(pointer.y);
      
      floodFill(x, y, activeColor);
    };

    fabricCanvas.on('mouse:down', handleMouseDown);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
    };
  }, [fabricCanvas, activeTool, activeColor]);

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

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    if (!fabricCanvas) return;

    const ctx = fabricCanvas.getContext();
    const width = fabricCanvas.width!;
    const height = fabricCanvas.height!;
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Convert hex color to RGB
    const fillRGB = hexToRgb(fillColor);
    if (!fillRGB) return;

    // Get the color at the clicked position
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];

    // Don't fill if clicking on the same color
    if (startR === fillRGB.r && startG === fillRGB.g && startB === fillRGB.b) return;

    // Don't fill black lines (the outline) - threshold of 50
    if (startR < 50 && startG < 50 && startB < 50) return;

    const tolerance = 32;
    const pixelStack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    const matchColor = (pos: number): boolean => {
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      
      // Don't cross black lines
      if (r < 50 && g < 50 && b < 50) return false;
      
      return (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance
      );
    };

    while (pixelStack.length > 0) {
      const [x, y] = pixelStack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const pos = (y * width + x) * 4;
      if (!matchColor(pos)) continue;
      
      visited.add(key);
      
      // Fill the pixel
      data[pos] = fillRGB.r;
      data[pos + 1] = fillRGB.g;
      data[pos + 2] = fillRGB.b;
      data[pos + 3] = 255;

      // Add neighbors
      pixelStack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Clear all drawn objects
    fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));
    
    // Reload the background image to reset fill colors
    FabricImage.fromURL(page.image_url, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = Math.min(600 / (img.width || 600), 600 / (img.height || 600));
      img.scale(scale);
      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
    });
    
    toast("Canvas cleared!");
  };

  const handleSave = async () => {
    if (!fabricCanvas || !user) {
      toast.error("Please sign in to save your work");
      return;
    }

    setSaving(true);
    try {
      const canvasData = JSON.stringify(fabricCanvas.toJSON());
      const thumbnailUrl = fabricCanvas.toDataURL({ multiplier: 0.5, format: 'png' });

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
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({ multiplier: 1, format: 'png' });
    const link = document.createElement('a');
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
          {/* Canvas */}
          <div ref={containerRef} className="flex-1 flex justify-center">
            <div className="border-4 border-primary/20 rounded-lg overflow-hidden shadow-lg">
              <canvas ref={canvasRef} className="max-w-full" />
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
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-gray-300'
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
                onClick={handleClear}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
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
              {activeTool === "fill" && "Tap an area to fill it with the selected color"}
              {activeTool === "brush" && "Draw freely with your finger or mouse"}
              {activeTool === "eraser" && "Erase colors by drawing over them"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
