import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Heart, Loader2, Sparkles, BookOpen, Quote, Star, Lightbulb, ThumbsUp, MessageCircle, Bookmark } from "lucide-react";
import { useSavedFortunes } from "@/hooks/useSavedFortunes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Fortune {
  id: string;
  content: string;
  source_type: string;
  author: string | null;
  reference: string | null;
}

interface FortunePost {
  id: string;
  fortune_id: string;
  post_date: string;
  discussion_post_id: string | null;
  likes_count: number;
  fortune?: Fortune;
}

export function DailyFortune() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isSaved, toggleSave } = useSavedFortunes();
  const [fortunePost, setFortunePost] = useState<FortunePost | null>(null);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Get MST date
  const getMSTDate = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  };

  useEffect(() => {
    loadTodaysFortune();
  }, [user, isAuthenticated, authLoading]);

  const loadTodaysFortune = async () => {
    try {
      const today = getMSTDate();
      
      // Get today's fortune post
      const { data: post, error: postError } = await supabase
        .from("daily_fortune_posts")
        .select("*")
        .eq("post_date", today)
        .maybeSingle();

      if (postError) throw postError;

      if (post) {
        setFortunePost(post);
        setLikesCount(post.likes_count || 0);

        // Get fortune details
        const { data: fortuneData } = await supabase
          .from("daily_fortunes")
          .select("*")
          .eq("id", post.fortune_id)
          .single();

        if (fortuneData) {
          setFortune(fortuneData);
        }

        // Check if user has liked and if already viewed today
        if (user) {
          const [likeResult, viewResult, commentsResult] = await Promise.all([
            supabase
              .from("daily_fortune_likes")
              .select("id")
              .eq("fortune_post_id", post.id)
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("daily_fortune_views")
              .select("id")
              .eq("user_id", user.id)
              .eq("view_date", today)
              .maybeSingle(),
            supabase
              .from("daily_fortune_comments")
              .select("id", { count: "exact", head: true })
              .eq("fortune_post_id", post.id),
          ]);
          
          setHasLiked(!!likeResult.data);
          setRevealed(!!viewResult.data);
          setCommentCount(commentsResult.count || 0);
        } else {
          // For non-authenticated users, just get comment count
          const { count } = await supabase
            .from("daily_fortune_comments")
            .select("id", { count: "exact", head: true })
            .eq("fortune_post_id", post.id);
          setCommentCount(count || 0);
        }
      }
    } catch (error) {
      console.error("Error loading fortune:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !fortunePost || liking) return;

    setLiking(true);
    try {
      if (hasLiked) {
        // Unlike
        await supabase
          .from("daily_fortune_likes")
          .delete()
          .eq("fortune_post_id", fortunePost.id)
          .eq("user_id", user.id);
        
        setHasLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from("daily_fortune_likes")
          .insert({
            fortune_post_id: fortunePost.id,
            user_id: user.id,
          });
        
        setHasLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    } finally {
      setLiking(false);
    }
  };


  const getSourceIcon = (type: string) => {
    switch (type) {
      case "bible_verse":
        return <BookOpen className="w-4 h-4" />;
      case "affirmation":
        return <Star className="w-4 h-4" />;
      case "life_lesson":
        return <Lightbulb className="w-4 h-4" />;
      case "gratitude_prompt":
        return <ThumbsUp className="w-4 h-4" />;
      case "discussion_starter":
        return <MessageCircle className="w-4 h-4" />;
      case "proverbs":
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Quote className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (type: string) => {
    switch (type) {
      case "bible_verse":
        return "Scripture";
      case "affirmation":
        return "Affirmation";
      case "life_lesson":
        return "Life Lesson";
      case "gratitude_prompt":
        return "Gratitude Prompt";
      case "discussion_starter":
        return "Discussion Starter";
      case "proverbs":
        return "Biblical Wisdom";
      default:
        return "Quote";
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-indigo-200/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    );
  }

  if (!fortune) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-indigo-200/50">
        <CardContent className="py-6 text-center">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Today's inspiration is being prepared...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-indigo-200/50 overflow-hidden">
      <CardContent className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Daily Inspiration
              </h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getSourceIcon(fortune.source_type)}
                <span>{getSourceLabel(fortune.source_type)}</span>
              </div>
            </div>
          </div>
          <TextToSpeech
            text={`${fortune.content}. ${fortune.author ? `By ${fortune.author}` : ""} ${fortune.reference || ""}`}
            size="icon"
          />
        </div>

        {/* Fortune content - tap to reveal */}
        <button
          onClick={async () => {
            if (!revealed && user && fortunePost) {
              // Record the view with error handling
              const viewDate = getMSTDate();
              console.log("Recording fortune view for date:", viewDate, "fortune_post_id:", fortunePost.id);
              
              const { error } = await supabase.from("daily_fortune_views").upsert({
                user_id: user.id, 
                view_date: viewDate,
                fortune_post_id: fortunePost.id,
              }, { onConflict: "user_id,view_date" });
              
              if (error) {
                console.error("Failed to record fortune view:", error);
              } else {
                console.log("Fortune view recorded successfully for", viewDate);
              }
            }
            setRevealed(true);
          }}
          className={cn(
            "w-full text-left transition-all duration-500 p-4 rounded-xl",
            revealed
              ? "bg-white/70 dark:bg-gray-800/70"
              : "bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          {revealed ? (
            <div className="space-y-2">
              <p className="text-base leading-relaxed italic">
                "{fortune.content}"
              </p>
              {(fortune.author || fortune.reference) && (
                <p className="text-sm text-right text-muted-foreground">
                  {fortune.author && <span>— {fortune.author}</span>}
                  {fortune.reference && <span className="ml-1">({fortune.reference})</span>}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Tap to reveal today's inspiration ✨
              </p>
            </div>
          )}
        </button>

        {/* Like and Save actions */}
        {revealed && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={!isAuthenticated || liking}
              className={cn(
                "gap-1",
                hasLiked && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart className={cn("w-4 h-4", hasLiked && "fill-current")} />
              <span className="text-xs">{likesCount}</span>
            </Button>
            
            {fortunePost && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!isAuthenticated) {
                    toast.error("Please sign in to save fortunes");
                    return;
                  }
                  setSaving(true);
                  await toggleSave(fortunePost.id);
                  setSaving(false);
                }}
                disabled={!isAuthenticated || saving}
                className={cn(
                  "gap-1",
                  isSaved(fortunePost.id) && "text-primary"
                )}
              >
                <Bookmark className={cn("w-4 h-4", isSaved(fortunePost.id) && "fill-current")} />
                <span className="text-xs">{isSaved(fortunePost.id) ? "Saved" : "Save"}</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
