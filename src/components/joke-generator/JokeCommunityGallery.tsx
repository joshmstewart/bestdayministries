import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Heart, Loader2, X, Eye, EyeOff, Candy, Save, Trash2, ShieldAlert, UserPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TextToSpeech } from "@/components/TextToSpeech";

type SortOption = "newest" | "popular";

interface PublicJoke {
  id: string;
  question: string;
  answer: string;
  category: string;
  likes_count: number;
  created_at: string;
  user_id: string;
  creator_name: string | null;
  is_user_created: boolean;
}

interface JokeCommunityGalleryProps {
  userId: string;
}

export const JokeCommunityGallery = ({ userId }: JokeCommunityGalleryProps) => {
  const { isAdmin } = useAuth();
  const [jokes, setJokes] = useState<PublicJoke[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingJoke, setLikingJoke] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedJoke, setSelectedJoke] = useState<PublicJoke | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [unsharing, setUnsharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryEmojis, setCategoryEmojis] = useState<Record<string, string>>({});
  const [jokeToDelete, setJokeToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategoryEmojis();
    loadJokes();
    loadUserLikes();
  }, [userId, sortBy]);

  const loadCategoryEmojis = async () => {
    const { data } = await supabase
      .from("joke_categories")
      .select("name, emoji");
    
    if (data) {
      const emojiMap: Record<string, string> = {};
      data.forEach((cat) => {
        emojiMap[cat.name] = cat.emoji || "🎲";
      });
      setCategoryEmojis(emojiMap);
    }
  };

  const loadJokes = async () => {
    setLoading(true);
    const query = supabase
      .from("saved_jokes")
      .select("id, question, answer, category, likes_count, created_at, user_id, is_user_created")
      .eq("is_public", true)
      .limit(50);

    if (sortBy === "newest") {
      query.order("created_at", { ascending: false });
    } else {
      query.order("likes_count", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      toast.error(`Error loading jokes: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      setJokes([]);
      setLoading(false);
      return;
    }

    // Fetch creator names separately
    const creatorIds = [...new Set(data.map((j) => j.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

    const jokesWithCreators = data.map((joke) => ({
      ...joke,
      creator_name: profileMap.get(joke.user_id) || null,
    }));

    setJokes(jokesWithCreators as PublicJoke[]);
    setLoading(false);
  };

  const loadUserLikes = async () => {
    const { data } = await supabase
      .from("joke_likes")
      .select("joke_id")
      .eq("user_id", userId);

    if (data) {
      setUserLikes(new Set(data.map((l) => l.joke_id)));
    }
  };

  const toggleLike = async (jokeId: string) => {
    setLikingJoke(jokeId);
    const isLiked = userLikes.has(jokeId);

    try {
      if (isLiked) {
        await supabase
          .from("joke_likes")
          .delete()
          .eq("joke_id", jokeId)
          .eq("user_id", userId);

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(jokeId);
          return next;
        });
        setJokes((prev) =>
          prev.map((j) =>
            j.id === jokeId ? { ...j, likes_count: Math.max(0, j.likes_count - 1) } : j
          )
        );
        if (selectedJoke?.id === jokeId) {
          setSelectedJoke(prev => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count - 1) } : null);
        }
      } else {
        await supabase.from("joke_likes").insert({
          joke_id: jokeId,
          user_id: userId,
        });

        setUserLikes((prev) => new Set([...prev, jokeId]));
        setJokes((prev) =>
          prev.map((j) =>
            j.id === jokeId ? { ...j, likes_count: j.likes_count + 1 } : j
          )
        );
        if (selectedJoke?.id === jokeId) {
          setSelectedJoke(prev => prev ? { ...prev, likes_count: prev.likes_count + 1 } : null);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLikingJoke(null);
    }
  };

  const saveToMyCollection = async (joke: PublicJoke) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("saved_jokes")
        .insert({
          user_id: userId,
          question: joke.question,
          answer: joke.answer,
          category: joke.category,
          is_public: false,
        });

      if (error) throw error;
      toast.success("Joke saved to your collection!");
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error("You already have this joke saved!");
      } else {
        toast.error("Failed to save joke");
      }
    } finally {
      setSaving(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    return categoryEmojis[category] || "🎲";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (jokes.length === 0) {
    return (
      <div className="text-center py-12">
        <Candy className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground mb-2">No shared jokes yet!</p>
        <p className="text-sm text-muted-foreground">
          Be the first to share a joke with the community.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jokes.map((joke) => {
          const isLiked = userLikes.has(joke.id);
          const isOwn = joke.user_id === userId;

          return (
            <Card
              key={joke.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => {
                setSelectedJoke(joke);
                setShowAnswer(false);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">{getCategoryEmoji(joke.category)}</span>
                      {isOwn && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          Yours
                        </span>
                      )}
                      {joke.is_user_created && joke.creator_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                          <UserPen className="w-3 h-3" />
                          Created by {joke.creator_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="font-medium line-clamp-2 flex-1">{joke.question}</p>
                      <div onClick={(e) => e.stopPropagation()}>
                        <TextToSpeech text={joke.question} size="icon" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(joke.id);
                    }}
                    disabled={likingJoke === joke.id}
                    className="flex items-center gap-1 px-2 py-1 -mr-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
                    <span className="text-xs text-muted-foreground">{joke.likes_count}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedJoke} onOpenChange={() => setSelectedJoke(null)}>
        <DialogContent className="max-w-lg">
          {selectedJoke && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{getCategoryEmoji(selectedJoke.category)}</span>
                  {selectedJoke.category?.charAt(0).toUpperCase()}{selectedJoke.category?.slice(1)} Joke
                </DialogTitle>
                <DialogDescription>
                  {selectedJoke.creator_name && <>Shared by {selectedJoke.creator_name} · </>}
                  {format(new Date(selectedJoke.created_at), "MMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg font-medium text-center">{selectedJoke.question}</p>
                    <TextToSpeech text={selectedJoke.question} size="icon" />
                  </div>
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
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-semibold text-center">{selectedJoke.answer}</p>
                      <TextToSpeech text={selectedJoke.answer} size="icon" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLike(selectedJoke.id)}
                  disabled={likingJoke === selectedJoke.id}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-1",
                      userLikes.has(selectedJoke.id) && "fill-red-500 text-red-500"
                    )}
                  />
                  {selectedJoke.likes_count}
                </Button>

                {/* Save to my collection - only for others' jokes */}
                {selectedJoke.user_id !== userId && (
                  <Button
                    size="sm"
                    onClick={() => saveToMyCollection(selectedJoke)}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save to My Jokes
                  </Button>
                )}

                {/* Unshare - only for owner */}
                {selectedJoke.user_id === userId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setUnsharing(true);
                      try {
                        const { error } = await supabase
                          .from("saved_jokes")
                          .update({ is_public: false })
                          .eq("id", selectedJoke.id);
                        if (error) throw error;
                        setJokes(prev => prev.filter(j => j.id !== selectedJoke.id));
                        setSelectedJoke(null);
                        toast.success("Joke unshared - now private");
                      } catch (error: any) {
                        toast.error(error.message);
                      } finally {
                        setUnsharing(false);
                      }
                    }}
                    disabled={unsharing}
                  >
                    {unsharing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <EyeOff className="h-4 w-4 mr-1" />}
                    Unshare
                  </Button>
                )}

                {/* Admin delete button */}
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setJokeToDelete(selectedJoke.id)}
                  >
                    <ShieldAlert className="h-4 w-4 mr-1" />
                    Admin Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Delete Confirmation Dialog */}
      <AlertDialog open={!!jokeToDelete} onOpenChange={(open) => !open && setJokeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Admin: Delete this joke?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this joke from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!jokeToDelete) return;
                setDeleting(true);
                try {
                  const { error } = await supabase
                    .from("saved_jokes")
                    .delete()
                    .eq("id", jokeToDelete);
                  if (error) throw error;
                  setJokes(prev => prev.filter(j => j.id !== jokeToDelete));
                  setSelectedJoke(null);
                  toast.success("Joke deleted by admin");
                } catch (error: any) {
                  toast.error("Failed to delete joke");
                } finally {
                  setDeleting(false);
                  setJokeToDelete(null);
                }
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};