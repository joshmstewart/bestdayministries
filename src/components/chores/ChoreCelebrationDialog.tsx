import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Link } from "react-router-dom";

interface ChoreCelebrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function ChoreCelebrationDialog({
  open,
  onOpenChange,
  userId,
}: ChoreCelebrationDialogProps) {
  const queryClient = useQueryClient();
  const [showImage, setShowImage] = useState(false);

  // Check if user has a selected fitness avatar
  const { data: hasAvatar, isLoading: checkingAvatar } = useQuery({
    queryKey: ["has-fitness-avatar", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id")
        .eq("user_id", userId)
        .eq("is_selected", true)
        .maybeSingle();

      return !error && !!data;
    },
    enabled: open,
  });

  // Check for existing today's celebration image
  const today = new Date().toISOString().split("T")[0];
  const { data: existingImage, isLoading: loadingExisting } = useQuery({
    queryKey: ["chore-celebration-image", userId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chore_celebration_images")
        .select("*")
        .eq("user_id", userId)
        .eq("completion_date", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && hasAvatar,
  });

  // Generate celebration image mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("generate-chore-celebration-image", {
        body: { 
          targetUserId: userId,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      // Check if skipped (no avatar)
      if (response.data?.skipped) {
        throw new Error(response.data.reason || "Image generation skipped");
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chore-celebration-image", userId, today] });
      toast.success("Celebration image created!");
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });

  // Auto-show image after short delay for effect
  useEffect(() => {
    if (open && existingImage) {
      const timer = setTimeout(() => setShowImage(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowImage(false);
    }
  }, [open, existingImage]);

  const isLoading = checkingAvatar || loadingExisting;
  const isGenerating = generateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Great Job!
            </DialogTitle>
            <DialogDescription>
              You completed all your chores today!
            </DialogDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasAvatar ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">Amazing Work! 🎉</p>
                <p className="text-muted-foreground mt-2">
                  Want to see yourself celebrating? Get a fitness avatar to unlock celebration images!
                </p>
              </div>
              <Button asChild>
                <Link to="/games/workout-tracker">
                  Get a Fitness Avatar
                </Link>
              </Button>
            </div>
          ) : existingImage ? (
            <div className="space-y-4">
              <div className={`relative rounded-lg overflow-hidden transition-all duration-500 ${showImage ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <img
                  src={existingImage.image_url}
                  alt="Celebration"
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white font-medium text-center">
                    {existingImage.activity_category}
                    {existingImage.location_name && (
                      <span className="block text-sm text-white/80">
                        @ {existingImage.location_name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => generateMutation.mutate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate New Image
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-pulse">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">🎉 All Chores Complete!</p>
                <p className="text-muted-foreground mt-2">
                  Generate a celebration image of your avatar!
                </p>
              </div>
              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={isGenerating}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Celebration Image
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
