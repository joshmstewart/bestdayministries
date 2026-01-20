import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, Share2, Music, Palette, Image, MessageSquare, 
  FolderOpen, Trophy, Play, Square, ExternalLink,
  Calendar, HandHeart, Dumbbell, ChefHat, GlassWater, Laugh
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBeatLoopPlayer } from "@/hooks/useBeatLoopPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { FeedItemDialog } from "./FeedItemDialog";

export interface FeedItemData {
  id: string;
  item_type: 'beat' | 'card' | 'coloring' | 'post' | 'album' | 'chore_art' | 'event' | 'prayer' | 'workout' | 'recipe' | 'drink' | 'joke';
  title: string;
  description: string | null;
  author_id: string;
  created_at: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number | null;
  author_name?: string;
  author_avatar?: number;
  extra_data?: any;
}

interface FeedItemProps {
  item: FeedItemData;
  onLike?: (itemId: string, itemType: string) => void;
  onSave?: (itemId: string, itemType: string) => void;
  onRefresh?: () => void;
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; routeBase: string; idParam: string }> = {
  beat: { label: "Beat", icon: Music, color: "bg-purple-500/10 text-purple-500 border-purple-500/20", routeBase: "/games/beat-pad", idParam: "id" },
  card: { label: "Card", icon: Image, color: "bg-pink-500/10 text-pink-500 border-pink-500/20", routeBase: "/games/card-creator", idParam: "id" },
  coloring: { label: "Coloring", icon: Palette, color: "bg-orange-500/10 text-orange-500 border-orange-500/20", routeBase: "/games/coloring-book", idParam: "id" },
  post: { label: "Post", icon: MessageSquare, color: "bg-blue-500/10 text-blue-500 border-blue-500/20", routeBase: "/discussions", idParam: "post" },
  album: { label: "Album", icon: FolderOpen, color: "bg-green-500/10 text-green-500 border-green-500/20", routeBase: "/gallery", idParam: "album" },
  chore_art: { label: "Chore Art", icon: Trophy, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", routeBase: "/games/chore-challenge", idParam: "gallery" },
  event: { label: "Event", icon: Calendar, color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", routeBase: "/events", idParam: "event" },
  prayer: { label: "Prayer", icon: HandHeart, color: "bg-rose-500/10 text-rose-500 border-rose-500/20", routeBase: "/prayer-requests", idParam: "id" },
  workout: { label: "Workout", icon: Dumbbell, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", routeBase: "/workout-tracker", idParam: "image" },
  recipe: { label: "Recipe", icon: ChefHat, color: "bg-amber-500/10 text-amber-500 border-amber-500/20", routeBase: "/games/recipe-gallery", idParam: "recipe" },
  drink: { label: "Drink", icon: GlassWater, color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", routeBase: "/games/drink-creator", idParam: "drink" },
  joke: { label: "Joke", icon: Laugh, color: "bg-lime-500/10 text-lime-500 border-lime-500/20", routeBase: "/games/joke-generator", idParam: "joke" },
};

const getItemRoute = (itemType: string, itemId: string) => {
  const config = typeConfig[itemType];
  if (!config) return "#";

  const params = new URLSearchParams();
  params.set(config.idParam, itemId);

  if (itemType === "beat" || itemType === "coloring" || itemType === "card") {
    params.set("tab", "community");
  }

  return `${config.routeBase}?${params.toString()}`;
};

export function FeedItem({ item, onLike, onSave, onRefresh }: FeedItemProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();

  const isOwner = user?.id === item.author_id;
  const config = typeConfig[item.item_type] || typeConfig.post;
  const Icon = config.icon;

  // Check if user already liked this item
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) return;
      
      try {
        let data = null;
        
        switch (item.item_type) {
          case 'beat': {
            const result = await supabase
              .from('beat_pad_likes')
              .select('id')
              .eq('creation_id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();
            data = result.data;
            break;
          }
          case 'coloring': {
            const result = await supabase
              .from('coloring_likes')
              .select('id')
              .eq('coloring_id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();
            data = result.data;
            break;
          }
          case 'card': {
            const result = await supabase
              .from('card_likes')
              .select('id')
              .eq('card_id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();
            data = result.data;
            break;
          }
          default:
            return;
        }
        
        setIsLiked(!!data);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    
    checkLikeStatus();
  }, [user, item.id, item.item_type]);

  const handleLike = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to like");
      return;
    }

    try {
      switch (item.item_type) {
        case 'beat': {
          if (isLiked) {
            await supabase.from('beat_pad_likes').delete().eq('creation_id', item.id).eq('user_id', user.id);
            await supabase.from('beat_pad_creations').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', item.id);
          } else {
            await supabase.from('beat_pad_likes').insert({ creation_id: item.id, user_id: user.id });
            await supabase.from('beat_pad_creations').update({ likes_count: likesCount + 1 }).eq('id', item.id);
          }
          break;
        }
        case 'coloring': {
          if (isLiked) {
            await supabase.from('coloring_likes').delete().eq('coloring_id', item.id).eq('user_id', user.id);
            await supabase.from('user_colorings').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', item.id);
          } else {
            await supabase.from('coloring_likes').insert({ coloring_id: item.id, user_id: user.id });
            await supabase.from('user_colorings').update({ likes_count: likesCount + 1 }).eq('id', item.id);
          }
          break;
        }
        case 'card': {
          if (isLiked) {
            await supabase.from('card_likes').delete().eq('card_id', item.id).eq('user_id', user.id);
            await supabase.from('user_cards').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', item.id);
          } else {
            await supabase.from('card_likes').insert({ card_id: item.id, user_id: user.id });
            await supabase.from('user_cards').update({ likes_count: likesCount + 1 }).eq('id', item.id);
          }
          break;
        }
        default:
          onLike?.(item.id, item.item_type);
          return;
      }
      
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
    } catch (error: any) {
      toast.error(error.message || "Failed to update like");
    }
  };

  const handleUnshare = async () => {
    if (!user || !isOwner) return;
    
    try {
      switch (item.item_type) {
        case 'beat': {
          const { error } = await supabase
            .from('beat_pad_creations')
            .update({ is_public: false })
            .eq('id', item.id);
          if (error) throw error;
          break;
        }
        case 'coloring': {
          const { error } = await supabase
            .from('user_colorings')
            .update({ is_public: false })
            .eq('id', item.id);
          if (error) throw error;
          break;
        }
        case 'card': {
          const { error } = await supabase
            .from('user_cards')
            .update({ is_public: false })
            .eq('id', item.id);
          if (error) throw error;
          break;
        }
        case 'chore_art': {
          const { error } = await supabase
            .from('chore_challenge_gallery')
            .delete()
            .eq('id', item.id);
          if (error) throw error;
          break;
        }
        default:
          toast.error("Cannot unshare this type of content");
          return;
      }
      
      toast.success("Removed from community - now private");
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to unshare");
    }
  };

  const handlePlayBeat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (item.item_type !== 'beat' || !item.extra_data?.pattern) return;
    
    if (isPlaying(item.id)) {
      stopBeat();
    } else {
      playBeat(item.id, item.extra_data.pattern, item.extra_data.tempo || 120);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
  const isBeatPlaying = item.item_type === 'beat' && isPlaying(item.id);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-card border-border">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage 
                  src={item.author_avatar ? `/avatars/composite-${item.author_avatar}.png` : undefined} 
                  alt={item.author_name || "User"} 
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
              {isOwner && (
                <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                  Yours
                </Badge>
              )}
              <Badge variant="outline" className={cn("gap-1 text-xs", config.color)}>
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Image - clicking opens dialog */}
          <div 
            className="cursor-pointer"
            onClick={() => setDialogOpen(true)}
          >
            {item.image_url ? (
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Beat play overlay */}
                {item.item_type === 'beat' && item.extra_data?.pattern && (
                  <button
                    onClick={handlePlayBeat}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center",
                      isBeatPlaying ? "bg-primary" : "bg-primary/80"
                    )}>
                      {isBeatPlaying ? (
                        <Square className="h-6 w-6 text-primary-foreground" />
                      ) : (
                        <Play className="h-6 w-6 text-primary-foreground ml-1" />
                      )}
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Icon className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <h3 
                className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 flex-1 cursor-pointer"
                onClick={() => setDialogOpen(true)}
              >
                {item.title}
              </h3>
              <TextToSpeech 
                text={`${item.title}${item.description ? `. ${item.description}` : ''}`} 
                size="sm"
              />
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Action buttons row */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                {/* Play button for beats */}
                {item.item_type === 'beat' && item.extra_data?.pattern && (
                  <Button
                    variant={isBeatPlaying ? "default" : "ghost"}
                    size="sm"
                    onClick={handlePlayBeat}
                    className="h-8"
                  >
                    {isBeatPlaying ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                {/* Like button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className="h-8 gap-1"
                >
                  <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
                  <span className="text-xs">{likesCount}</span>
                </Button>

                {/* Share button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${getItemRoute(item.item_type, item.id)}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: item.title, url });
                      } catch {}
                    } else {
                      await navigator.clipboard.writeText(url);
                      toast.success("Link copied!");
                    }
                  }}
                  className="h-8"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Open in app button */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1"
              >
                <Link to={getItemRoute(item.item_type, item.id)}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-xs">Open</span>
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <FeedItemDialog
        item={item}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        isLiked={isLiked}
        likesCount={likesCount}
        onToggleLike={handleLike}
        onUnshare={handleUnshare}
        onRefresh={onRefresh}
        routeBase={config.routeBase}
        idParam={config.idParam}
      />
    </>
  );
}