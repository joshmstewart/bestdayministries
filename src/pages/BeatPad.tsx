import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Music, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BeatGrid from '@/components/beat-pad/BeatGrid';
import PlaybackControls from '@/components/beat-pad/PlaybackControls';
import BeatPadGallery from '@/components/beat-pad/BeatPadGallery';
import useBeatPadAudio, { InstrumentType, INSTRUMENT_LABELS } from '@/hooks/useBeatPadAudio';

const INSTRUMENTS: InstrumentType[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'synth1', 'synth2', 'bell'];
const STEPS = 16;

const createEmptyPattern = (): Record<InstrumentType, boolean[]> => {
  const pattern: Partial<Record<InstrumentType, boolean[]>> = {};
  INSTRUMENTS.forEach(inst => {
    pattern[inst] = Array(STEPS).fill(false);
  });
  return pattern as Record<InstrumentType, boolean[]>;
};

// Convert beat pattern to a descriptive music prompt
const patternToPrompt = (pattern: Record<InstrumentType, boolean[]>, tempo: number): string => {
  const activeInstruments: string[] = [];
  let totalBeats = 0;

  INSTRUMENTS.forEach(inst => {
    const activeCount = pattern[inst].filter(Boolean).length;
    if (activeCount > 0) {
      activeInstruments.push(INSTRUMENT_LABELS[inst].name.toLowerCase());
      totalBeats += activeCount;
    }
  });

  if (activeInstruments.length === 0) {
    return 'A simple electronic beat';
  }

  // Determine the style based on instruments and density
  const density = totalBeats / (INSTRUMENTS.length * STEPS);
  const tempoDescription = tempo < 90 ? 'slow' : tempo < 120 ? 'medium tempo' : 'upbeat fast';
  
  let style = 'electronic';
  if (pattern.kick.filter(Boolean).length > 4 && pattern.bass.filter(Boolean).length > 2) {
    style = 'bass-heavy electronic';
  } else if (pattern.hihat.filter(Boolean).length > 6) {
    style = 'energetic dance';
  } else if (pattern.bell.filter(Boolean).length > 2 || pattern.synth2.filter(Boolean).length > 2) {
    style = 'melodic electronic';
  }

  const densityDesc = density > 0.3 ? 'complex' : density > 0.15 ? 'groovy' : 'minimal';

  return `A ${tempoDescription} ${densityDesc} ${style} beat featuring ${activeInstruments.slice(0, 3).join(', ')}${activeInstruments.length > 3 ? ' and more' : ''}, at ${tempo} BPM, perfect for dancing`;
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
  const [isAIifying, setIsAIifying] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

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
    // Clear AI audio when loading new beat
    if (aiAudioUrl) {
      URL.revokeObjectURL(aiAudioUrl);
      setAiAudioUrl(null);
    }
    toast.success('Beat loaded! Press play to listen.');
  };

  const handleAIify = async () => {
    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }

    handleStop(); // Stop the regular playback
    setIsAIifying(true);

    try {
      const prompt = patternToPrompt(pattern, tempo);
      console.log('AI Music prompt:', prompt);
      
      toast.info('Creating AI magic from your beat... ✨', { duration: 5000 });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            prompt,
            duration: 15, // 15 seconds
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate music: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
      // Revoke old URL if exists
      if (aiAudioUrl) {
        URL.revokeObjectURL(aiAudioUrl);
      }

      const newAudioUrl = URL.createObjectURL(audioBlob);
      setAiAudioUrl(newAudioUrl);

      toast.success('AI music created! 🎵');
    } catch (error) {
      console.error('Error generating AI music:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create AI music');
    } finally {
      setIsAIifying(false);
    }
  };

  const handlePlayAIAudio = () => {
    if (!aiAudioUrl) return;

    if (aiAudioRef.current) {
      if (isPlayingAI) {
        aiAudioRef.current.pause();
        setIsPlayingAI(false);
      } else {
        aiAudioRef.current.play();
        setIsPlayingAI(true);
      }
    }
  };

  const handleCloseAIPlayer = () => {
    if (aiAudioRef.current) {
      aiAudioRef.current.pause();
    }
    if (aiAudioUrl) {
      URL.revokeObjectURL(aiAudioUrl);
    }
    setAiAudioUrl(null);
    setIsPlayingAI(false);
  };

  // Cleanup AI audio URL on unmount
  useEffect(() => {
    return () => {
      if (aiAudioUrl) {
        URL.revokeObjectURL(aiAudioUrl);
      }
    };
  }, [aiAudioUrl]);

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
                  onAIify={handleAIify}
                  canSave={hasPattern}
                  isSaving={isSaving}
                  isAIifying={isAIifying}
                />
              </div>
            </div>

            {/* AI Generated Music Player */}
            {aiAudioUrl && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <h3 className="font-semibold">Your AI-Enhanced Beat!</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseAIPlayer}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <audio
                  ref={aiAudioRef}
                  src={aiAudioUrl}
                  controls
                  className="w-full"
                  onPlay={() => setIsPlayingAI(true)}
                  onPause={() => setIsPlayingAI(false)}
                  onEnded={() => setIsPlayingAI(false)}
                />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  🎵 AI transformed your beat into a full track!
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <h3 className="font-semibold mb-2">How to Play</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="text-2xl">👆</span>
                  <p>Tap squares to add notes</p>
                </div>
                <div>
                  <span className="text-2xl">▶️</span>
                  <p>Press play to hear your beat</p>
                </div>
                <div>
                  <span className="text-2xl">✨</span>
                  <p>AI-ify to create magic!</p>
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
