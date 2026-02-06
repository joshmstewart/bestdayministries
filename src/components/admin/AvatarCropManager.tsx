import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { invalidateAvatarCache } from "@/hooks/useProfileAvatarUrl";

interface AvatarCropSettings {
  id: string;
  name: string;
  preview_image_url: string | null;
  profile_crop_x: number;
  profile_crop_y: number;
  profile_crop_scale: number;
}

export const AvatarCropManager = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [cropScale, setCropScale] = useState(1);

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

  const selected = avatars?.find((a) => a.id === selectedId);

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
          Adjust how each avatar appears when displayed as a circle in profiles
        </p>
      </div>

      {/* Avatar grid — pick one to edit */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {avatars?.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => selectAvatar(avatar)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
              selectedId === avatar.id
                ? "border-primary ring-2 ring-primary ring-offset-2 scale-105"
                : "border-border hover:border-primary/50"
            }`}
            title={avatar.name}
          >
            {avatar.preview_image_url ? (
              <img
                src={avatar.preview_image_url}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                ?
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Crop editor */}
      {selected && selected.preview_image_url && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              {/* Live preview */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium">{selected.name}</p>
                {/* Large circle preview */}
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-muted"
                  style={{
                    backgroundImage: `url(${selected.preview_image_url})`,
                    backgroundSize: `${cropScale * 100}%`,
                    backgroundPosition: `${cropX}% ${cropY}%`,
                  }}
                />
                {/* Small circle preview */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-border bg-muted"
                    style={{
                      backgroundImage: `url(${selected.preview_image_url})`,
                      backgroundSize: `${cropScale * 100}%`,
                      backgroundPosition: `${cropX}% ${cropY}%`,
                    }}
                  />
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted"
                    style={{
                      backgroundImage: `url(${selected.preview_image_url})`,
                      backgroundSize: `${cropScale * 100}%`,
                      backgroundPosition: `${cropX}% ${cropY}%`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Actual sizes</span>
                </div>
              </div>

              {/* Sliders */}
              <div className="flex-1 space-y-5 w-full">
                <div className="space-y-2">
                  <Label>Horizontal Position: {cropX}%</Label>
                  <Slider
                    value={[cropX]}
                    onValueChange={([v]) => setCropX(v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vertical Position: {cropY}%</Label>
                  <Slider
                    value={[cropY]}
                    onValueChange={([v]) => setCropY(v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zoom: {cropScale.toFixed(1)}×</Label>
                  <Slider
                    value={[cropScale]}
                    onValueChange={([v]) => setCropScale(v)}
                    min={1}
                    max={3}
                    step={0.1}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
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
