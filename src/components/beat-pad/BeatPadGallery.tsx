import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Play, Square, Loader2, Music, Copy, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBeatLoopPlayer } from '@/hooks/useBeatLoopPlayer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SortOption = 'newest' | 'liked' | 'played';

interface BeatCreation {
  id: string;
  name: string;
  pattern: Record<string, boolean[]>;
  tempo: number;
  likes_count: number;
  plays_count: number;
  creator_id: string;
  created_at: string;
  image_url?: string | null;
  instrument_order?: string[] | null;
  profiles?: {
    display_name: string | null;
    avatar_number: number | null;
  };
}

interface Beat {
  id: string;
  name: string;
  pattern: Record<string, boolean[]>;
  tempo: number;
  image_url?: string | null;
  is_public?: boolean;
  ai_audio_url?: string | null;
  instrument_order?: string[] | null;
}

interface BeatPadGalleryProps {
  onLoadBeat: (beat: Beat) => void;
  onRemixBeat?: (beat: Beat) => void;
}

interface SoundInfo {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export const BeatPadGallery: React.FC<BeatPadGalleryProps> = ({ onLoadBeat, onRemixBeat }) => {
  const { user } = useAuth();
  const [creations, setCreations] = useState<BeatCreation[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();
  const [soundsMap, setSoundsMap] = useState<Map<string, SoundInfo>>(new Map());
  const [selectedBeat, setSelectedBeat] = useState<BeatCreation | null>(null);

  useEffect(() => {
    loadCreations();
    loadSounds();
  }, [user, sortBy]);

  const loadSounds = async () => {
    try {
      const { data } = await supabase
        .from('beat_pad_sounds')
        .select('id, name, emoji, color');
      
      if (data) {
        const map = new Map(data.map(s => [s.id, s]));
        setSoundsMap(map);
      }
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };

  const getSoundsForBeat = (pattern: Record<string, boolean[]>): SoundInfo[] => {
    const soundIds = Object.keys(pattern);
    return soundIds
      .map(id => soundsMap.get(id))
      .filter((s): s is SoundInfo => !!s);
  };

  const loadCreations = async () => {
    try {
      let query = supabase
        .from('beat_pad_creations')
        .select('id, name, pattern, tempo, likes_count, plays_count, creator_id, created_at, image_url, instrument_order')
        .eq('is_public', true);

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'liked') {
        query = query.order('likes_count', { ascending: false });
      } else if (sortBy === 'played') {
        query = query.order('plays_count', { ascending: false });
      }

      const { data, error } = await query.limit(20);

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
        pattern: creation.pattern as Record<string, boolean[]>,
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
        const { error } = await supabase
          .from('beat_pad_likes')
          .delete()
          .eq('creation_id', creationId)
          .eq('user_id', user.id);

        if (error) throw error;

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(creationId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('beat_pad_likes')
          .insert({ creation_id: creationId, user_id: user.id });

        if (error) throw error;

        setUserLikes((prev) => new Set(prev).add(creationId));
      }

      // Refresh to get updated count
      void loadCreations();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error(error?.message || 'Could not update like. Please try again.');
    }
  };

  const countActiveSteps = (pattern: Record<string, boolean[]>): number => {
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

  const selectedBeatSounds = selectedBeat ? getSoundsForBeat(selectedBeat.pattern) : [];

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="liked">Most Liked</SelectItem>
            <SelectItem value="played">Most Played</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creations.map((creation) => {
          const isOwner = user?.id === creation.creator_id;
          
          return (
            <Card key={creation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Cover image or pattern preview */}
              <div>
                {creation.image_url ? (
                  <div className="aspect-square w-full overflow-hidden">
                    <img 
                      src={`${creation.image_url}?t=${Date.now()}`} 
                      alt={creation.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full bg-muted p-3 flex flex-col gap-0.5 overflow-hidden">
                    {Object.entries(creation.pattern).slice(0, 6).map(([instrument, steps]) => (
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
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
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

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <span>{countActiveSteps(creation.pattern)} notes • {creation.plays_count || 0} loop plays</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={isPlaying(creation.id) ? "default" : "outline"}
                    size="icon"
                    onClick={() => playBeat(creation.id, creation.pattern, creation.tempo)}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    {isPlaying(creation.id) ? (
                      <Square className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedBeat(creation)}
                    className="h-10 w-10 flex-shrink-0"
                    title="View sounds used"
                  >
                    <Info className="h-5 w-5" />
                  </Button>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => {
                        stopBeat();
                        onLoadBeat({
                          id: creation.id,
                          name: creation.name,
                          pattern: creation.pattern,
                          tempo: creation.tempo,
                          image_url: creation.image_url,
                          is_public: true,
                          instrument_order: creation.instrument_order,
                        });
                      }}
                    >
                      Load
                    </Button>
                  )}
                  {onRemixBeat && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => {
                        stopBeat();
                        onRemixBeat({
                          id: creation.id,
                          name: creation.name,
                          pattern: creation.pattern,
                          tempo: creation.tempo,
                          image_url: null, // Don't copy image for remixes
                        });
                      }}
                      title="Remix this beat"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Remix
                    </Button>
                  )}
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
          );
        })}
      </div>

      {/* Sounds Info Dialog */}
      <Dialog open={!!selectedBeat} onOpenChange={() => setSelectedBeat(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Sounds in "{selectedBeat?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 [-webkit-overflow-scrolling:touch]">
            {selectedBeatSounds.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {selectedBeatSounds.map((sound) => (
                  <div
                    key={sound.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 p-2"
                    title={sound.name}
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: sound.color }}
                    >
                      {sound.emoji}
                    </div>
                    <span className="text-sm font-medium truncate">{sound.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">
                No sound information available for this beat.
              </p>
            )}
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            <p>{selectedBeat?.tempo} BPM • {selectedBeat ? countActiveSteps(selectedBeat.pattern) : 0} notes</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BeatPadGallery;
