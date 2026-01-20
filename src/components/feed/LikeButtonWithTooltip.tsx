import { useState, useCallback } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LikerInfo {
  id: string;
  display_name: string | null;
}

interface LikeButtonWithTooltipProps {
  itemId: string;
  itemType: string;
  isLiked: boolean;
  likesCount: number;
  onLike: (e?: React.MouseEvent) => void;
  disabled?: boolean;
}

export function LikeButtonWithTooltip({
  itemId,
  itemType,
  isLiked,
  likesCount,
  onLike,
  disabled,
}: LikeButtonWithTooltipProps) {
  const [likers, setLikers] = useState<LikerInfo[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchLikers = useCallback(async () => {
    if (likesCount === 0 || hasFetched) return;
    
    setLoadingLikers(true);
    try {
      let userIds: string[] = [];

      // Get user IDs from the appropriate likes table
      switch (itemType) {
        case 'beat': {
          const { data } = await supabase
            .from('beat_pad_likes')
            .select('user_id')
            .eq('creation_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
        case 'coloring': {
          const { data } = await supabase
            .from('coloring_likes')
            .select('user_id')
            .eq('coloring_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
        case 'card': {
          const { data } = await supabase
            .from('card_likes')
            .select('user_id')
            .eq('card_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
        case 'drink': {
          const { data } = await supabase
            .from('custom_drink_likes')
            .select('user_id')
            .eq('drink_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
        case 'joke': {
          const { data } = await supabase
            .from('joke_likes')
            .select('user_id')
            .eq('joke_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
        case 'workout': {
          const { data } = await supabase
            .from('workout_image_likes')
            .select('user_id')
            .eq('image_id', itemId)
            .limit(10);
          userIds = data?.map(d => d.user_id) || [];
          break;
        }
      }

      if (userIds.length > 0) {
        // Fetch public profile names (safe for tooltip)
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('id, display_name')
          .in('id', userIds);

        if (profiles) {
          setLikers(profiles);
        }
      }
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching likers:', error);
    } finally {
      setLoadingLikers(false);
    }
  }, [itemId, itemType, likesCount, hasFetched]);

  // Reset fetched state when likes count changes
  const handleOpenChange = (open: boolean) => {
    if (open && likesCount > 0) {
      fetchLikers();
    }
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="sm"
      onClick={onLike}
      disabled={disabled}
      className="gap-1.5 px-2"
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          isLiked && "fill-red-500 text-red-500"
        )}
      />
      <span className="text-sm text-foreground">{likesCount}</span>
    </Button>
  );

  // Only show hover card if there are likes
  if (likesCount === 0) {
    return buttonContent;
  }

  return (
    <HoverCard openDelay={300} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        {buttonContent}
      </HoverCardTrigger>
      <HoverCardContent className="w-auto min-w-[120px] max-w-[200px] p-2" side="top">
        {loadingLikers ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : likers.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Liked by</p>
            {likers.map((liker) => (
              <p key={liker.id} className="text-sm truncate">
                {liker.display_name || "Community Member"}
              </p>
            ))}
            {likesCount > likers.length && (
              <p className="text-xs text-muted-foreground">
                +{likesCount - likers.length} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No likes yet</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
