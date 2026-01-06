import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Eraser, RotateCcw, Save, Download } from "lucide-react";
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
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [brushSize, setBrushSize] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
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

  useEffect(() => {
    if (!fabricCanvas?.freeDrawingBrush) return;
    fabricCanvas.freeDrawingBrush.color = isEraser ? "#FFFFFF" : activeColor;
    fabricCanvas.freeDrawingBrush.width = brushSize;
  }, [activeColor, brushSize, isEraser, fabricCanvas]);

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));
    fabricCanvas.renderAll();
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
          <div className="flex-1 flex justify-center">
            <div className="border-4 border-primary/20 rounded-lg overflow-hidden shadow-lg">
              <canvas ref={canvasRef} className="max-w-full" />
            </div>
          </div>

          {/* Tools */}
          <div className="lg:w-48 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Colors</p>
              <div className="grid grid-cols-5 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${activeColor === color && !isEraser ? 'border-primary ring-2 ring-primary' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => { setActiveColor(color); setIsEraser(false); }}
                  />
                ))}
              </div>
            </div>

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

            <div className="flex gap-2">
              <Button
                variant={isEraser ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEraser(!isEraser)}
                className="flex-1"
              >
                <Eraser className="w-4 h-4 mr-1" />
                Eraser
              </Button>
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
          </div>
        </div>
      </div>
    </main>
  );
}
