import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Square, Trash2, Share2, Lock, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBeatLoopPlayer } from '@/hooks/useBeatLoopPlayer';

interface BeatCreation {
  id: string;
  name: string;
  pattern: Record<string, boolean[]>;
  tempo: number;
  is_public: boolean;
  created_at: string;
  image_url?: string | null;
  ai_audio_url?: string | null;
  plays_count?: number;
  instrument_order?: string[] | null;
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

interface MyBeatsProps {
  onLoadBeat: (beat: Beat) => void;
  onRemixBeat?: (beat: Beat) => void;
}

const MyBeats: React.FC<MyBeatsProps> = ({ onLoadBeat, onRemixBeat }) => {
  const { user } = useAuth();
  const [beats, setBeats] = useState<BeatCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();

  useEffect(() => {
    if (user) {
      loadMyBeats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMyBeats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('beat_pad_creations')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(beat => ({
        ...beat,
        pattern: typeof beat.pattern === 'string' 
          ? JSON.parse(beat.pattern) 
          : beat.pattern as Record<string, boolean[]>,
      }));

      setBeats(parsed);
    } catch (error) {
      console.error('Error loading beats:', error);
      toast.error('Failed to load your beats');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('beat_pad_creations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBeats(prev => prev.filter(b => b.id !== id));
      toast.success('Beat deleted');
    } catch (error) {
      console.error('Error deleting beat:', error);
      toast.error('Failed to delete beat');
    }
  };

  const handleTogglePublic = async (id: string, currentlyPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('beat_pad_creations')
        .update({ is_public: !currentlyPublic })
        .eq('id', id);

      if (error) throw error;

      setBeats(prev => prev.map(b => 
        b.id === id ? { ...b, is_public: !currentlyPublic } : b
      ));
      toast.success(currentlyPublic ? 'Beat is now private' : 'Beat shared with community! 🎉');
    } catch (error) {
      console.error('Error updating beat:', error);
      toast.error('Failed to update beat');
    }
  };

  const countActiveSteps = (pattern: Record<string, boolean[]>): number => {
    return Object.values(pattern).reduce((total, steps) => {
      return total + steps.filter(Boolean).length;
    }, 0);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sign in to see your saved beats!</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (beats.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">You haven't saved any beats yet!</p>
        <p className="text-sm text-muted-foreground">Create a beat and save it to see it here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {beats.map((beat) => (
        <Card key={beat.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          {/* Clickable cover image or pattern preview */}
          <div 
            className="cursor-pointer"
            onClick={() => {
              stopBeat();
              onLoadBeat({
                id: beat.id,
                name: beat.name,
                pattern: beat.pattern,
                tempo: beat.tempo,
                image_url: beat.image_url,
                is_public: beat.is_public,
                instrument_order: beat.instrument_order,
              });
            }}
          >
            {beat.image_url ? (
              <div className="aspect-square w-full overflow-hidden">
                <img 
                  src={`${beat.image_url}?t=${Date.now()}`} 
                  alt={beat.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square w-full bg-muted p-3 flex flex-col gap-0.5 overflow-hidden">
                {Object.entries(beat.pattern).slice(0, 6).map(([instrument, steps]) => (
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
            <div 
              className="flex items-start justify-between mb-2 cursor-pointer"
              onClick={() => {
                stopBeat();
                onLoadBeat({
                  id: beat.id,
                  name: beat.name,
                  pattern: beat.pattern,
                  tempo: beat.tempo,
                  image_url: beat.image_url,
                  is_public: beat.is_public,
                  instrument_order: beat.instrument_order,
                });
              }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{beat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {beat.tempo} BPM • {countActiveSteps(beat.pattern)} notes • {beat.plays_count || 0} loop plays
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                {beat.is_public ? (
                  <Share2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="icon"
                variant={isPlaying(beat.id) ? "default" : "outline"}
                onClick={() => playBeat(beat.id, beat.pattern, beat.tempo)}
                className="h-10 w-10 flex-shrink-0"
              >
                {isPlaying(beat.id) ? (
                  <Square className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  stopBeat();
                  onLoadBeat({
                    id: beat.id,
                    name: beat.name,
                    pattern: beat.pattern,
                    tempo: beat.tempo,
                    image_url: beat.image_url,
                    is_public: beat.is_public,
                    instrument_order: beat.instrument_order,
                  });
                }}
                className="flex-shrink-0"
              >
                Load
              </Button>
              {onRemixBeat && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    stopBeat();
                    onRemixBeat({
                      id: beat.id,
                      name: beat.name,
                      pattern: beat.pattern,
                      tempo: beat.tempo,
                      image_url: null, // Don't copy image for remixes
                    });
                  }}
                  title="Create a copy"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTogglePublic(beat.id, beat.is_public)}
              >
                {beat.is_public ? <Lock className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(beat.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              {new Date(beat.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyBeats;
