import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Play, Loader2, Music } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InstrumentType } from '@/hooks/useBeatPadAudio';

interface BeatCreation {
  id: string;
  name: string;
  pattern: Record<InstrumentType, boolean[]>;
  tempo: number;
  likes_count: number;
  creator_id: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_number: number | null;
  };
}

interface BeatPadGalleryProps {
  onLoadBeat: (pattern: Record<InstrumentType, boolean[]>, tempo: number) => void;
}

export const BeatPadGallery: React.FC<BeatPadGalleryProps> = ({ onLoadBeat }) => {
  const { user } = useAuth();
  const [creations, setCreations] = useState<BeatCreation[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreations();
  }, [user]);

  const loadCreations = async () => {
    try {
      const { data, error } = await supabase
        .from('beat_pad_creations')
        .select('id, name, pattern, tempo, likes_count, creator_id, created_at')
        .eq('is_public', true)
        .order('likes_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Get creator profiles separately
      const creatorIds = [...new Set((data || []).map(c => c.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_number')
        .in('id', creatorIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      // Cast the pattern from Json to the correct type
      const typedCreations = (data || []).map(creation => ({
        ...creation,
        pattern: creation.pattern as Record<InstrumentType, boolean[]>,
        profiles: profileMap.get(creation.creator_id) as { display_name: string | null; avatar_number: number | null } | undefined
      }));
      
      setCreations(typedCreations);

      // Load user likes
      if (user) {
        const { data: likes } = await supabase
          .from('beat_pad_likes')
          .select('creation_id')
          .eq('user_id', user.id);
        
        setUserLikes(new Set(likes?.map(l => l.creation_id) || []));
      }
    } catch (error) {
      console.error('Error loading creations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (creationId: string) => {
    if (!user) {
      toast.error('Sign in to like beats!');
      return;
    }

    const isLiked = userLikes.has(creationId);

    try {
      if (isLiked) {
        await supabase
          .from('beat_pad_likes')
          .delete()
          .eq('creation_id', creationId)
          .eq('user_id', user.id);
        
        setUserLikes(prev => {
          const next = new Set(prev);
          next.delete(creationId);
          return next;
        });
      } else {
        await supabase
          .from('beat_pad_likes')
          .insert({ creation_id: creationId, user_id: user.id });
        
        setUserLikes(prev => new Set(prev).add(creationId));
      }

      // Refresh to get updated count
      loadCreations();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const countActiveSteps = (pattern: Record<InstrumentType, boolean[]>): number => {
    return Object.values(pattern).reduce((total, steps) => {
      return total + steps.filter(Boolean).length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (creations.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Shared Beats Yet</h3>
        <p className="text-muted-foreground">Be the first to share your creation!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creations.map((creation) => (
        <Card key={creation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold truncate">{creation.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {creation.profiles?.display_name || 'Anonymous'}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {creation.tempo} BPM
              </div>
            </div>

            {/* Visual pattern preview */}
            <div className="bg-muted rounded-lg p-2 mb-3 h-20 flex flex-col gap-0.5 overflow-hidden">
              {Object.entries(creation.pattern).slice(0, 4).map(([instrument, steps]) => (
                <div key={instrument} className="flex gap-0.5 flex-1">
                  {(steps as boolean[]).map((active, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm",
                        active ? "bg-primary" : "bg-background/50"
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span>{countActiveSteps(creation.pattern)} notes</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onLoadBeat(creation.pattern, creation.tempo)}
              >
                <Play className="h-4 w-4 mr-1" />
                Load
              </Button>
              <Button
                variant={userLikes.has(creation.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleLike(creation.id)}
              >
                <Heart className={cn("h-4 w-4 mr-1", userLikes.has(creation.id) && "fill-current")} />
                {creation.likes_count}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BeatPadGallery;
