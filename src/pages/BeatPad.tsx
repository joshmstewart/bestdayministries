import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Users, X, ShoppingBag, Save, Wand2, Loader2, Shuffle, ArrowLeft } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToastWithCopy } from '@/lib/errorToast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CustomizableBeatGrid from '@/components/beat-pad/CustomizableBeatGrid';
import PlaybackControls from '@/components/beat-pad/PlaybackControls';
import BeatPadGallery from '@/components/beat-pad/BeatPadGallery';
import BeatPadSoundShop from '@/components/beat-pad/BeatPadSoundShop';
import MyBeats from '@/components/beat-pad/MyBeats';
import SaveBeatDialog from '@/components/beat-pad/SaveBeatDialog';
import BeatCoverImage from '@/components/beat-pad/BeatCoverImage';
import PresetManager from '@/components/beat-pad/PresetManager';
import useCustomBeatAudio from '@/hooks/useCustomBeatAudio';
import { SoundConfig } from '@/components/beat-pad/InstrumentSlot';
import { UnifiedHeader } from '@/components/UnifiedHeader';
import Footer from '@/components/Footer';

const STEPS = 16;

const BeatPad: React.FC = () => {
  const { user } = useAuth();
  const { playSound, ensureAudioContextRunning, preloadSounds } = useCustomBeatAudio();

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
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGeneratingBeat, setIsGeneratingBeat] = useState(false);
  const [showGenerateBeatConfirm, setShowGenerateBeatConfirm] = useState(false);
  // Track saved beat info for cover image
  const [savedBeatId, setSavedBeatId] = useState<string | null>(null);
  const [savedBeatImageUrl, setSavedBeatImageUrl] = useState<string | null>(null);
  const [beatLoaded, setBeatLoaded] = useState(false);
  // Save/share state - only isUnsharing and isShared are used, saving/sharing handled by dialog
  const [isUnsharing, setIsUnsharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  // Key to force CustomizableBeatGrid remount when creating new beat
  const [gridKey, setGridKey] = useState(0);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preload sounds for the current instruments
  useEffect(() => {
    const soundsToPreload = instruments.filter(Boolean) as SoundConfig[];
    if (soundsToPreload.length > 0) {
      preloadSounds(soundsToPreload);
    }
  }, [instruments, preloadSounds]);

  // Check if pattern has any active cells
  const hasPattern = Object.values(pattern).some(steps => steps.some(Boolean));

  const handlePlaySound = useCallback((sound: SoundConfig) => {
    // Unlock AudioContext for iOS/Safari (must be called from a click)
    void ensureAudioContextRunning();
    playSound(sound);
  }, [playSound, ensureAudioContextRunning]);

  const handlePlay = useCallback(async () => {
    const ctx = await ensureAudioContextRunning();
    console.log('[BeatPad] AudioContext state on play:', ctx.state);

    // Ensure sounds are preloaded before starting playback
    const soundsToPreload = instruments.filter(Boolean) as SoundConfig[];
    if (soundsToPreload.length > 0) {
      await preloadSounds(soundsToPreload);
    }
    
    setIsPlaying(true);
    setCurrentStep(0);
  }, [ensureAudioContextRunning, instruments, preloadSounds]);

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

  // Playback loop - use synchronous sound triggering
  useEffect(() => {
    if (!isPlaying) return;

    console.log('[BeatPad] Playback started', {
      instrumentCount: instruments.filter(Boolean).length,
      patternKeys: Object.keys(pattern),
      patternWithActiveCells: Object.entries(pattern).filter(([_, steps]) => steps.some(Boolean))
    });

    const stepDuration = (60 / tempo) * 1000 / 4; // 16th notes
    let currentStepLocal = 0;

    // Play initial step
    instruments.forEach((sound, idx) => {
      if (sound && pattern[idx.toString()]?.[currentStepLocal]) {
        console.log('[BeatPad] Playing sound at step', currentStepLocal, 'instrument', idx, sound.name);
        playSound(sound);
      }
    });
    setCurrentStep(currentStepLocal);

    intervalRef.current = setInterval(() => {
      currentStepLocal = (currentStepLocal + 1) % STEPS;
      setCurrentStep(currentStepLocal);
      
      // Play sounds for active cells
      instruments.forEach((sound, idx) => {
        if (sound && pattern[idx.toString()]?.[currentStepLocal]) {
          playSound(sound);
        }
      });
    }, stepDuration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, tempo, pattern, instruments, playSound]);

  // Open save dialog instead of saving directly
  const handleSave = () => {
    if (!user) {
      showErrorToastWithCopy('Save Beat', 'Sign in to save your beat!');
      return;
    }
    if (!hasPattern) {
      showErrorToastWithCopy('Save Beat', 'Add some notes first!');
      return;
    }
    setSaveDialogOpen(true);
  };

  // Callback when beat is saved via dialog
  const handleBeatSaved = (beatId: string, imageUrl?: string, newBeatName?: string, isPublic?: boolean) => {
    setSavedBeatId(beatId);
    if (newBeatName) {
      setBeatName(newBeatName);
    }
    if (isPublic !== undefined) {
      setIsShared(isPublic);
    }
    if (imageUrl) {
      setSavedBeatImageUrl(imageUrl);
    }
  };

  // Save and share also opens the dialog - same flow
  const handleSaveAndShare = () => {
    if (!user) {
      showErrorToastWithCopy('Share Beat', 'Sign in to share your beat!');
      return;
    }
    if (!hasPattern) {
      showErrorToastWithCopy('Share Beat', 'Add some notes first!');
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleUnshare = async () => {
    if (!savedBeatId) return;

    setIsUnsharing(true);
    try {
      const { error } = await supabase
        .from('beat_pad_creations')
        .update({ is_public: false })
        .eq('id', savedBeatId);

      if (error) throw error;
      setIsShared(false);
      toast.success('Beat is now private');
    } catch (error) {
      console.error('Error unsharing beat:', error);
      showErrorToastWithCopy('Unshare Beat', error);
    } finally {
      setIsUnsharing(false);
    }
  };

  const handleLoadBeat = async (beat: { id: string; name: string; pattern: Record<string, boolean[]>; tempo: number; image_url?: string | null; is_public?: boolean; ai_audio_url?: string | null; instrument_order?: string[] | null }) => {
    handleStop();

    const allKeys = Object.keys(beat.pattern || {});
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const numericRegex = /^\d+$/;

    // Use saved instrument_order if available, otherwise fall back to pattern keys
    const savedOrder = beat.instrument_order;
    const soundIdKeys = savedOrder && savedOrder.length > 0 
      ? savedOrder.filter((k) => uuidRegex.test(k))
      : allKeys.filter((k) => uuidRegex.test(k));
    const soundTypeKeys = allKeys.filter((k) => !uuidRegex.test(k) && !numericRegex.test(k));

    const loadIntoGrid = async (orderedKeys: string[], soundLookup: Map<string, SoundConfig>, getSteps: (key: string) => boolean[] | undefined) => {
      const loadedInstruments: (SoundConfig | null)[] = [];
      const newPattern: Record<string, boolean[]> = {};

      const validKeys = orderedKeys.filter((key) => {
        const hasSound = soundLookup.has(key);
        const steps = getSteps(key);
        const hasActivePattern = steps?.some(Boolean);
        return hasSound && !!hasActivePattern;
      });

      if (validKeys.length === 0) {
        showErrorToastWithCopy(
          'Load Beat',
          `This beat ("${beat.name}") has no playable notes, or its instruments are no longer available.`
        );
        return false;
      }

      validKeys.forEach((key, idx) => {
        const sound = soundLookup.get(key);
        const steps = getSteps(key);
        if (sound && steps) {
          loadedInstruments.push(sound);
          newPattern[idx.toString()] = steps;
        }
      });

      while (loadedInstruments.length < 20) {
        const idx = loadedInstruments.length;
        loadedInstruments.push(null);
        newPattern[idx.toString()] = Array(16).fill(false);
      }

      setBeatLoaded(true);
      setInstruments(loadedInstruments);
      setPattern(newPattern);
      
      // Preload sounds immediately after loading
      const soundsToPreload = loadedInstruments.filter(Boolean) as SoundConfig[];
      if (soundsToPreload.length > 0) {
        await preloadSounds(soundsToPreload);
      }
      
      return true;
    };

    try {
      let loaded = false;

      if (soundIdKeys.length > 0) {
        // New format: pattern keys are sound UUIDs
        const { data: sounds, error } = await supabase
          .from('beat_pad_sounds')
          .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
          .in('id', soundIdKeys);

        if (error) throw error;

        const soundMap = new Map((sounds || []).map((s) => [s.id, s as SoundConfig]));
        loaded = await loadIntoGrid(soundIdKeys, soundMap, (k) => beat.pattern[k]);
      } else if (soundTypeKeys.length > 0) {
        // Legacy format: pattern keys are sound_type strings (e.g., "kick", "snare", "bass")
        const { data: sounds, error } = await supabase
          .from('beat_pad_sounds')
          .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
          .eq('is_active', true)
          .in('sound_type', soundTypeKeys);

        if (error) throw error;

        const soundMap = new Map((sounds || []).map((s) => [s.sound_type, s as SoundConfig]));
        loaded = await loadIntoGrid(soundTypeKeys, soundMap, (k) => (beat.pattern as any)[k]);
      } else {
        showErrorToastWithCopy(
          'Load Beat',
          {
            message: 'Unsupported beat format: pattern keys were neither UUIDs nor sound types.',
            keys: allKeys,
            beatId: beat.id,
            beatName: beat.name,
          }
        );
        return;
      }

      if (!loaded) return;
    } catch (error) {
      console.error('Error loading beat sounds:', error);
      showErrorToastWithCopy('Load Beat', error);
      return;
    }

    setTempo(beat.tempo);
    setBeatName(beat.name);
    setSavedBeatId(beat.id);
    setIsShared(beat.is_public || false);
    // Add cache-busting to ensure latest image is shown
    setSavedBeatImageUrl(beat.image_url ? `${beat.image_url}?t=${Date.now()}` : null);
    setActiveTab('create');

    // Handle AI audio URL - revoke old one and set new if present
    if (aiAudioUrl) {
      URL.revokeObjectURL(aiAudioUrl);
    }
    setAiAudioUrl(beat.ai_audio_url || null);

    toast.success('Beat loaded! Press play to listen.');
  };

  // Handle remixing a beat - create a copy with a new name
  const handleRemixBeat = useCallback(async (beat: { id: string; name: string; pattern: Record<string, boolean[]>; tempo: number; image_url?: string | null; instrument_order?: string[] | null }) => {
    if (!user) {
      toast.error('Sign in to remix beats!');
      return;
    }

    // First load the beat pattern into the editor
    await handleLoadBeat({
      ...beat,
      name: `${beat.name} (Remix)`,
      image_url: null, // Don't copy the image
      instrument_order: beat.instrument_order,
    });
    
    // Clear the saved beat ID so it saves as a new beat
    setSavedBeatId(null);
    setSavedBeatImageUrl(null);
    
    toast.success('Beat remixed! Edit it and save as your own! 🎵');
  }, [user, handleLoadBeat]);

  // Reset to new beat when switching to create tab without a loaded beat
  const handleNewBeat = useCallback(() => {
    handleStop();
    setBeatLoaded(false);
    setPattern({});
    setInstruments([]);
    setBeatName('My Beat');
    setSavedBeatId(null);
    setSavedBeatImageUrl(null);
    // Increment key to force CustomizableBeatGrid to remount and reload defaults
    setGridKey(prev => prev + 1);
    if (aiAudioUrl) {
      URL.revokeObjectURL(aiAudioUrl);
      setAiAudioUrl(null);
    }
  }, [handleStop, aiAudioUrl]);

  // Load a preset (set of instruments) - triggered by PresetManager
  const handleLoadPreset = useCallback(async (instrumentIds: string[]) => {
    if (instrumentIds.length === 0) return;

    try {
      // Fetch the sounds by ID
      const { data: sounds, error } = await supabase
        .from('beat_pad_sounds')
        .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
        .in('id', instrumentIds);

      if (error) throw error;

      // Build a map for ordering
      const soundMap = new Map<string, SoundConfig>();
      (sounds || []).forEach(s => soundMap.set(s.id, s as SoundConfig));

      // Preserve the order from the preset
      const orderedInstruments: (SoundConfig | null)[] = instrumentIds
        .map(id => soundMap.get(id) || null)
        .filter((s): s is SoundConfig => s !== null);

      // Fill to MAX_INSTRUMENTS
      while (orderedInstruments.length < 20) {
        orderedInstruments.push(null);
      }

      // Clear the pattern but keep the new instruments
      const newPattern: Record<string, boolean[]> = {};
      orderedInstruments.forEach((_, idx) => {
        newPattern[idx.toString()] = Array(16).fill(false);
      });

      // Set state
      setBeatLoaded(true); // Prevent default load
      setInstruments(orderedInstruments);
      setPattern(newPattern);
      setBeatName('My Beat');
      setSavedBeatId(null);
      setSavedBeatImageUrl(null);
      setIsShared(false);

      // Preload sounds
      const soundsToPreload = orderedInstruments.filter(Boolean) as SoundConfig[];
      if (soundsToPreload.length > 0) {
        await preloadSounds(soundsToPreload);
      }
    } catch (error) {
      console.error('Error loading preset:', error);
      showErrorToastWithCopy('Load Preset', error);
    }
  }, [preloadSounds]);

  // Generate AI beat pattern from current instruments
  const generateAIBeat = useCallback(async (skipConfirm = false) => {
    const activeInstruments = instruments.filter(Boolean) as SoundConfig[];
    if (activeInstruments.length === 0) {
      toast.error('Add some instruments first!');
      return;
    }

    // Check if any cells are currently checked in the pattern
    const patternHasCheckedCells = Object.values(pattern).some(steps => 
      steps && steps.some(Boolean)
    );

    

    // If there's an existing pattern and we haven't confirmed, show dialog
    if (patternHasCheckedCells && !skipConfirm) {
      setShowGenerateBeatConfirm(true);
      return;
    }

    setIsGeneratingBeat(true);
    try {
      const instrumentNames = activeInstruments.map(i => i.name).join(', ');
      
      const prompt = `Generate a 16-step drum pattern for these instruments: ${instrumentNames}. 
      
Respond with ONLY a JSON object where keys are the instrument names and values are arrays of 16 booleans (true = play, false = silent).

Example format:
{"Kick": [true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false], "Snare": [false,false,true,false,false,false,true,false,false,false,true,false,false,false,true,false]}

Make it groovy and rhythmically interesting! At ${tempo} BPM.`;

      const response = await supabase.functions.invoke('lovable-ai', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          model: 'google/gemini-2.5-flash-lite',
        },
      });

      if (response.error) throw response.error;
      
      const content = response.data?.content?.trim() || '';
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');
      
      const generatedPattern = JSON.parse(jsonMatch[0]);
      
      // Map the generated pattern to our indexed pattern format
      const newPattern: Record<string, boolean[]> = {};
      instruments.forEach((sound, idx) => {
        if (sound) {
          // Try to find a matching pattern by instrument name
          const matchingKey = Object.keys(generatedPattern).find(
            key => key.toLowerCase() === sound.name.toLowerCase() ||
                   sound.name.toLowerCase().includes(key.toLowerCase()) ||
                   key.toLowerCase().includes(sound.name.toLowerCase())
          );
          if (matchingKey && Array.isArray(generatedPattern[matchingKey])) {
            newPattern[idx.toString()] = generatedPattern[matchingKey].slice(0, 16).map(Boolean);
            // Pad to 16 if needed
            while (newPattern[idx.toString()].length < 16) {
              newPattern[idx.toString()].push(false);
            }
          } else {
            newPattern[idx.toString()] = Array(16).fill(false);
          }
        } else {
          newPattern[idx.toString()] = Array(16).fill(false);
        }
      });
      
      setPattern(newPattern);
      toast.success('Beat generated! Press play to hear it! 🎵');
    } catch (error) {
      console.error('Error generating beat:', error);
      toast.error('Failed to generate beat. Try again!');
    } finally {
      setIsGeneratingBeat(false);
    }
  }, [instruments, pattern, tempo]);

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
      showErrorToastWithCopy('Generate Beat Name', error);
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleAIify = async () => {
    if (!hasPattern) {
      showErrorToastWithCopy('AI Music', 'Add some notes first!');
      return;
    }

    if (!user) {
      showErrorToastWithCopy('AI Music', 'Sign in to create AI tracks!');
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
      
      // Upload to storage so it persists
      const fileName = `${user.id}/${Date.now()}-ai-track.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('beat-pad-audio')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to upload AI audio:', uploadError);
        // Fall back to blob URL if upload fails
        if (aiAudioUrl) {
          URL.revokeObjectURL(aiAudioUrl);
        }
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setAiAudioUrl(newAudioUrl);
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('beat-pad-audio')
          .getPublicUrl(fileName);
        
        if (aiAudioUrl && aiAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(aiAudioUrl);
        }
        setAiAudioUrl(publicUrl);
      }

      toast.success('AI track created! Auto-saving... 🎵');
      
      // Auto-save after AI track is created
      setTimeout(() => {
        handleSave();
      }, 500);
    } catch (error) {
      console.error('Error generating AI music:', error);
      showErrorToastWithCopy('AI Music Generation', error);
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
        initialBeatName={beatName}
        savedBeatId={savedBeatId}
        isShared={isShared}
        aiAudioUrl={aiAudioUrl}
        onSaved={handleBeatSaved}
      />

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <BackButton to="/community" label="Back to Community" className="mb-4" />
        
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
            {/* Beat name input with magic wand for name */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] max-w-md">
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
                </div>
              </div>
              
              {/* Preset Manager and New Beat Button */}
              <PresetManager
                userId={user?.id || null}
                currentInstruments={instruments}
                onLoadPreset={handleLoadPreset}
              />
              
              <Button
                variant="ghost"
                onClick={handleNewBeat}
                className="gap-2"
              >
                New Beat
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Beat Grid */}
              <div className="lg:col-span-3">
              <CustomizableBeatGrid
                  key={gridKey}
                  pattern={pattern}
                  setPattern={setPattern}
                  instruments={instruments}
                  setInstruments={setInstruments}
                  currentStep={currentStep}
                  isPlaying={isPlaying}
                  onPlaySound={handlePlaySound}
                  onStopPlayback={handleStop}
                  skipDefaultLoad={beatLoaded}
                />
              </div>

              {/* Controls */}
              <div className="lg:col-span-1 space-y-4">
                {/* Cover image section */}
                <BeatCoverImage
                  beatId={savedBeatId || undefined}
                  beatName={beatName}
                  imageUrl={savedBeatImageUrl}
                  pattern={pattern}
                  tempo={tempo}
                  instruments={instruments}
                  onImageGenerated={(url) => setSavedBeatImageUrl(url)}
                  
                />
                
                <PlaybackControls
                  isPlaying={isPlaying}
                  tempo={tempo}
                  onPlay={handlePlay}
                  onStop={handleStop}
                  onTempoChange={setTempo}
                  onClear={handleClear}
                  onSave={handleSave}
                  onSaveAndShare={handleSaveAndShare}
                  onUnshare={handleUnshare}
                  onAIify={handleAIify}
                  onGenerateBeat={() => generateAIBeat(false)}
                  onRemix={() => {
                    if (!beatName.includes('(Remix)')) {
                      setBeatName(`${beatName} (Remix)`);
                    }
                    setSavedBeatId(null);
                    setSavedBeatImageUrl(null);
                    setIsShared(false);
                    toast.success('Remixing! Edit and save as your own! 🎵');
                  }}
                  canSave={hasPattern}
                  canGenerateBeat={instruments.filter(Boolean).length > 0}
                  showRemix={!!savedBeatId && !!user}
                  isSaving={false}
                  isSharing={false}
                  isUnsharing={isUnsharing}
                  isShared={isShared}
                  isAIifying={isAIifying}
                  isGeneratingBeat={isGeneratingBeat}
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

            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <h3 className="font-semibold mb-2">How to Play</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="text-2xl">🎵</span>
                  <p>Add up to 20 instruments</p>
                </div>
                <div>
                  <span className="text-2xl">👆</span>
                  <p>Tap squares to add notes</p>
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
            <MyBeats onLoadBeat={handleLoadBeat} onRemixBeat={handleRemixBeat} isActive={activeTab === 'my-beats'} />
          </TabsContent>

          <TabsContent value="community">
            <BeatPadGallery onLoadBeat={handleLoadBeat} onRemixBeat={handleRemixBeat} />
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />

      {/* Generate Beat Confirmation Dialog */}
      <AlertDialog open={showGenerateBeatConfirm} onOpenChange={setShowGenerateBeatConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override Current Beat?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an existing beat pattern. Generating a new beat will replace your current pattern. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowGenerateBeatConfirm(false);
              generateAIBeat(true);
            }}>
              Generate New Beat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BeatPad;
