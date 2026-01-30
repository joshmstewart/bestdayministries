import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TextToSpeech } from "@/components/TextToSpeech";
import { Heart, MessageSquare, Share2, Loader2, Sparkles, BookOpen, Quote, Star, ExternalLink, Lightbulb, ThumbsUp, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

interface DailyFortunePopupProps {
  onClose?: () => void;
}

export function DailyFortunePopup({ onClose }: DailyFortunePopupProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [fortunePost, setFortunePost] = useState<FortunePost | null>(null);
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);

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
      
      const { data: post, error: postError } = await supabase
        .from("daily_fortune_posts")
        .select("*")
        .eq("post_date", today)
        .maybeSingle();

      if (postError) throw postError;

      if (post) {
        setFortunePost(post);
        setLikesCount(post.likes_count || 0);

        const { data: fortuneData } = await supabase
          .from("daily_fortunes")
          .select("*")
          .eq("id", post.fortune_id)
          .single();

        if (fortuneData) {
          setFortune(fortuneData);
        }

        if (user) {
          const { data: like } = await supabase
            .from("daily_fortune_likes")
            .select("id")
            .eq("fortune_post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          setHasLiked(!!like);
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
        await supabase
          .from("daily_fortune_likes")
          .delete()
          .eq("fortune_post_id", fortunePost.id)
          .eq("user_id", user.id);
        
        setHasLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
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

  const handleComment = () => {
    if (fortunePost?.discussion_post_id) {
      onClose?.();
      navigate(`/discussions?postId=${fortunePost.discussion_post_id}`);
    } else {
      toast.info("Comments will appear once someone starts the discussion!");
    }
  };

  const handleShare = async () => {
    if (!fortune) return;
    
    const shareText = `${fortune.content}${fortune.author ? ` - ${fortune.author}` : ""}${fortune.reference ? ` (${fortune.reference})` : ""}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Daily Inspiration",
          text: shareText,
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!fortune) {
    return (
      <div className="py-8 text-center space-y-4">
        <Sparkles className="w-12 h-12 text-indigo-400 mx-auto" />
        <p className="text-muted-foreground">
          Today's inspiration is being prepared...
        </p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source type badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm">
          {getSourceIcon(fortune.source_type)}
          <span>{getSourceLabel(fortune.source_type)}</span>
        </div>
        <TextToSpeech
          text={`${fortune.content}. ${fortune.author ? `By ${fortune.author}` : ""} ${fortune.reference || ""}`}
          size="icon"
        />
      </div>

      {/* Fortune content - tap to reveal */}
      <button
        onClick={async () => {
          setRevealed(true);
          // Record the view for completion tracking (only once per session)
          if (!viewRecorded && user && fortunePost) {
            setViewRecorded(true);
            try {
              await supabase
                .from("daily_fortune_views")
                .upsert({
                  user_id: user.id,
                  fortune_post_id: fortunePost.id,
                  view_date: getMSTDate(),
                }, { onConflict: 'user_id,view_date' });
            } catch (error) {
              // Silently fail - not critical
              console.error("Error recording fortune view:", error);
            }
          }
        }}
        className={cn(
          "w-full text-left transition-all duration-500 p-6 rounded-xl",
          revealed
            ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20"
            : "bg-gradient-to-r from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        {revealed ? (
          <div className="space-y-3">
            <p className="text-lg leading-relaxed italic text-foreground">
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
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 text-indigo-500 mx-auto mb-3 animate-pulse" />
            <p className="text-base font-medium text-indigo-700 dark:text-indigo-300">
              Tap to reveal today's inspiration ✨
            </p>
          </div>
        )}
      </button>

      {/* Actions */}
      {revealed && (
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              disabled={!isAuthenticated}
              className="gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Discuss</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-1"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      )}

      {/* View full discussion link */}
      {revealed && fortunePost?.discussion_post_id && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleComment}
        >
          <ExternalLink className="w-4 h-4" />
          View Full Discussion
        </Button>
      )}

      {/* Close button */}
      <Button variant="ghost" className="w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
