import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  Heart, Music, Palette, Image, MessageSquare, 
  FolderOpen, Trophy, Play, Square, ArrowRight,
  Calendar, HandHeart, Dumbbell, ChefHat, GlassWater, Laugh, Eye, EyeOff, Repeat2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBeatLoopPlayer } from "@/hooks/useBeatLoopPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { FeedItemDialog } from "./FeedItemDialog";
import { useFeedRepost } from "@/hooks/useFeedRepost";
import { LikeButtonWithTooltip } from "./LikeButtonWithTooltip";

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
  repost_id?: string | null;
}

interface FeedItemProps {
  item: FeedItemData;
  onLike?: (itemId: string, itemType: string) => void;
  onSave?: (itemId: string, itemType: string) => void;
  onRefresh?: () => void;
  isLikedInitial?: boolean;
  onLikeChange?: (liked: boolean) => void;
}

const typeConfig: Record<string, { label: string; appName: string; icon: React.ElementType; color: string; buttonColor: string; routeBase: string; idParam: string }> = {
  beat: { label: "Beat", appName: "Beat Pad", icon: Music, color: "bg-purple-500/10 text-purple-500 border-purple-500/20", buttonColor: "bg-purple-500 hover:bg-purple-600 text-white", routeBase: "/games/beat-pad", idParam: "id" },
  card: { label: "Card", appName: "Card Creator", icon: Image, color: "bg-pink-500/10 text-pink-500 border-pink-500/20", buttonColor: "bg-pink-500 hover:bg-pink-600 text-white", routeBase: "/games/card-creator", idParam: "id" },
  coloring: { label: "Coloring", appName: "Coloring Book", icon: Palette, color: "bg-orange-500/10 text-orange-500 border-orange-500/20", buttonColor: "bg-orange-500 hover:bg-orange-600 text-white", routeBase: "/games/coloring-book", idParam: "id" },
  post: { label: "Post", appName: "Discussions", icon: MessageSquare, color: "bg-blue-500/10 text-blue-500 border-blue-500/20", buttonColor: "bg-blue-500 hover:bg-blue-600 text-white", routeBase: "/discussions", idParam: "post" },
  album: { label: "Album", appName: "Gallery", icon: FolderOpen, color: "bg-green-500/10 text-green-500 border-green-500/20", buttonColor: "bg-green-500 hover:bg-green-600 text-white", routeBase: "/gallery", idParam: "album" },
  chore_art: { label: "Chore Art", appName: "Chore Challenge", icon: Trophy, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", buttonColor: "bg-yellow-500 hover:bg-yellow-600 text-white", routeBase: "/games/chore-challenge", idParam: "gallery" },
  event: { label: "Event", appName: "Events", icon: Calendar, color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", buttonColor: "bg-indigo-500 hover:bg-indigo-600 text-white", routeBase: "/events", idParam: "event" },
  prayer: { label: "Prayer", appName: "Prayers", icon: HandHeart, color: "bg-rose-500/10 text-rose-500 border-rose-500/20", buttonColor: "bg-rose-500 hover:bg-rose-600 text-white", routeBase: "/prayer-requests", idParam: "id" },
  workout: { label: "Workout", appName: "Workout Tracker", icon: Dumbbell, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", buttonColor: "bg-emerald-500 hover:bg-emerald-600 text-white", routeBase: "/workout-tracker", idParam: "image" },
  recipe: { label: "Recipe", appName: "Recipe Gallery", icon: ChefHat, color: "bg-amber-500/10 text-amber-500 border-amber-500/20", buttonColor: "bg-amber-500 hover:bg-amber-600 text-white", routeBase: "/games/recipe-gallery", idParam: "recipe" },
  drink: { label: "Drink", appName: "Drink Creator", icon: GlassWater, color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", buttonColor: "bg-cyan-500 hover:bg-cyan-600 text-white", routeBase: "/games/drink-creator", idParam: "drink" },
  joke: { label: "Joke", appName: "Joke Generator", icon: Laugh, color: "bg-lime-500/10 text-lime-500 border-lime-500/20", buttonColor: "bg-lime-500 hover:bg-lime-600 text-white", routeBase: "/games/jokes", idParam: "joke" },
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

export function FeedItem({ item, onLike, onSave, onRefresh, isLikedInitial, onLikeChange }: FeedItemProps) {
  const { user, isAdmin } = useAuth();
  const [isLiked, setIsLiked] = useState(isLikedInitial ?? false);
  const [likesCount, setLikesCount] = useState(item.likes_count || 0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();
  const { repostToFeed, removeRepost, isReposting } = useFeedRepost();

  const isOwner = user?.id === item.author_id;
  const isRepost = item.extra_data?.is_repost === true;
  const config = typeConfig[item.item_type] || typeConfig.post;
  const Icon = config.icon;

  // Sync with parent-provided like status when it changes
  useEffect(() => {
    if (isLikedInitial !== undefined) {
      setIsLiked(isLikedInitial);
    }
  }, [isLikedInitial]);

  // Individual like status check - only runs if isLikedInitial is not provided (fallback)
  useEffect(() => {
    // Skip if batch like status is provided from parent
    if (isLikedInitial !== undefined) return;
    
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
          case 'drink': {
            const result = await supabase
              .from('custom_drink_likes')
              .select('id')
              .eq('drink_id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();
            data = result.data;
            break;
          }
          case 'joke': {
            const result = await supabase
              .from('joke_likes')
              .select('id')
              .eq('joke_id', item.id)
              .eq('user_id', user.id)
              .maybeSingle();
            data = result.data;
            break;
          }
          case 'workout': {
            const result = await supabase
              .from('workout_image_likes')
              .select('id')
              .eq('image_id', item.id)
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
  }, [user, item.id, item.item_type, isLikedInitial]);

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
        case 'drink': {
          if (isLiked) {
            await supabase.from('custom_drink_likes').delete().eq('drink_id', item.id).eq('user_id', user.id);
            await supabase.from('custom_drinks').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', item.id);
          } else {
            await supabase.from('custom_drink_likes').insert({ drink_id: item.id, user_id: user.id });
            await supabase.from('custom_drinks').update({ likes_count: likesCount + 1 }).eq('id', item.id);
          }
          break;
        }
        case 'joke': {
          if (isLiked) {
            await supabase.from('joke_likes').delete().eq('joke_id', item.id).eq('user_id', user.id);
            // likes_count is updated by database trigger
          } else {
            await supabase.from('joke_likes').insert({ joke_id: item.id, user_id: user.id });
            // likes_count is updated by database trigger
          }
          break;
        }
        case 'workout': {
          if (isLiked) {
            await supabase.from('workout_image_likes').delete().eq('image_id', item.id).eq('user_id', user.id);
            await supabase.from('workout_generated_images').update({ likes_count: Math.max(0, likesCount - 1) }).eq('id', item.id);
          } else {
            await supabase.from('workout_image_likes').insert({ image_id: item.id, user_id: user.id });
            await supabase.from('workout_generated_images').update({ likes_count: likesCount + 1 }).eq('id', item.id);
          }
          break;
        }
        default:
          onLike?.(item.id, item.item_type);
          return;
      }
      
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
      onLikeChange?.(newLikedState);
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
              <AvatarDisplay 
                avatarNumber={item.author_avatar || null} 
                displayName={item.author_name || "User"}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm">
                  {item.author_name || "Community Member"}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isRepost && (
                <Badge variant="outline" className="gap-1 text-xs bg-muted text-muted-foreground border-muted-foreground/20">
                  <Repeat2 className="h-3 w-3" />
                  Repost
                </Badge>
              )}
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

          {/* Image or Joke Display - clicking opens dialog */}
          <div 
            className="cursor-pointer"
            onClick={() => setDialogOpen(true)}
          >
            {/* Special display for jokes */}
            {item.item_type === 'joke' && item.extra_data?.question ? (
              <div className="p-6 py-8 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30">
                <div className="space-y-5">
                  <div className="flex items-center justify-center gap-2 py-2">
                    <p className="text-lg font-medium text-center">{item.extra_data.question}</p>
                    <TextToSpeech text={item.extra_data.question} size="icon" />
                  </div>
                  
                  {!showAnswer ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAnswer(true);
                      }}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Reveal Answer
                    </Button>
                  ) : (
                    <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-4 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-lg font-semibold text-center">{item.extra_data.answer}</p>
                        <TextToSpeech text={item.extra_data.answer} size="icon" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : item.image_url ? (
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
            ) : item.item_type === 'prayer' ? (
              // Prayer display with icon and content on gradient
              <div className="py-8 px-5 bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20">
                <div className="flex flex-col items-center gap-4">
                  <Icon className="h-10 w-10 text-rose-400 mt-2" />
                  {(item.description || item.title) && (
                    <p className="text-center text-foreground/80 line-clamp-4 text-base leading-relaxed mb-4">
                      {item.description || item.title}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Icon className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content - hide for jokes since it's displayed above */}
          {item.item_type !== 'joke' && (
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
              {item.description && item.item_type !== 'prayer' && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          )}

          {/* Action buttons row */}
          <div className="flex items-center justify-between p-3 pt-2 border-t border-border">
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
              
              {/* Like button with tooltip showing who liked */}
              <LikeButtonWithTooltip
                itemId={item.id}
                itemType={item.item_type}
                isLiked={isLiked}
                likesCount={likesCount}
                onLike={handleLike}
              />

              {/* Unshare button for owner */}
              {isOwner && ['beat', 'coloring', 'card', 'chore_art'].includes(item.item_type) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnshare}
                  className="h-8 gap-1 text-muted-foreground hover:text-destructive"
                  title="Remove from community feed"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              )}

              {/* Repost button for admins on events */}
              {isAdmin && item.item_type === 'event' && !isRepost && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const success = await repostToFeed('event', item.id);
                    if (success) onRefresh?.();
                  }}
                  disabled={isReposting}
                  className="h-8 gap-1 text-muted-foreground hover:text-primary"
                  title="Repost to top of feed"
                >
                  <Repeat2 className="h-4 w-4" />
                </Button>
              )}

              {/* Remove repost button for admins */}
              {isAdmin && isRepost && item.repost_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const success = await removeRepost(item.repost_id!);
                    if (success) onRefresh?.();
                  }}
                  disabled={isReposting}
                  className="h-8 gap-1 text-destructive hover:text-destructive"
                  title="Remove this repost"
                >
                  <Repeat2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Open in app button */}
            <Button
              size="sm"
              asChild
              className={cn("h-8 gap-1.5 border-0", config.buttonColor)}
            >
              <Link to={getItemRoute(item.item_type, item.id)}>
                <span className="text-xs font-medium">{config.appName}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
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