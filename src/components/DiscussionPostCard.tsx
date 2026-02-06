import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { MessageSquare, Calendar, Image as ImageIcon, UserCircle2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { VendorStoreLinkBadge } from "@/components/VendorStoreLinkBadge";

interface Author {
  id: string;
  display_name: string;
  role?: string;
  avatar_number?: number;
  profile_avatar_id?: string;
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
}

interface DiscussionPostCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    author_id: string;
    image_url?: string | null;
    approval_status?: string;
    author?: Author;
    comments?: any[];
    event?: Event;
    album?: Album;
    video?: any;
    youtube_url?: string | null;
  };
  onClick: () => void;
}

export const DiscussionPostCard = ({ post, onClick }: DiscussionPostCardProps) => {
  const getRoleDisplay = (role: string) => {
    if (role === "caregiver") return "Guardian";
    return role;
  };

  const hasMedia = post.image_url || post.video || post.youtube_url || post.album;
  const commentCount = post.comments?.length || 0;
  
  // Truncate content to preview length
  const previewLength = 200;
  const contentPreview = post.content.length > previewLength 
    ? post.content.substring(0, previewLength) + '...' 
    : post.content;

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Media Preview */}
          {hasMedia && (
            <div className="md:w-72 flex-shrink-0 max-h-96 overflow-hidden">
              <AspectRatio 
                ratio={(() => {
                  const ratio = (post as any).aspect_ratio || '16:9';
                  const [w, h] = ratio.split(':').map(Number);
                  return w / h;
                })()} 
                className="bg-muted overflow-hidden"
              >
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : post.album?.cover_image_url ? (
                  <img 
                    src={post.album.cover_image_url} 
                    alt={post.album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (post.video || post.youtube_url) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-primary">Video Content</p>
                    </div>
                  </div>
                ) : null}
              </AspectRatio>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <AvatarDisplay 
                profileAvatarId={post.author?.profile_avatar_id}
                displayName={post.author?.display_name || "Unknown"}
                size="sm"
              />
              <div className="flex-1 min-w-0">
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
                  </span>
                  {post.approval_status === 'pending_approval' && (
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            {/* Content Preview */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
              {contentPreview}
            </p>

            {/* Linked Event */}
            {post.event && (
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{post.event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Linked Album */}
            {post.album && !post.image_url && (
              <div className="mb-4 p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="w-4 h-4 text-secondary flex-shrink-0" />
                  <p className="font-medium text-foreground truncate">{post.album.title}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 mt-auto pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Read More →
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
