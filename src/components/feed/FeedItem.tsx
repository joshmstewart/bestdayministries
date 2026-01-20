import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Share2, Bookmark, Music, Palette, Image, MessageSquare, FolderOpen, Trophy, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FeedItemData {
  id: string;
  item_type: 'beat' | 'card' | 'coloring' | 'post' | 'album' | 'chore_art';
  title: string;
  description: string | null;
  author_id: string;
  created_at: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number | null;
  // Joined from profiles
  author_name?: string;
  author_avatar?: number;
}

interface FeedItemProps {
  item: FeedItemData;
  onLike?: (itemId: string, itemType: string) => void;
  onSave?: (itemId: string, itemType: string) => void;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; routeBase: string; idParam: string }> = {
  beat: { label: "Beat", icon: Music, color: "bg-purple-500/10 text-purple-500 border-purple-500/20", routeBase: "/games/beat-pad", idParam: "id" },
  card: { label: "Card", icon: Image, color: "bg-pink-500/10 text-pink-500 border-pink-500/20", routeBase: "/games/card-creator", idParam: "id" },
  coloring: { label: "Coloring", icon: Palette, color: "bg-orange-500/10 text-orange-500 border-orange-500/20", routeBase: "/games/coloring-book", idParam: "id" },
  post: { label: "Post", icon: MessageSquare, color: "bg-blue-500/10 text-blue-500 border-blue-500/20", routeBase: "/discussions", idParam: "post" },
  album: { label: "Album", icon: FolderOpen, color: "bg-green-500/10 text-green-500 border-green-500/20", routeBase: "/gallery", idParam: "album" },
  chore_art: { label: "Chore Art", icon: Trophy, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", routeBase: "/games/chore-challenge", idParam: "gallery" },
};

const getItemRoute = (itemType: string, itemId: string) => {
  const config = typeConfig[itemType];
  if (!config) return "#";

  const params = new URLSearchParams();
  params.set(config.idParam, itemId);

  // Feed clicks should land on the Community tab for apps that have one
  if (itemType === "beat" || itemType === "coloring") {
    params.set("tab", "community");
  }

  return `${config.routeBase}?${params.toString()}`;
};

export function FeedItem({ item, onLike, onSave }: FeedItemProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);

  const config = typeConfig[item.item_type] || typeConfig.post;
  const Icon = config.icon;

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to like");
      return;
    }

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    onLike?.(item.id, item.item_type);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to save");
      return;
    }

    setIsSaved(!isSaved);
    onSave?.(item.id, item.item_type);
    toast.success(isSaved ? "Removed from saved" : "Saved to collection");
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}${getItemRoute(item.item_type, item.id)}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-card border-border">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage 
                src={item.author_avatar ? `/avatars/composite-${item.author_avatar}.png` : undefined} 
                alt={item.author_name || "User"} 
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(item.author_name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-foreground text-sm">
                {item.author_name || "Community Member"}
              </span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSave}>
                  <Bookmark className="h-4 w-4 mr-2" />
                  {isSaved ? "Unsave" : "Save"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Image */}
        {item.image_url && (
          <Link to={getItemRoute(item.item_type, item.id)} className="block">
            <div className="relative aspect-square sm:aspect-video overflow-hidden bg-muted">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          </Link>
        )}

        {/* Content */}
        <div className="p-4 pt-3 space-y-3">
          <div>
            <Link 
              to={getItemRoute(item.item_type, item.id)}
              className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {item.title}
            </Link>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "gap-1.5 h-9 px-3",
                  isLiked && "text-red-500 hover:text-red-600"
                )}
                onClick={handleLike}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                <span className="text-sm">{likesCount}</span>
              </Button>

              {item.comments_count !== null && (
                <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-3" asChild>
                  <Link to={getItemRoute(item.item_type, item.id)}>
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{item.comments_count}</span>
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-9 px-3", isSaved && "text-primary")}
                onClick={handleSave}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
