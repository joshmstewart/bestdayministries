import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Trash2, Copy, Palette, Share2, Lock, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
interface ColoringGalleryProps {
  onSelectColoring: (page: any, loadSavedData?: boolean, book?: any) => void;
}

export function ColoringGallery({ onSelectColoring }: ColoringGalleryProps) {
  const { user } = useAuth();
  const { awardCoins } = useCoins();
  const queryClient = useQueryClient();
  const [selectedColoring, setSelectedColoring] = useState<any>(null);
  const [coloringToDelete, setColoringToDelete] = useState<{ id: string; event: React.MouseEvent } | null>(null);

  const { data: savedColorings, isLoading, refetch } = useQuery({
    queryKey: ["user-colorings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Only fetch the fields we need - exclude canvas_data for listing to avoid timeout
      const { data, error } = await supabase
        .from("user_colorings")
        .select(`
          id,
          thumbnail_url,
          is_public,
          updated_at,
          coloring_page_id,
          coloring_page:coloring_pages(
            id,
            title,
            image_url,
            book_id,
            book:coloring_books(id, title, cover_image_url, description, coin_price, is_free)
          )
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds to prevent re-fetching on tab switches
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ id, isPublic, wasPublic }: { id: string; isPublic: boolean; wasPublic: boolean }) => {
      const { error } = await supabase
        .from("user_colorings")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
      
      // Award coins for new shares (going from private to public)
      if (isPublic && !wasPublic && user) {
        const { data: shareReward } = await supabase
          .from("coin_rewards_settings")
          .select("coins_amount, is_active")
          .eq("reward_key", "coloring_share")
          .single();
        
        if (shareReward?.is_active && shareReward.coins_amount > 0) {
          await awardCoins(user.id, shareReward.coins_amount, "Shared a coloring with the community");
        }
      }
    },
    onSuccess: (_, { isPublic }) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-colorings"] });
      if (selectedColoring) {
        setSelectedColoring({ ...selectedColoring, is_public: isPublic });
      }
      toast.success(isPublic ? "Shared with community!" : "Made private");
    },
    onError: () => {
      toast.error("Failed to update sharing status");
    },
  });

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setColoringToDelete({ id, event: e });
  };

  const handleConfirmDelete = async () => {
    if (!coloringToDelete) return;
    const { error } = await supabase.from("user_colorings").delete().eq("id", coloringToDelete.id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Deleted!");
      setSelectedColoring(null);
      refetch();
    }
    setColoringToDelete(null);
  };

  const handleStartFresh = () => {
    if (selectedColoring) {
      onSelectColoring(selectedColoring.coloring_page, false);
      setSelectedColoring(null);
    }
  };

  const handleContinue = async () => {
    if (selectedColoring) {
      // Fetch canvas_data only when user clicks "Edit" - lazy load
      const { data: coloringData, error } = await supabase
        .from("user_colorings")
        .select("canvas_data")
        .eq("id", selectedColoring.id)
        .single();
      
      if (error) {
        toast.error("Failed to load coloring data");
        return;
      }
      
      // Pass the saved data along with the page, including is_public status and book info
      const pageWithSavedData = {
        ...selectedColoring.coloring_page,
        savedCanvasData: coloringData?.canvas_data,
        isPublic: selectedColoring.is_public,
      };
      onSelectColoring(pageWithSavedData, true, selectedColoring.coloring_page?.book);
      setSelectedColoring(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Sign in to see your saved colorings!
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading your gallery...</div>;
  }

  if (!savedColorings?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You haven't saved any colorings yet. Start coloring to build your gallery!
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {savedColorings.map((coloring) => (
          <Card
            key={coloring.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group relative"
            onClick={() => setSelectedColoring(coloring)}
          >
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={coloring.thumbnail_url || coloring.coloring_page?.image_url}
                  alt={coloring.coloring_page?.title}
                  className="w-full aspect-square object-cover"
                />
                {/* Shared badge */}
                {coloring.is_public && (
                  <Badge className="absolute top-2 left-2 bg-green-500/90 text-white">
                    <Globe className="w-3 h-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">
                  {coloring.coloring_page?.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Last edited: {new Date(coloring.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => handleDeleteClick(coloring.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!selectedColoring} onOpenChange={(open) => !open && setSelectedColoring(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedColoring?.coloring_page?.title}</DialogTitle>
            <DialogDescription>
              Choose how you want to work on this coloring page
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <img
              src={selectedColoring?.thumbnail_url || selectedColoring?.coloring_page?.image_url}
              alt={selectedColoring?.coloring_page?.title}
              className="max-h-[400px] w-auto rounded-lg border shadow-lg"
            />
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={handleContinue}>
              <Palette className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleStartFresh}>
              <Copy className="w-4 h-4 mr-2" />
              Start New Copy
            </Button>
            {selectedColoring?.is_public ? (
              <Button
                variant="outline"
                onClick={() => toggleShareMutation.mutate({ id: selectedColoring.id, isPublic: false, wasPublic: true })}
                disabled={toggleShareMutation.isPending}
              >
                {toggleShareMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Make Private
              </Button>
            ) : (
              <Button
                onClick={() => toggleShareMutation.mutate({ id: selectedColoring.id, isPublic: true, wasPublic: false })}
                disabled={toggleShareMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {toggleShareMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Share with Community
              </Button>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => selectedColoring && handleDeleteClick(selectedColoring.id, e)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete This Coloring
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!coloringToDelete} onOpenChange={(open) => !open && setColoringToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this coloring?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your coloring. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
