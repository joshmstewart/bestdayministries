import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ZoomIn, Move } from "lucide-react";
import { invalidateAvatarCache } from "@/hooks/useProfileAvatarUrl";

interface AvatarCropSettings {
  id: string;
  name: string;
  preview_image_url: string | null;
  profile_crop_x: number;
  profile_crop_y: number;
  profile_crop_scale: number;
}

/** Compute the CSS transform for a crop preview */
function getCropTransform(cropX: number, cropY: number, scale: number) {
  const offsetX = ((cropX - 50) * (scale - 1)) * 0.5;
  const offsetY = ((cropY - 50) * (scale - 1)) * 0.5;
  return {
    transform: `scale(${scale}) translate(${-offsetX}%, ${-offsetY}%)`,
    transformOrigin: "center center",
  };
}

export const AvatarCropManager = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [cropScale, setCropScale] = useState(1);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startCropX: 50, startCropY: 50 });
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-avatar-crops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatars")
        .select("id, name, preview_image_url, profile_crop_x, profile_crop_y, profile_crop_scale")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as AvatarCropSettings[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const { error } = await supabase
        .from("fitness_avatars")
        .update({
          profile_crop_x: cropX,
          profile_crop_y: cropY,
          profile_crop_scale: cropScale,
        })
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (selectedId) invalidateAvatarCache(selectedId);
      queryClient.invalidateQueries({ queryKey: ["admin-avatar-crops"] });
      toast.success("Crop settings saved");
    },
    onError: () => toast.error("Failed to save crop settings"),
  });

  const selectAvatar = (avatar: AvatarCropSettings) => {
    setSelectedId(avatar.id);
    setCropX(avatar.profile_crop_x);
    setCropY(avatar.profile_crop_y);
    setCropScale(avatar.profile_crop_scale);
  };

  const handleReset = () => {
    setCropX(50);
    setCropY(50);
    setCropScale(1);
  };

  // --- Drag handlers ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, startCropX: cropX, startCropY: cropY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [cropX, cropY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Sensitivity scales with zoom — more zoom = finer control
    const sensitivity = 100 / (rect.width * Math.max(cropScale - 1, 0.2));
    const newX = Math.max(0, Math.min(100, dragStart.current.startCropX - dx * sensitivity));
    const newY = Math.max(0, Math.min(100, dragStart.current.startCropY - dy * sensitivity));
    setCropX(Math.round(newX));
    setCropY(Math.round(newY));
  }, [cropScale]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const selected = avatars?.find((a) => a.id === selectedId);
  const cropStyle = getCropTransform(cropX, cropY, cropScale);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Profile Crop Settings</h3>
        <p className="text-sm text-muted-foreground">
          Adjust how each avatar appears when displayed as a circle in profiles. Drag to reposition, use slider to zoom.
        </p>
      </div>

      {/* Avatar grid — show cropped circles */}
      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-3">
        {avatars?.map((avatar) => {
          const style = avatar.preview_image_url
            ? getCropTransform(avatar.profile_crop_x, avatar.profile_crop_y, avatar.profile_crop_scale)
            : undefined;
          return (
            <button
              key={avatar.id}
              onClick={() => selectAvatar(avatar)}
              className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all mx-auto ${
                selectedId === avatar.id
                  ? "border-primary ring-2 ring-primary ring-offset-2 scale-110"
                  : "border-border hover:border-primary/50"
              }`}
              title={avatar.name}
            >
              {avatar.preview_image_url ? (
                <img
                  src={avatar.preview_image_url}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  style={style}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">?</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Crop editor */}
      {selected && selected.preview_image_url && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              {/* Draggable preview */}
              <div className="space-y-4">
                <p className="text-sm font-medium">{selected.name}</p>

                <div
                  ref={previewRef}
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50 shadow-md cursor-grab active:cursor-grabbing select-none touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Drag to reposition"
                >
                  <img
                    src={selected.preview_image_url}
                    alt="Crop preview"
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    style={cropStyle}
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
                  <Move className="h-3 w-3" />
                  <span>Drag to reposition</span>
                </div>

                {/* Actual size previews */}
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                    <img
                      src={selected.preview_image_url}
                      alt="Small preview"
                      className="w-full h-full object-cover"
                      style={cropStyle}
                    />
                  </div>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                    <img
                      src={selected.preview_image_url}
                      alt="Medium preview"
                      className="w-full h-full object-cover"
                      style={cropStyle}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Actual sizes</span>
                </div>
              </div>

              {/* Zoom slider */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  <Label>Zoom: {cropScale.toFixed(2)}x</Label>
                </div>
                <Slider
                  value={[cropScale]}
                  onValueChange={([v]) => setCropScale(v)}
                  min={1}
                  max={2}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1x (full)</span>
                  <span>2x (zoomed)</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
