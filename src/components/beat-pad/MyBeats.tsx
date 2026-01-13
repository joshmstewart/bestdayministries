import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Trash2, Share2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { InstrumentType } from '@/hooks/useBeatPadAudio';

interface BeatCreation {
  id: string;
  name: string;
  pattern: Record<InstrumentType, boolean[]>;
  tempo: number;
  is_public: boolean;
  created_at: string;
}

interface MyBeatsProps {
  onLoadBeat: (pattern: Record<InstrumentType, boolean[]>, tempo: number) => void;
}

const MyBeats: React.FC<MyBeatsProps> = ({ onLoadBeat }) => {
  const { user } = useAuth();
  const [beats, setBeats] = useState<BeatCreation[]>([]);
  const [loading, setLoading] = useState(true);

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
          : beat.pattern as Record<InstrumentType, boolean[]>,
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

  const countActiveSteps = (pattern: Record<InstrumentType, boolean[]>): number => {
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
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{beat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {beat.tempo} BPM • {countActiveSteps(beat.pattern)} notes
                </p>
              </div>
              <div className="flex items-center gap-1">
                {beat.is_public ? (
                  <Share2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Mini pattern preview */}
            <div className="bg-muted/50 rounded-lg p-2 mb-3">
              <div className="grid grid-cols-16 gap-px">
                {Array.from({ length: 16 }).map((_, stepIdx) => {
                  const hasNote = Object.values(beat.pattern).some(
                    (steps) => steps[stepIdx]
                  );
                  return (
                    <div
                      key={stepIdx}
                      className={`h-4 rounded-sm ${
                        hasNote ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onLoadBeat(beat.pattern, beat.tempo)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-1" />
                Load
              </Button>
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
