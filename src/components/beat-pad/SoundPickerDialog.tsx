import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SoundConfig } from './InstrumentSlot';
import { cn } from '@/lib/utils';

interface SoundPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSound: (sound: SoundConfig) => void;
  excludeSoundIds?: string[];
  onPreviewStart?: () => void;
}

export const SoundPickerDialog: React.FC<SoundPickerDialogProps> = ({
  open,
  onOpenChange,
  onSelectSound,
  excludeSoundIds = [],
  onPreviewStart,
}) => {
  const [sounds, setSounds] = useState<SoundConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const suppressSelectRef = useRef(false);
  const lastPreviewAtRef = useRef<number>(0);
  const lastPreviewTriggerAtRef = useRef<number>(0);

  const getAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Play synthesized sound immediately (keeps iOS audio unlocked)
  const playSynthesizedSound = (ctx: AudioContext, sound: SoundConfig) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = (sound.oscillator_type || 'sine') as OscillatorType;
    oscillator.frequency.value = sound.frequency || 440;
    
    gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (sound.decay || 0.3));
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + (sound.decay || 0.3));
  };

  const playSound = (
    sound: SoundConfig,
    e: React.SyntheticEvent
  ) => {
    e.stopPropagation();
    // Prevent scrolling/"ghost click" behaviors on iOS, and keep this as a direct user gesture.
    if ("preventDefault" in e) e.preventDefault();

    // Some mobile browsers may still dispatch a click to the parent tile after the preview tap.
    // We suppress tile selection briefly after previewing.
    lastPreviewAtRef.current = Date.now();
    suppressSelectRef.current = true;
    window.setTimeout(() => {
      suppressSelectRef.current = false;
    }, 1500);

    // Stop any playing beat when previewing a sound
    onPreviewStart?.();

    setPlayingId(sound.id);

    const ctx = getAudioContext();
    console.log('[SoundPickerDialog] ctx state', ctx.state);

    const startPlayback = () => {
      // Check if we have a cached audio buffer
      const cachedBuffer = audioBuffersRef.current.get(sound.id);

      if (cachedBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = cachedBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.7;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(ctx.currentTime);
        return;
      }

      // If we have an audio_url but no cached buffer, play synthesized first then load
      if (sound.audio_url) {
        playSynthesizedSound(ctx, sound);

        // Load the audio buffer in background for next time
        fetch(sound.audio_url)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
          .then((buffer) => {
            audioBuffersRef.current.set(sound.id, buffer);
          })
          .catch((err) => {
            console.warn('Failed to load audio buffer:', err);
          });
      } else {
        playSynthesizedSound(ctx, sound);
      }
    };

    // iOS/Safari: resuming is async; but we must *start* audio from within the user gesture.
    // Starting nodes while suspended will queue and should play once resume succeeds.
    if (ctx.state === 'suspended') {
      // Kick off resume, but don't wait for it.
      ctx.resume().catch((err) => {
        console.warn('Failed to resume AudioContext for preview:', err);
      });

      try {
        startPlayback();
      } finally {
        setTimeout(() => setPlayingId(null), 300);
      }
      return;
    }

    try {
      startPlayback();
    } finally {
      setTimeout(() => setPlayingId(null), 300);
    }
  };

  const handlePreview = (sound: SoundConfig, e: React.SyntheticEvent) => {
    // Some devices fire multiple events (pointer + touch + click). Guard against double triggers.
    const now = Date.now();
    if (now - lastPreviewTriggerAtRef.current < 250) return;
    lastPreviewTriggerAtRef.current = now;

    console.log('[SoundPickerDialog] preview', { id: sound.id, type: e.type });
    playSound(sound, e);
  };

  useEffect(() => {
    if (open) {
      loadSounds();
    }
  }, [open]);

  const loadSounds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beat_pad_sounds')
        .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setSounds(data || []);
    } catch (error) {
      console.error('Error loading sounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(sounds.map(s => s.sound_type))];

  const filteredSounds = sounds.filter(sound => {
    if (excludeSoundIds.includes(sound.id)) return false;
    if (selectedCategory && sound.sound_type !== selectedCategory) return false;
    if (search && !sound.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (sound: SoundConfig) => {
    onSelectSound(sound);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl w-full max-h-[80vh]",
          "overflow-y-auto overscroll-contain",
          "p-6 pr-12",
          "touch-pan-y [-webkit-overflow-scrolling:touch]"
        )}
      >
        <DialogHeader>
          <DialogTitle>Choose a Sound</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sounds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {/* Sound grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1 pb-4 touch-manipulation">
                {filteredSounds.map((sound) => (
                  <div
                    key={sound.id}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border",
                      "hover:border-primary hover:bg-accent transition-all cursor-pointer",
                      "active:scale-95"
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const msSincePreview = Date.now() - lastPreviewAtRef.current;
                      if (suppressSelectRef.current || msSincePreview < 1500) return;
                      if (target?.closest?.('[data-preview-button="true"]')) return;
                      handleSelect(sound);
                    }}
                  >
                    {/* Preview button */}
                    <button
                      type="button"
                      data-preview-button="true"
                      onPointerDown={(e) => handlePreview(sound, e)}
                      onTouchStart={(e) => handlePreview(sound, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className={cn(
                        "absolute top-2 right-2 p-1.5 rounded-full transition-all",
                        "bg-primary/10 hover:bg-primary/20",
                        playingId === sound.id &&
                          "bg-primary text-primary-foreground animate-pulse"
                      )}
                      title="Preview sound"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>

                    <span className="text-3xl">{sound.emoji}</span>
                    <span className="text-sm font-medium text-center truncate w-full">
                      {sound.name}
                    </span>
                    <div className="h-2 w-full rounded-full" style={{ backgroundColor: sound.color }} />
                  </div>
                ))}
              </div>

              {filteredSounds.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No sounds found</div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SoundPickerDialog;
