import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ZoomIn, Move, Loader2, Check, X, RefreshCw } from "lucide-react";

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
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const current = images[currentIndex];
  const emotion = emotions.find(e => e.id === current?.emotion_type_id);

  // Sync scale when index or dialog opens
  useEffect(() => {
    if (open && current) {
      setCropScale(current.crop_scale || 1);
      setPanX(0);
      setPanY(0);
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
      current.crop_scale = cropScale;
      setDirty(false);
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!current) return;
    setRegenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-avatar-emotion-image", {
        body: {
          avatarId: current.avatar_id,
          emotionTypeId: current.emotion_type_id,
        }
      });

      if (response.error) throw new Error(response.error.message || "Generation failed");

      if (response.data?.imageUrl) {
        // The edge function already applies average zoom - refresh local data
        const avgScale = response.data.cropScale || cropScale;
        current.image_url = response.data.imageUrl;
        current.crop_scale = avgScale;
        setCropScale(avgScale);
        setDirty(false);
        toast.success(`Regenerated ${emotion?.name || "emotion"} (zoom: ${avgScale}x)`);
        onSaved();
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error: any) {
      console.error("Regeneration error:", error);
      toast.error(error.message || "Regeneration failed");
    } finally {
      setRegenerating(false);
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

  // Drag to adjust scale
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [panX, panY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Convert pixel drag to percentage offset, scaled by zoom level
    const maxPan = (cropScale - 1) * 50; // max pan in % based on zoom
    const newPanX = Math.max(-maxPan, Math.min(maxPan, dragStart.current.startPanX + (dx / rect.width) * 100));
    const newPanY = Math.max(-maxPan, Math.min(maxPan, dragStart.current.startPanY + (dy / rect.height) * 100));
    setPanX(Math.round(newPanX * 100) / 100);
    setPanY(Math.round(newPanY * 100) / 100);
    setDirty(true);
  }, [cropScale]);

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
          {currentIndex + 1} of {images.length} • Drag to pan, use slider to zoom
        </div>

        {/* Large circular preview */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => saveAndNavigate(-1)}
            disabled={currentIndex === 0 || saving || regenerating}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div
            ref={previewRef}
            className={`w-48 h-48 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg select-none touch-none ${regenerating ? 'opacity-50 animate-pulse' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={regenerating ? undefined : handlePointerDown}
            onPointerMove={regenerating ? undefined : handlePointerMove}
            onPointerUp={regenerating ? undefined : handlePointerUp}
          >
            <img
              src={current.image_url || ""}
              alt={emotion?.name || ""}
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
              style={(cropScale > 1 || panX !== 0 || panY !== 0) ? {
                transform: `scale(${cropScale}) translate(${panX}%, ${panY}%)`,
                transformOrigin: "center center",
              } : undefined}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => saveAndNavigate(1)}
            disabled={currentIndex === images.length - 1 || saving || regenerating}
            className="shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Move className="h-3 w-3" />
          <span>Drag to pan</span>
          <Button
            variant={current.is_approved ? "default" : "outline"}
            size="sm"
            className="ml-2 h-6 text-xs px-2"
            disabled={saving || regenerating}
            onClick={async () => {
              const newVal = !current.is_approved;
              const { error } = await supabase
                .from("avatar_emotion_images")
                .update({ is_approved: newVal })
                .eq("id", current.id);
              if (error) {
                toast.error("Failed to update approval");
                return;
              }
              current.is_approved = newVal;
              toast.success(newVal ? "Approved" : "Unapproved");
              onSaved();
            }}
          >
            <Check className="h-3 w-3 mr-1" />
            {current.is_approved ? "Approved" : "Approve"}
          </Button>
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
                style={(cropScale > 1 || panX !== 0 || panY !== 0) ? {
                  transform: `scale(${cropScale}) translate(${panX}%, ${panY}%)`,
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
            disabled={saving || !dirty || regenerating}
            size="sm"
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCropScale(1); setPanX(0); setPanY(0); setDirty(true); }}
            disabled={regenerating}
          >
            Reset to 1x
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating || saving}
          >
            {regenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
