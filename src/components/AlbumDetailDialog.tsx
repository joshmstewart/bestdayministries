import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  MessageSquare,
  Trash2,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

export interface AlbumMedia {
  image_url?: string | null;
  video_url?: string | null;
  video_type?: string | null;
  youtube_url?: string | null;
  caption?: string | null;
}

interface AlbumComment {
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

interface AlbumDetailDialogProps {
  albumId: string | null;
  albumTitle?: string;
  images: AlbumMedia[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AlbumDetailDialog({
  albumId,
  albumTitle,
  images,
  isOpen,
  onClose,
}: AlbumDetailDialogProps) {
  const { user, isAdmin } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comments, setComments] = useState<AlbumComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    if (!albumId) return;
    setLoadingComments(true);
    const { data, error } = await supabase
      .from("album_comments")
      .select(
        "id, content, created_at, author_id, author:profiles_public!album_comments_author_id_fkey(display_name, avatar_number, profile_avatar_id)"
      )
      .eq("album_id", albumId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(
        data.map((c: any) => ({
          ...c,
          author: Array.isArray(c.author) ? c.author[0] : c.author,
        }))
      );
    }
    setLoadingComments(false);
  }, [albumId]);

  useEffect(() => {
    if (isOpen && albumId) {
      setCurrentIndex(0);
      loadComments();
    }
  }, [isOpen, albumId, loadComments]);

  // Realtime subscription
  useEffect(() => {
    if (!isOpen || !albumId) return;

    const channel = supabase
      .channel(`album-comments-${albumId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "album_comments",
          filter: `album_id=eq.${albumId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, albumId, loadComments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSubmitComment = async () => {
    if (!user || !albumId || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("album_comments").insert({
      album_id: albumId,
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

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("album_comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      toast.error("Failed to delete comment");
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-4xl !max-h-[90vh] !h-[90vh] p-0 overflow-hidden !flex !flex-col"
        hideCloseButton
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-bold text-lg line-clamp-1">
            {albumTitle || "Album"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body: Image + Comments */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
          {/* Image carousel section */}
          <div className="relative flex items-center justify-center bg-black md:flex-1 min-h-[200px] max-h-[60vh] md:max-h-none md:min-h-0 shrink-0">
            {images.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-white/50">
                <ImageIcon className="w-12 h-12" />
                <span className="text-sm">No media</span>
              </div>
            ) : (
              <>
                {currentImage?.video_type === 'youtube' && currentImage?.youtube_url ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-hidden">
                    <div className="w-full max-h-full">
                      <YouTubeEmbed url={currentImage.youtube_url} />
                    </div>
                  </div>
                ) : currentImage?.video_type === 'upload' && currentImage?.video_url ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <video
                      src={currentImage.video_url}
                      controls
                      playsInline
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={currentImage?.image_url || ''}
                      alt={currentImage?.caption || `Image ${currentIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}

                {/* Navigation */}
                {images.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black/90 text-white hover:text-white border border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black/90 text-white hover:text-white border border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      onClick={goToNext}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>

                    <div className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full text-xs pointer-events-none">
                      {currentIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Caption */}
                {currentImage?.caption && (
                  <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                      {currentImage.caption}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Comments section */}
          <div className="flex flex-col md:w-[320px] lg:w-[360px] border-t md:border-t-0 md:border-l border-border min-h-0 flex-1 md:flex-none md:h-full">
            {/* Comments header */}
            <div className="px-4 py-2 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Album Comments ({comments.length})
              </h3>
            </div>

            {/* Comments list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-3">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="group flex gap-2 text-sm"
                    >
                      <AvatarDisplay
                        profileAvatarId={comment.author?.profile_avatar_id}
                        displayName={comment.author?.display_name || "User"}
                        size="sm"
                        className="shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-xs">
                            {comment.author?.display_name || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(comment.created_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {comment.content}
                        </p>
                      </div>
                      {(comment.author_id === user?.id || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>

            {/* Comment input */}
            {user ? (
              <div className="p-3 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[36px] max-h-[80px] text-sm resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    className="shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 border-t border-border text-center text-xs text-muted-foreground shrink-0">
                Sign in to comment
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
