import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ZoomIn } from "lucide-react";
import { invalidateAvatarCache } from "@/hooks/useProfileAvatarUrl";

interface AvatarCropSettings {
  id: string;
  name: string;
  preview_image_url: string | null;
  profile_crop_scale: number;
}

export const AvatarCropManager = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-avatar-crops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatars")
        .select("id, name, preview_image_url, profile_crop_scale")
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
        .update({ profile_crop_scale: cropScale })
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
    setCropScale(avatar.profile_crop_scale);
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

      {/* Crop editor — matches emotion image crop pattern */}
      {selected && selected.preview_image_url && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="space-y-4">
                <p className="text-sm font-medium">{selected.name}</p>

                {/* Circle preview */}
                <div className="flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50 shadow-md">
                    <img
                      src={selected.preview_image_url}
                      alt="Circle preview"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${cropScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                </div>

                {/* Actual size previews */}
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border">
                    <img
                      src={selected.preview_image_url}
                      alt="Small preview"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${cropScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                    <img
                      src={selected.preview_image_url}
                      alt="Medium preview"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${cropScale})`,
                        transformOrigin: "center center",
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Actual sizes</span>
                </div>
              </div>

              {/* Zoom slider */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2">
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  <Label>Zoom: {cropScale.toFixed(1)}x</Label>
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
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Save Zoom
                  </Button>
                  <Button variant="outline" onClick={() => setCropScale(1)}>
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
