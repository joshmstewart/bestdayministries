import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { TextToSpeech } from "@/components/TextToSpeech";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import AudioPlayer from "@/components/AudioPlayer";
import AudioRecorder from "@/components/AudioRecorder";
import ImageLightbox from "@/components/ImageLightbox";
import { VendorStoreLinkBadge } from "@/components/VendorStoreLinkBadge";
import { 
  Calendar, 
  MapPin, 
  Trash2, 
  Edit, 
  Mic, 
  Send,
  Image as ImageIcon,
  X,
  UserCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface Author {
  id: string;
  display_name: string;
  role?: string;
  avatar_number?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  audio_url?: string | null;
  approval_status?: string;
  author?: Author;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

interface Album {
  id: string;
  title: string;
  cover_image_url: string | null;
  is_active: boolean;
}

interface Video {
  id: string;
  title: string;
  video_url?: string;
  youtube_url?: string;
  video_type?: string;
}

interface DiscussionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    author_id: string;
    image_url?: string | null;
    video_id?: string | null;
    youtube_url?: string | null;
    approval_status?: string;
    author?: Author;
    comments?: Comment[];
    video?: Video | null;
    album?: Album;
    album_images?: Array<{
      id: string;
      image_url: string;
      caption: string | null;
      display_order: number;
    }>;
    event?: Event;
  } | null;
  onComment: (postId: string, content: string, audioBlob: Blob | null) => Promise<void>;
  onDeletePost?: (postId: string) => void;
  onDeleteComment?: (commentId: string, postId: string) => void;
  onEditComment?: (commentId: string, newContent: string) => Promise<void>;
  onEditPost?: (post: any) => void;
  canDelete?: (authorId: string) => Promise<boolean>;
  isEditablePost?: boolean;
  currentUserId?: string;
}

export const DiscussionDetailDialog = ({
  open,
  onOpenChange,
  post,
  onComment,
  onDeletePost,
  onDeleteComment,
  onEditComment,
  onEditPost,
  canDelete,
  isEditablePost,
  currentUserId,
}: DiscussionDetailDialogProps) => {
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [commentAudio, setCommentAudio] = useState<Blob | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<Array<{ id?: string; image_url: string; caption?: string | null; display_order?: number }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [canDeletePost, setCanDeletePost] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  // Check delete permission when post changes
  useEffect(() => {
    if (canDelete && post?.author_id) {
      canDelete(post.author_id).then(setCanDeletePost);
    }
  }, [canDelete, post?.author_id]);

  if (!post) return null;

  const handleCommentSubmit = async () => {
    if (!newComment.trim() && !commentAudio) return;
    
    await onComment(post.id, newComment, commentAudio);
    setNewComment("");
    setCommentAudio(null);
    setShowAudioRecorder(false);
  };

  const handleImageClick = (images: Array<{ id?: string; image_url: string; caption?: string | null; display_order?: number }>, index: number) => {
    if (images && images.length > 0) {
      setLightboxImages(images);
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const handleLightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const handleLightboxPrevious = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const getRoleDisplay = (role: string) => {
    if (role === "caregiver") return "Guardian";
    return role;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          className="max-w-4xl max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <DialogTitle className="text-2xl flex-shrink-0">{post.title}</DialogTitle>
                      <div className="flex items-center gap-2">
                        <TextToSpeech text={`${post.title}. ${post.content}`} />
                        {isEditablePost && onEditPost && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onEditPost(post);
                              onOpenChange(false);
                            }}
                            className="flex-shrink-0"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Author Info */}
                    <div className="flex items-center gap-3">
                      <AvatarDisplay 
                        avatarNumber={post.author?.avatar_number || null}
                        displayName={post.author?.display_name || "Unknown"}
                        size="sm"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {post.author?.display_name || "Unknown"}
                        </span>
                        {post.author?.role && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                            <UserCircle2 className="w-3 h-3 text-primary" />
                            <span className="text-xs font-semibold text-primary capitalize">
                              {getRoleDisplay(post.author.role)}
                            </span>
                          </div>
                        )}
                        {post.author_id && (post.author?.role === 'bestie' || post.author?.role === 'caregiver') && (
                          <VendorStoreLinkBadge userId={post.author_id} userRole={post.author?.role} variant="badge" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                          {post.updated_at && post.created_at && 
                           new Date(post.updated_at).getTime() !== new Date(post.created_at).getTime() && (
                            <span className="ml-1 italic">(edited)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canDeletePost && onDeletePost && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onDeletePost(post.id);
                          onOpenChange(false);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenChange(false)}
                      className="hover:bg-accent"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="space-y-6">
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

                {/* Image */}
                {post.image_url && (
                  <div className="rounded-lg overflow-hidden max-h-[600px] flex items-center justify-center bg-muted">
                    <img 
                      src={post.image_url} 
                      alt={post.title}
                      className="max-h-[600px] w-auto max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick([{ id: undefined, image_url: post.image_url!, caption: null, display_order: 0 }], 0)}
                    />
                  </div>
                )}

                {/* Video */}
                {(post.video || post.youtube_url) && (
                  <div className="rounded-lg overflow-hidden">
                    {post.youtube_url ? (
                      <YouTubeEmbed url={post.youtube_url} title={post.title} />
                    ) : post.video?.video_type === 'youtube' && post.video.youtube_url ? (
                      <YouTubeEmbed url={post.video.youtube_url} title={post.video.title} />
                    ) : post.video?.video_url ? (
                      <VideoPlayer src={post.video.video_url} />
                    ) : null}
                  </div>
                )}

                {/* Album Images */}
                {post.album_images && post.album_images.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Album: {post.album?.title}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/gallery#${post.album?.id}`)}
                      >
                        <ImageIcon className="w-3 h-3 mr-2" />
                        View Full Album
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {post.album_images.map((image, index) => (
                        <div 
                          key={image.id}
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(post.album_images, index)}
                        >
                          <img 
                            src={image.image_url} 
                            alt={image.caption || `Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Card */}
                {post.event && (
                  <Card 
                    className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => {
                      navigate(`/events?eventId=${post.event!.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          <Calendar className="w-10 h-10 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">Linked Event</h4>
                          <h5 className="font-bold text-lg text-foreground">{post.event.title}</h5>
                          <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(post.event.event_date).toLocaleDateString()}</span>
                            </div>
                            {post.event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{post.event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments Section */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Comments ({post.comments?.length || 0})</h3>
                  
                  {/* Comments List */}
                  <div className="space-y-4">
                    {post.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                        <AvatarDisplay 
                          avatarNumber={comment.author?.avatar_number || null}
                          displayName={comment.author?.display_name || "Unknown"}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-sm font-medium">
                              {comment.author?.display_name || "Unknown"}
                            </span>
                            {comment.author?.role && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                <UserCircle2 className="w-3 h-3 text-primary" />
                                <span className="text-xs font-semibold text-primary capitalize">
                                  {getRoleDisplay(comment.author.role)}
                                </span>
                              </div>
                            )}
                            {comment.author_id && (comment.author?.role === 'bestie' || comment.author?.role === 'caregiver') && (
                              <VendorStoreLinkBadge userId={comment.author_id} userRole={comment.author?.role} variant="badge" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                              {comment.updated_at && 
                               comment.created_at !== comment.updated_at && 
                               new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime() + 300000 && (
                                <span className="ml-1 italic">(edited)</span>
                              )}
                            </span>
                            {comment.approval_status === 'pending_approval' && (
                              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">
                                Pending
                              </Badge>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    if (onEditComment && editingCommentContent.trim()) {
                                      await onEditComment(comment.id, editingCommentContent);
                                      setEditingCommentId(null);
                                    }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentContent("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {comment.content && (
                                <div className="flex items-start gap-2">
                                  <p className="text-sm text-foreground flex-1">{comment.content}</p>
                                  <TextToSpeech text={comment.content} size="sm" />
                                </div>
                              )}
                              {comment.audio_url && (
                                <AudioPlayer src={comment.audio_url} />
                              )}
                              <div className="flex gap-2 mt-2">
                                {currentUserId === comment.author_id && comment.content && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentContent(comment.content);
                                    }}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                {onDeleteComment && canDelete && comment.author_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const canDel = await canDelete(comment.author_id);
                                      if (canDel) {
                                        onDeleteComment(comment.id, post.id);
                                      }
                                    }}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  {currentUserId && (
                    <div className="space-y-4">
                      <Label>Add a comment</Label>
                      <Textarea
                        placeholder="Share your thoughts..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Audio Recorder */}
                        {showAudioRecorder ? (
                          <div className="flex-1 space-y-2">
                            <AudioRecorder
                              onRecordingComplete={(blob) => setCommentAudio(blob)}
                              onRecordingCancel={() => {
                                setShowAudioRecorder(false);
                                setCommentAudio(null);
                              }}
                            />
                            {commentAudio && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCommentAudio(null)}
                                className="w-full"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Remove Audio
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setShowAudioRecorder(true)}
                            className="flex-1 h-11"
                          >
                            <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
                            Record Audio Comment
                          </Button>
                        )}

                        <Button 
                          onClick={handleCommentSubmit} 
                          disabled={!newComment.trim() && !commentAudio}
                          className="flex-1 h-11"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Post Comment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onNext={handleLightboxNext}
        onPrevious={handleLightboxPrevious}
      />
    </>
  );
};
