import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Users, X, ShoppingBag, Save, Wand2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CustomizableBeatGrid from '@/components/beat-pad/CustomizableBeatGrid';
import PlaybackControls from '@/components/beat-pad/PlaybackControls';
import BeatPadGallery from '@/components/beat-pad/BeatPadGallery';
import BeatPadSoundShop from '@/components/beat-pad/BeatPadSoundShop';
import MyBeats from '@/components/beat-pad/MyBeats';
import SaveBeatDialog from '@/components/beat-pad/SaveBeatDialog';
import useCustomBeatAudio from '@/hooks/useCustomBeatAudio';
import { SoundConfig } from '@/components/beat-pad/InstrumentSlot';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import Footer from '@/components/Footer';
import { InstrumentType } from '@/hooks/useBeatPadAudio';

const STEPS = 16;

const BeatPad: React.FC = () => {
  const { user } = useAuth();
  const { playSound, getAudioContext } = useCustomBeatAudio();

  const [pattern, setPattern] = useState<Record<string, boolean[]>>({});
  const [instruments, setInstruments] = useState<(SoundConfig | null)[]>([]);
  const [tempo, setTempo] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [beatName, setBeatName] = useState('My Beat');
  const [activeTab, setActiveTab] = useState('create');
  const [isAIifying, setIsAIifying] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [isPlayingAI, setIsPlayingAI] = useState(false);
  const [soundShopOpen, setSoundShopOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isGeneratingBeat, setIsGeneratingBeat] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if pattern has any active cells
  const hasPattern = Object.values(pattern).some(steps => steps.some(Boolean));

  const handlePlaySound = useCallback((sound: SoundConfig) => {
    getAudioContext();
    playSound(sound);
  }, [playSound, getAudioContext]);

  const handlePlay = useCallback(() => {
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
    setPattern(prev => {
      const cleared: Record<string, boolean[]> = {};
      Object.keys(prev).forEach(key => {
        cleared[key] = Array(STEPS).fill(false);
      });
      return cleared;
    });
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
        instruments.forEach((sound, idx) => {
          if (sound && pattern[idx.toString()]?.[nextStep]) {
            playSound(sound);
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
  }, [isPlaying, tempo, pattern, instruments, playSound]);

  const handleSave = () => {
    if (!user) {
      toast.error('Sign in to save your beat!');
      return;
    }
    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleShare = () => {
    if (!user) {
      toast.error('Sign in to share your beat!');
      return;
    }
    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleLoadBeat = (loadedPattern: Record<InstrumentType, boolean[]>, loadedTempo: number) => {
    handleStop();
    // Convert old format pattern to new format
    // For now, just load into the first available slots
    const newPattern: Record<string, boolean[]> = {};
    const entries = Object.entries(loadedPattern);
    entries.forEach((entry, idx) => {
      newPattern[idx.toString()] = entry[1];
    });
    setPattern(newPattern);
    setTempo(loadedTempo);
    setActiveTab('create');
    if (aiAudioUrl) {
      URL.revokeObjectURL(aiAudioUrl);
      setAiAudioUrl(null);
    }
    toast.success('Beat loaded! Press play to listen.');
  };

  // Generate a random beat pattern
  const generateRandomBeat = useCallback(() => {
    setIsGeneratingBeat(true);
    
    const activeInstruments = instruments.filter(Boolean);
    if (activeInstruments.length === 0) {
      toast.error('Add some instruments first!');
      setIsGeneratingBeat(false);
      return;
    }

    const newPattern: Record<string, boolean[]> = {};
    
    instruments.forEach((sound, idx) => {
      if (!sound) {
        newPattern[idx.toString()] = Array(STEPS).fill(false);
        return;
      }
      
      const steps = Array(STEPS).fill(false);
      const soundType = sound.sound_type.toLowerCase();
      
      // Different patterns based on sound type
      if (soundType.includes('kick') || soundType.includes('bass')) {
        // Kick/bass: emphasize beats 1 and 3
        [0, 8].forEach(i => steps[i] = Math.random() > 0.2);
        [4, 12].forEach(i => steps[i] = Math.random() > 0.5);
      } else if (soundType.includes('snare') || soundType.includes('clap')) {
        // Snare/clap: emphasize beats 2 and 4
        [4, 12].forEach(i => steps[i] = Math.random() > 0.2);
      } else if (soundType.includes('hihat') || soundType.includes('hat')) {
        // Hi-hat: 8th or 16th note patterns
        const density = Math.random();
        for (let i = 0; i < STEPS; i++) {
          if (density > 0.5) {
            steps[i] = i % 2 === 0 ? Math.random() > 0.2 : Math.random() > 0.6;
          } else {
            steps[i] = i % 4 === 0 || i % 4 === 2 ? Math.random() > 0.3 : false;
          }
        }
      } else {
        // Other sounds: sparse random placement
        const notesToPlace = Math.floor(Math.random() * 4) + 1;
        for (let n = 0; n < notesToPlace; n++) {
          const pos = Math.floor(Math.random() * STEPS);
          steps[pos] = true;
        }
      }
      
      newPattern[idx.toString()] = steps;
    });
    
    setPattern(newPattern);
    
    // Brief delay to show animation
    setTimeout(() => {
      setIsGeneratingBeat(false);
      toast.success('Beat generated! ✨');
    }, 300);
  }, [instruments]);

  // Generate AI name for beat
  const generateAIName = async () => {
    setIsGeneratingName(true);
    try {
      const activeInstruments = instruments.filter(Boolean).map(i => i!.name);
      const totalNotes = Object.values(pattern).reduce((sum, steps) => 
        sum + steps.filter(Boolean).length, 0
      );
      
      const prompt = `Generate a single creative, fun, catchy name (2-4 words max) for a beat that uses these instruments: ${activeInstruments.join(', ')}. The beat has ${totalNotes} notes at ${tempo} BPM. Make it playful and memorable. Just return the name, nothing else.`;

      const response = await supabase.functions.invoke('lovable-ai', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          model: 'google/gemini-2.5-flash-lite',
        },
      });

      if (response.error) throw response.error;
      
      const name = response.data?.content?.trim() || 'My Epic Beat';
      setBeatName(name.replace(/["']/g, '').substring(0, 50));
      toast.success('Name generated!');
    } catch (error) {
      console.error('Error generating name:', error);
      toast.error('Could not generate name');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleAIify = async () => {
    if (!hasPattern) {
      toast.error('Add some notes first!');
      return;
    }

    handleStop();
    setIsAIifying(true);

    try {
      const activeInstruments = instruments.filter(Boolean);
      const instrumentDescriptions = activeInstruments.map(s => s!.name).join(', ');
      const totalNotes = Object.values(pattern).reduce((sum, steps) => 
        sum + steps.filter(Boolean).length, 0
      );
      
      const prompt = `Create a ${tempo} BPM electronic beat featuring: ${instrumentDescriptions}. This is a ${totalNotes > 20 ? 'complex' : 'minimal'} arrangement. Make it punchy and dancefloor-ready.`;
      
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
            duration: 15,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate music: ${response.status}`);
      }

      const audioBlob = await response.blob();
      
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

  useEffect(() => {
    return () => {
      if (aiAudioUrl) {
        URL.revokeObjectURL(aiAudioUrl);
      }
    };
  }, [aiAudioUrl]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnifiedHeader />
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-b border-border pt-24">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Beat Pad</h1>
              <p className="text-muted-foreground">Make your own music!</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSoundShopOpen(true)}
              className="ml-auto"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Sound Shop
            </Button>
          </div>
        </div>
      </div>

      <BeatPadSoundShop 
        open={soundShopOpen} 
        onOpenChange={setSoundShopOpen}
      />

      <SaveBeatDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        pattern={pattern}
        tempo={tempo}
        instruments={instruments}
        userId={user?.id || ''}
        onSaved={() => setActiveTab('my-beats')}
      />

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="my-beats" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              My Beats
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {/* Beat name input with magic wand */}
            <div className="max-w-md">
              <label className="text-sm font-medium mb-2 block">Beat Name</label>
              <div className="flex gap-2">
                <Input
                  value={beatName}
                  onChange={(e) => setBeatName(e.target.value)}
                  placeholder="Name your beat..."
                  maxLength={50}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={generateAIName}
                  disabled={isGeneratingName || !hasPattern}
                  title="Generate AI name"
                >
                  {isGeneratingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={generateRandomBeat}
                  disabled={isGeneratingBeat || instruments.filter(Boolean).length === 0}
                  title="Generate random beat"
                >
                  {isGeneratingBeat ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Beat
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Beat Grid */}
              <div className="lg:col-span-3">
                <CustomizableBeatGrid
                  pattern={pattern}
                  setPattern={setPattern}
                  instruments={instruments}
                  setInstruments={setInstruments}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  onPlaySound={handlePlaySound}
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
                  isSaving={false}
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="text-2xl">🎵</span>
                  <p>Add up to 20 instruments</p>
                </div>
                <div>
                  <span className="text-2xl">👆</span>
                  <p>Tap squares to add notes</p>
                </div>
                <div>
                  <span className="text-2xl">🪄</span>
                  <p>Generate a random beat</p>
                </div>
                <div>
                  <span className="text-2xl">▶️</span>
                  <p>Press play to hear it</p>
                </div>
                <div>
                  <span className="text-2xl">💾</span>
                  <p>Save or share!</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-beats">
            <MyBeats onLoadBeat={handleLoadBeat} />
          </TabsContent>

          <TabsContent value="community">
            <BeatPadGallery onLoadBeat={handleLoadBeat} />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default BeatPad;
