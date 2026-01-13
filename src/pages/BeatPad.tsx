import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Music, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BeatGrid from '@/components/beat-pad/BeatGrid';
import PlaybackControls from '@/components/beat-pad/PlaybackControls';
import BeatPadGallery from '@/components/beat-pad/BeatPadGallery';
import useBeatPadAudio, { InstrumentType } from '@/hooks/useBeatPadAudio';

const INSTRUMENTS: InstrumentType[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'synth1', 'synth2', 'bell'];
const STEPS = 16;

const createEmptyPattern = (): Record<InstrumentType, boolean[]> => {
  const pattern: Partial<Record<InstrumentType, boolean[]>> = {};
  INSTRUMENTS.forEach(inst => {
    pattern[inst] = Array(STEPS).fill(false);
  });
  return pattern as Record<InstrumentType, boolean[]>;
};

const BeatPad: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSound, getAudioContext } = useBeatPadAudio();

  const [pattern, setPattern] = useState<Record<InstrumentType, boolean[]>>(createEmptyPattern);
  const [tempo, setTempo] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [beatName, setBeatName] = useState('My Beat');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if pattern has any active cells
  const hasPattern = Object.values(pattern).some(steps => steps.some(Boolean));

  const toggleCell = useCallback((instrument: InstrumentType, step: number) => {
    // Initialize audio context on first interaction
    getAudioContext();
    
    setPattern(prev => {
      const newPattern = { ...prev };
      newPattern[instrument] = [...prev[instrument]];
      newPattern[instrument][step] = !prev[instrument][step];
      return newPattern;
    });

    // Play sound on toggle if turning on
    if (!pattern[instrument][step]) {
      playSound(instrument);
    }
  }, [pattern, playSound, getAudioContext]);

  const handlePlay = useCallback(() => {
    // Initialize audio context
    getAudioContext();
    setIsPlaying(true);
    setCurrentStep(0);
  }, [getAudioContext]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(-1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleClear = useCallback(() => {
    handleStop();
    setPattern(createEmptyPattern());
    toast.success('Beat cleared!');
  }, [handleStop]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const stepDuration = (60 / tempo) * 1000 / 4; // 16th notes

    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % STEPS;
        
        // Play sounds for active cells
        INSTRUMENTS.forEach(instrument => {
          if (pattern[instrument][nextStep]) {
            playSound(instrument);
          }
        });

        return nextStep;
      });
    }, stepDuration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, tempo, pattern, playSound]);

  const handleSave = async () => {
    if (!user) {
      toast.error('Sign in to save your beat!');
      return;
    }

    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('beat_pad_creations')
        .insert({
          creator_id: user.id,
          name: beatName || 'My Beat',
          pattern: pattern,
          tempo,
          is_public: false,
        });

      if (error) throw error;
      toast.success('Beat saved!');
    } catch (error) {
      console.error('Error saving beat:', error);
      toast.error('Failed to save beat');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error('Sign in to share your beat!');
      return;
    }

    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('beat_pad_creations')
        .insert({
          creator_id: user.id,
          name: beatName || 'My Beat',
          pattern: pattern,
          tempo,
          is_public: true,
        });

      if (error) throw error;
      toast.success('Beat shared with the community! 🎉');
    } catch (error) {
      console.error('Error sharing beat:', error);
      toast.error('Failed to share beat');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadBeat = (loadedPattern: Record<InstrumentType, boolean[]>, loadedTempo: number) => {
    handleStop();
    setPattern(loadedPattern);
    setTempo(loadedTempo);
    setActiveTab('create');
    toast.success('Beat loaded! Press play to listen.');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/games')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Beat Pad</h1>
              <p className="text-muted-foreground">Make your own music!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {/* Beat name input */}
            <div className="max-w-md">
              <label className="text-sm font-medium mb-2 block">Beat Name</label>
              <Input
                value={beatName}
                onChange={(e) => setBeatName(e.target.value)}
                placeholder="Name your beat..."
                maxLength={50}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Beat Grid */}
              <div className="lg:col-span-3">
                <BeatGrid
                  pattern={pattern}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  onToggleCell={toggleCell}
                  onPlaySound={playSound}
                />
              </div>

              {/* Controls */}
              <div className="lg:col-span-1">
                <PlaybackControls
                  isPlaying={isPlaying}
                  tempo={tempo}
                  onPlay={handlePlay}
                  onStop={handleStop}
                  onTempoChange={setTempo}
                  onClear={handleClear}
                  onSave={handleSave}
                  onShare={handleShare}
                  canSave={hasPattern}
                  isSaving={isSaving}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <h3 className="font-semibold mb-2">How to Play</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="text-2xl">👆</span>
                  <p>Tap squares to add notes</p>
                </div>
                <div>
                  <span className="text-2xl">▶️</span>
                  <p>Press play to hear your beat</p>
                </div>
                <div>
                  <span className="text-2xl">💾</span>
                  <p>Save or share your creation</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="community">
            <BeatPadGallery onLoadBeat={handleLoadBeat} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BeatPad;
