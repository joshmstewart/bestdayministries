import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, Trash2, Eye, EyeOff, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
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

interface CelebrationImage {
  id: string;
  avatar_id: string;
  image_url: string;
  celebration_type: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface FitnessAvatar {
  id: string;
  name: string;
  image_url: string | null;
  preview_image_url: string | null;
  is_active: boolean;
}

export function AvatarCelebrationImagesManager() {
  const queryClient = useQueryClient();
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Load all avatars
  const { data: avatars = [], isLoading: loadingAvatars } = useQuery({
    queryKey: ["fitness-avatars-for-celebrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatars")
        .select("id, name, image_url, preview_image_url, is_active")
        .order("name");
      if (error) throw error;
      return data as FitnessAvatar[];
    },
  });

  // Load celebration images for selected avatar
  const { data: celebrationImages = [], isLoading: loadingImages } = useQuery({
    queryKey: ["celebration-images", selectedAvatarId],
    queryFn: async () => {
      if (!selectedAvatarId) return [];
      const { data, error } = await supabase
        .from("fitness_avatar_celebration_images")
        .select("*")
        .eq("avatar_id", selectedAvatarId)
        .order("display_order");
      if (error) throw error;
      return data as CelebrationImage[];
    },
    enabled: !!selectedAvatarId,
  });

  // Count images per avatar
  const { data: imageCounts = {} } = useQuery({
    queryKey: ["celebration-images-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatar_celebration_images")
        .select("avatar_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.avatar_id] = (counts[item.avatar_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-avatar-celebration-image", {
        body: { avatarId, celebrationType: "game_win" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebration-images"] });
      queryClient.invalidateQueries({ queryKey: ["celebration-images-counts"] });
      toast.success("Celebration image generated!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate image");
    },
    onSettled: () => {
      setGeneratingFor(null);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("fitness_avatar_celebration_images")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebration-images"] });
      toast.success("Image updated");
    },
    onError: () => {
      toast.error("Failed to update image");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fitness_avatar_celebration_images")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["celebration-images"] });
      queryClient.invalidateQueries({ queryKey: ["celebration-images-counts"] });
      toast.success("Image deleted");
    },
    onError: () => {
      toast.error("Failed to delete image");
    },
  });

  const handleGenerate = (avatarId: string) => {
    setGeneratingFor(avatarId);
    generateMutation.mutate(avatarId);
  };

  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5" />
          Avatar Celebration Images
        </CardTitle>
        <CardDescription>
          Pre-generate celebration images for each avatar to show when users win games
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar selector */}
        <div className="space-y-2">
          <Label>Select Avatar</Label>
          <Select value={selectedAvatarId || ""} onValueChange={setSelectedAvatarId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an avatar..." />
            </SelectTrigger>
            <SelectContent>
              {loadingAvatars ? (
                <div className="p-2 text-center text-muted-foreground">Loading...</div>
              ) : (
                avatars.map((avatar) => (
                  <SelectItem key={avatar.id} value={avatar.id}>
                    <div className="flex items-center gap-2">
                      {avatar.preview_image_url || avatar.image_url ? (
                        <img
                          src={avatar.preview_image_url || avatar.image_url!}
                          alt={avatar.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-muted" />
                      )}
                      <span>{avatar.name}</span>
                      {imageCounts[avatar.id] ? (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {imageCounts[avatar.id]}
                        </Badge>
                      ) : null}
                      {!avatar.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected avatar info and generate button */}
        {selectedAvatar && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            {(selectedAvatar.preview_image_url || selectedAvatar.image_url) && (
              <img
                src={selectedAvatar.preview_image_url || selectedAvatar.image_url!}
                alt={selectedAvatar.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold">{selectedAvatar.name}</h4>
              <p className="text-sm text-muted-foreground">
                {celebrationImages.length} celebration image{celebrationImages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={() => handleGenerate(selectedAvatar.id)}
              disabled={generatingFor === selectedAvatar.id}
            >
              {generatingFor === selectedAvatar.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate New
            </Button>
          </div>
        )}

        {/* Images grid */}
        {selectedAvatarId && (
          <div className="space-y-2">
            <Label>Celebration Images</Label>
            {loadingImages ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : celebrationImages.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No celebration images yet</p>
                <p className="text-sm">Generate some images for this avatar</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {celebrationImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative rounded-lg border-2 overflow-hidden ${
                        img.is_active ? "border-primary" : "border-border opacity-60"
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt="Celebration"
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={img.is_active}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: img.id, is_active: checked })
                              }
                              className="scale-75"
                            />
                            {img.is_active ? (
                              <Eye className="h-3 w-3 text-white" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-white/60" />
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this celebration image.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(img.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Quick generate for all avatars */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Quick Stats</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <div className="font-semibold">{avatars.length}</div>
              <div className="text-muted-foreground">Total Avatars</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-semibold">{Object.keys(imageCounts).length}</div>
              <div className="text-muted-foreground">With Images</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-semibold">
                {Object.values(imageCounts).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-muted-foreground">Total Images</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="font-semibold">
                {avatars.length - Object.keys(imageCounts).length}
              </div>
              <div className="text-muted-foreground">Need Images</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
