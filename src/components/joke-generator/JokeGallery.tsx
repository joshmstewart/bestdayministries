import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Trash2, Share2, Lock, Globe, Loader2, Eye, EyeOff, Candy, Heart } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SavedJoke {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_public: boolean;
  likes_count: number;
  created_at: string;
}

interface JokeGalleryProps {
  userId: string;
}

export function JokeGallery({ userId }: JokeGalleryProps) {
  const queryClient = useQueryClient();
  const [selectedJoke, setSelectedJoke] = useState<SavedJoke | null>(null);
  const [jokeToDelete, setJokeToDelete] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data: savedJokes, isLoading, refetch } = useQuery({
    queryKey: ["user-jokes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_jokes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedJoke[];
    },
    enabled: !!userId,
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("saved_jokes")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isPublic }) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["community-jokes"] });
      if (selectedJoke) {
        setSelectedJoke({ ...selectedJoke, is_public: isPublic });
      }
      toast.success(isPublic ? "Shared with community!" : "Made private");
    },
    onError: () => {
      toast.error("Failed to update sharing status");
    },
  });

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJokeToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!jokeToDelete) return;
    const { error } = await supabase.from("saved_jokes").delete().eq("id", jokeToDelete);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Joke deleted!");
      setSelectedJoke(null);
      refetch();
    }
    setJokeToDelete(null);
  };

  const { data: categoryEmojis = {} } = useQuery({
    queryKey: ["joke-category-emojis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("joke_categories")
        .select("name, emoji");
      
      const emojiMap: Record<string, string> = {};
      data?.forEach((cat) => {
        emojiMap[cat.name] = cat.emoji || "🎲";
      });
      return emojiMap;
    },
  });

  const getCategoryEmoji = (category: string) => {
    return categoryEmojis[category] || "🎲";
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading your jokes...</div>;
  }

  if (!savedJokes?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Candy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>You haven't saved any jokes yet.</p>
        <p className="text-sm mt-2">Generate some jokes and save your favorites!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedJokes.map((joke) => (
          <Card
            key={joke.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group relative"
            onClick={() => {
              setSelectedJoke(joke);
              setShowAnswer(false);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getCategoryEmoji(joke.category)}</span>
                    {joke.is_public && (
                      <Badge className="bg-green-500/90 text-white text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Shared
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium line-clamp-2">{joke.question}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(joke.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{joke.likes_count}</span>
                </div>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => handleDeleteClick(joke.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!selectedJoke} onOpenChange={(open) => !open && setSelectedJoke(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryEmoji(selectedJoke?.category || 'random')}</span>
              {selectedJoke?.category?.charAt(0).toUpperCase()}{selectedJoke?.category?.slice(1)} Joke
            </DialogTitle>
            <DialogDescription>
              Saved on {selectedJoke && format(new Date(selectedJoke.created_at), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg p-4">
              <p className="text-lg font-medium text-center">{selectedJoke?.question}</p>
            </div>

            {!showAnswer ? (
              <Button 
                onClick={() => setShowAnswer(true)} 
                variant="outline" 
                className="w-full gap-2"
              >
                <Eye className="w-4 h-4" />
                Reveal Answer
              </Button>
            ) : (
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-4">
                <p className="text-lg font-semibold text-center">{selectedJoke?.answer}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            {selectedJoke?.is_public ? (
              <Button
                variant="outline"
                onClick={() => selectedJoke && toggleShareMutation.mutate({ id: selectedJoke.id, isPublic: false })}
                disabled={toggleShareMutation.isPending}
              >
                {toggleShareMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <EyeOff className="w-4 h-4 mr-2" />
                )}
                Make Private
              </Button>
            ) : (
              <Button
                onClick={() => selectedJoke && toggleShareMutation.mutate({ id: selectedJoke.id, isPublic: true })}
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
              onClick={(e) => selectedJoke && handleDeleteClick(selectedJoke.id, e)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete This Joke
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!jokeToDelete} onOpenChange={(open) => !open && setJokeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this joke?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this joke from your collection. This action cannot be undone.
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