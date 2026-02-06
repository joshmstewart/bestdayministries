import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ZoomIn, Move, Loader2, Check, X } from "lucide-react";

interface EmotionImage {
  id: string;
  avatar_id: string;
  emotion_type_id: string;
  image_url: string | null;
  is_approved: boolean;
  crop_scale: number;
}

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
}

interface EmotionCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: EmotionImage[];
  emotions: EmotionType[];
  avatarName: string;
  initialIndex: number;
  onSaved: () => void;
}

export function EmotionCropDialog({
  open,
  onOpenChange,
  images,
  emotions,
  avatarName,
  initialIndex,
  onSaved,
}: EmotionCropDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [cropScale, setCropScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startScale: 1 });
  const previewRef = useRef<HTMLDivElement>(null);

  const current = images[currentIndex];
  const emotion = emotions.find(e => e.id === current?.emotion_type_id);

  // Sync scale when index or dialog opens
  useEffect(() => {
    if (open && current) {
      setCropScale(current.crop_scale || 1);
      setDirty(false);
    }
  }, [currentIndex, open, current?.id]);

  // Reset index when dialog opens
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("avatar_emotion_images")
        .update({ crop_scale: cropScale })
        .eq("id", current.id);
      if (error) throw error;
      toast.success(`Saved ${emotion?.name || "emotion"} crop`);
      current.crop_scale = cropScale; // update local ref
      setDirty(false);
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveAndNavigate = async (direction: number) => {
    if (dirty) await handleSave();
    const next = currentIndex + direction;
    if (next >= 0 && next < images.length) {
      setCurrentIndex(next);
    }
  };

  const handleScaleChange = (v: number) => {
    setCropScale(v);
    setDirty(true);
  };

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") saveAndNavigate(-1);
      if (e.key === "ArrowRight") saveAndNavigate(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, currentIndex, dirty, cropScale]);

  // Drag to adjust scale (simplified: horizontal drag = zoom)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, startScale: cropScale };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [cropScale]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    // Vertical drag adjusts zoom
    const dy = dragStart.current.y - e.clientY;
    const sensitivity = 2 / rect.height;
    const newScale = Math.max(1, Math.min(2, dragStart.current.startScale + dy * sensitivity));
    setCropScale(Math.round(newScale * 100) / 100);
    setDirty(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !flex !flex-col gap-4">
        <DialogTitle className="text-center">
          {avatarName} — {emotion?.emoji} {emotion?.name}
        </DialogTitle>

        <div className="text-xs text-muted-foreground text-center">
          {currentIndex + 1} of {images.length} • Drag up/down to zoom, or use slider
        </div>

        {/* Large circular preview */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => saveAndNavigate(-1)}
            disabled={currentIndex === 0 || saving}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div
            ref={previewRef}
            className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg cursor-grab active:cursor-grabbing select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={current.image_url || ""}
              alt={emotion?.name || ""}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              style={cropScale > 1 ? {
                transform: `scale(${cropScale})`,
                transformOrigin: "center center",
              } : undefined}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => saveAndNavigate(1)}
            disabled={currentIndex === images.length - 1 || saving}
            className="shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Move className="h-3 w-3" />
          <span>Drag to zoom</span>
          {current.is_approved && (
            <span className="ml-2 text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Approved
            </span>
          )}
        </div>

        {/* Zoom slider */}
        <div className="space-y-2 px-4">
          <div className="flex items-center gap-2">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Zoom: {cropScale.toFixed(2)}x</span>
          </div>
          <Slider
            value={[cropScale]}
            onValueChange={([v]) => handleScaleChange(v)}
            min={1}
            max={2}
            step={0.01}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>

        {/* Small previews at actual sizes */}
        <div className="flex items-center gap-3 justify-center">
          {[24, 40, 56].map(size => (
            <div
              key={size}
              className="rounded-full overflow-hidden border-2 border-border"
              style={{ width: size, height: size }}
            >
              <img
                src={current.image_url || ""}
                alt=""
                className="w-full h-full object-cover"
                style={cropScale > 1 ? {
                  transform: `scale(${cropScale})`,
                  transformOrigin: "center center",
                } : undefined}
              />
            </div>
          ))}
          <span className="text-xs text-muted-foreground">Actual sizes</span>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            size="sm"
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCropScale(1); setDirty(true); }}
          >
            Reset to 1x
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
