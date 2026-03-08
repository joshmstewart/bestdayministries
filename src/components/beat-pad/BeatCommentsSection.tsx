import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Trash2, Loader2 } from "lucide-react";

interface BeatComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    display_name: string;
    avatar_number: number | null;
    profile_avatar_id: string | null;
  } | null;
}

interface BeatCommentsSectionProps {
  creationId: string;
  /** Compact mode for inline usage in cards */
  compact?: boolean;
  /** Callback when comments count changes */
  onCommentsCountChange?: (count: number) => void;
}

export function BeatCommentsSection({ creationId, compact = false, onCommentsCountChange }: BeatCommentsSectionProps) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<BeatComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    if (!creationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("beat_pad_comments")
      .select(
        "id, content, created_at, author_id, author:profiles_public!beat_pad_comments_author_id_fkey(display_name, avatar_number, profile_avatar_id)"
      )
      .eq("creation_id", creationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const mapped = data.map((c: any) => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
      }));
      setComments(mapped);
      onCommentsCountChange?.(mapped.length);
    }
    setLoading(false);
  }, [creationId, onCommentsCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Realtime subscription
  useEffect(() => {
    if (!creationId) return;

    const channel = supabase
      .channel(`beat-comments-${creationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "beat_pad_comments",
          filter: `creation_id=eq.${creationId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creationId, loadComments]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSubmit = async () => {
    if (!user || !creationId || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("beat_pad_comments").insert({
      creation_id: creationId,
      author_id: user.id,
      content: newComment.trim(),
    });
    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from("beat_pad_comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Comments header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </span>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className={`space-y-2 ${compact ? "max-h-48" : "max-h-64"} overflow-y-auto [-webkit-overflow-scrolling:touch]`}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-2 group"
            >
              <AvatarDisplay
                profileAvatarId={comment.author?.profile_avatar_id}
                displayName={comment.author?.display_name || "User"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {comment.author?.display_name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {(user?.id === comment.author_id || isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
      )}

      {/* Comment input */}
      {user ? (
        <div className="flex gap-2 items-end">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            className="min-h-[36px] max-h-20 resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="shrink-0 h-9 w-9"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Sign in to comment
        </p>
      )}
    </div>
  );
}
