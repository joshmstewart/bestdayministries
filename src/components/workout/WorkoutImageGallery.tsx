import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Loader2, Heart, Share2, Users, 
  Trophy, Dumbbell, Trash2, Lock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
import { WorkoutImageDetailDialog } from "./WorkoutImageDetailDialog";

interface WorkoutImageGalleryProps {
  userId: string;
}

interface WorkoutImage {
  id: string;
  user_id: string;
  avatar_id: string;
  image_url: string;
  image_type: string;
  activity_name: string | null;
  location_name: string | null;
  location_pack_name: string | null;
  is_shared_to_community: boolean;
  likes_count: number;
  created_at: string;
}

export const WorkoutImageGallery = ({ userId }: WorkoutImageGalleryProps) => {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<WorkoutImage | null>(null);
  const [deleteImage, setDeleteImage] = useState<WorkoutImage | null>(null);
  // Gallery now only shows community images (My Images is redundant with Avatar tab)

  // Fetch user's auto-share setting
  const { data: autoShareEnabled = true } = useQuery({
    queryKey: ["auto-share-workout-images", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("auto_share_workout_images")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data.auto_share_workout_images ?? true;
    },
    enabled: !!userId,
  });

  // Toggle auto-share setting
  const toggleAutoShareMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ auto_share_workout_images: enabled })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["auto-share-workout-images"] });
      toast.success(enabled ? "Auto-share enabled" : "Auto-share disabled");
    },
    onError: () => {
      toast.error("Failed to update setting");
    },
  });


  // Fetch community images (exclude test images)
  const { data: communityImages = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ["workout-images-community"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_generated_images")
        .select("*")
        .eq("is_shared_to_community", true)
        .eq("is_test", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WorkoutImage[];
    },
  });

  // Fetch usernames for community images
  const userIds = [...new Set(communityImages.map(img => img.user_id))];
  const { data: userProfiles = {} } = useQuery({
    queryKey: ["workout-image-usernames", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (error) throw error;
      return (data || []).reduce((acc, profile) => {
        acc[profile.id] = profile.display_name;
        return acc;
      }, {} as Record<string, string | null>);
    },
    enabled: userIds.length > 0,
  });

  // Check if user has liked images
  const { data: likedImages = [] } = useQuery({
    queryKey: ["workout-image-likes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_image_likes")
        .select("image_id")
        .eq("user_id", userId);

      if (error) throw error;
      return data.map((l) => l.image_id);
    },
    enabled: !!userId,
  });

  // Share to community
  const shareMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("workout_generated_images")
        .update({ is_shared_to_community: true })
        .eq("id", imageId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["workout-images-community"] });
      toast.success("Shared to community! 🎉");
    },
    onError: () => {
      toast.error("Failed to share");
    },
  });

  // Unshare from community
  const unshareMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from("workout_generated_images")
        .update({ is_shared_to_community: false })
        .eq("id", imageId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["workout-images-community"] });
      toast.success("Removed from community");
    },
    onError: () => {
      toast.error("Failed to unshare");
    },
  });

  // Like an image
  const likeMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const isLiked = likedImages.includes(imageId);
      
      if (isLiked) {
        const { error } = await supabase
          .from("workout_image_likes")
          .delete()
          .eq("image_id", imageId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workout_image_likes")
          .insert({ image_id: imageId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-image-likes"] });
      queryClient.invalidateQueries({ queryKey: ["workout-images-community"] });
    },
  });

  // Delete an image
  const deleteMutation = useMutation({
    mutationFn: async (image: WorkoutImage) => {
      // Delete from storage
      const path = image.image_url.split("/workout-images/")[1];
      if (path) {
        await supabase.storage.from("workout-images").remove([path]);
      }

      // Delete from database
      const { error } = await supabase
        .from("workout_generated_images")
        .delete()
        .eq("id", image.id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-images"] });
      queryClient.invalidateQueries({ queryKey: ["workout-images-community"] });
      toast.success("Image deleted");
      setDeleteImage(null);
    },
    onError: () => {
      toast.error("Failed to delete");
    },
  });

  const renderImageCard = (image: WorkoutImage, showActions = true) => {
    const isOwn = image.user_id === userId;
    const isLiked = likedImages.includes(image.id);

    return (
      <div
        key={image.id}
        className="relative group rounded-xl overflow-hidden border bg-card cursor-pointer"
        onClick={() => setSelectedImage(image)}
      >
        <div className="aspect-square">
          <img
            src={image.image_url}
            alt={image.activity_name || "Workout image"}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-white text-xs font-medium truncate">
              {image.image_type === "celebration" ? "🏆 Goal Celebration!" : image.activity_name}
            </p>
            <p className="text-white/70 text-[10px]">
              {format(new Date(image.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isOwn && (
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  likeMutation.mutate(image.id);
                }}
              >
                <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-red-500 text-red-500")} />
              </Button>
            )}
            {isOwn && !image.is_shared_to_community && (
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  shareMutation.mutate(image.id);
                }}
                title="Share to community"
              >
                <Share2 className="h-3.5 w-3.5 text-green-500" />
              </Button>
            )}
            {isOwn && image.is_shared_to_community && (
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  unshareMutation.mutate(image.id);
                }}
                title="Make private"
              >
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )}
            {isOwn && (
              <Button
                size="icon"
                variant="destructive"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteImage(image);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          {image.image_type === "celebration" ? (
            <Trophy className="h-4 w-4 text-yellow-400 drop-shadow" />
          ) : (
            <Dumbbell className="h-4 w-4 text-primary drop-shadow" />
          )}
        </div>

        {/* Likes count */}
        {image.likes_count > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
            <Heart className="h-3 w-3 text-red-400 fill-red-400" />
            <span className="text-white text-[10px]">{image.likes_count}</span>
          </div>
        )}
      </div>
    );
  };

  const isLoading = loadingCommunity;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Community Gallery
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-share" className="text-xs text-muted-foreground">
                Auto-share
              </Label>
              <Switch
                id="auto-share"
                checked={autoShareEnabled}
                onCheckedChange={(checked) => toggleAutoShareMutation.mutate(checked)}
                disabled={toggleAutoShareMutation.isPending}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : communityImages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No community images yet!</p>
              <p className="text-xs">Be the first to share</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {communityImages.map((image) => renderImageCard(image))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Detail Dialog */}
      <WorkoutImageDetailDialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        image={selectedImage}
        userName={selectedImage ? (userProfiles[selectedImage.user_id] || undefined) : undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteImage} onOpenChange={() => setDeleteImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The image will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteImage && deleteMutation.mutate(deleteImage)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
