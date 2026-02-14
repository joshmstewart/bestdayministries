import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Trash2, Mic } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { TextToSpeech } from "@/components/TextToSpeech";
import { VoiceInput } from "@/components/VoiceInput";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_number: number | null;
    avatar_url: string | null;
    profile_avatar_id: string | null;
  };
}

interface FortuneCommentsProps {
  fortunePostId: string;
  onDiscussionCreated?: (discussionPostId: string) => void;
}

export function FortuneComments({ fortunePostId, onDiscussionCreated }: FortuneCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [discussionPostId, setDiscussionPostId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    try {
      // Check if there's already a discussion post linked
      const { data: fortunePost } = await supabase
        .from("daily_fortune_posts")
        .select("discussion_post_id")
        .eq("id", fortunePostId)
        .single();
      
      const linkedDiscussionId = fortunePost?.discussion_post_id;
      if (linkedDiscussionId) {
        setDiscussionPostId(linkedDiscussionId);
      }

      // If there's a linked discussion post, fetch comments from discussion_comments
      if (linkedDiscussionId) {
        const { data, error } = await supabase
          .from("discussion_comments")
          .select("id, author_id, content, created_at, approval_status")
          .eq("post_id", linkedDiscussionId)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Fetch profiles for all commenters
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((c) => c.author_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_number, avatar_url, profile_avatar_id")
            .in("id", userIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
          const commentsWithProfiles = data.map((comment) => ({
            id: comment.id,
            author_id: comment.author_id,
            content: comment.content,
            created_at: comment.created_at,
            profile: profileMap.get(comment.author_id),
          }));
          setComments(commentsWithProfiles);
        } else {
          setComments([]);
        }
      } else {
        // No linked discussion yet, no comments to show
        setComments([]);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  }, [fortunePostId]);

  useEffect(() => {
    loadComments();

    // Subscribe to realtime updates on discussion_comments
    // We need to subscribe even before we know the discussion_post_id
    // because it might be created during the session
    const channel = supabase
      .channel(`fortune-discussion-comments-${fortunePostId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discussion_comments",
        },
        (payload) => {
          // Reload if this comment belongs to our discussion post
          if (discussionPostId && payload.new && (payload.new as any).post_id === discussionPostId) {
            loadComments();
          } else if (!discussionPostId) {
            // If we don't have a discussion post yet, reload to check
            loadComments();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_fortune_posts",
          filter: `id=eq.${fortunePostId}`,
        },
        () => {
          // Discussion post might have been created
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fortunePostId, loadComments, discussionPostId]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      let currentDiscussionId = discussionPostId;

      // Check if discussion post exists, if not, create one via edge function
      if (!currentDiscussionId) {
        const { data: createResult, error: createError } = await supabase.functions.invoke('create-fortune-discussion-post', {
          body: { fortunePostId }
        });
        
        if (createError) {
          console.error("Error creating discussion post:", createError);
          toast.error("Failed to create discussion post");
          setSubmitting(false);
          return;
        }
        
        if (createResult?.discussionPostId) {
          currentDiscussionId = createResult.discussionPostId;
          setDiscussionPostId(currentDiscussionId);
          onDiscussionCreated?.(currentDiscussionId);
        } else {
          toast.error("Failed to create discussion post");
          setSubmitting(false);
          return;
        }
      }

      // Insert comment into discussion_comments (not daily_fortune_comments)
      const { error } = await supabase.from("discussion_comments").insert({
        post_id: currentDiscussionId,
        author_id: user.id,
        content: newComment.trim(),
        approval_status: "approved", // Fortune comments are auto-approved
      });

      if (error) throw error;

      setNewComment("");
      setShowVoiceInput(false);
      toast.success("Comment added!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("discussion_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setNewComment((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Comment input */}
      {isAuthenticated ? (
        <div className="space-y-2">
          {showVoiceInput ? (
            <div className="space-y-2">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                placeholder="Tap the microphone and speak your comment..."
                showTranscript={true}
                autoStop={true}
                silenceStopSeconds={15}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVoiceInput(false)}
                >
                  Type instead
                </Button>
                {newComment.trim() && (
                  <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-1">Send</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  className="shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowVoiceInput(true)}
                  className="shrink-0"
                  title="Use voice input"
                >
                  <Mic className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Sign in to leave a comment
        </p>
      )}

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-2 p-2 rounded-lg bg-muted/50"
            >
              <AvatarDisplay
                profileAvatarId={comment.profile?.profile_avatar_id}
                displayName={comment.profile?.display_name || "User"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {comment.profile?.display_name || "User"}
                  </span>
                  <div className="flex items-center gap-1">
                    <TextToSpeech text={comment.content} size="icon" />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {user?.id === comment.author_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to share!
        </p>
      )}
    </div>
  );
}
