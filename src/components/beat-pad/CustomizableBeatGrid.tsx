import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import InstrumentSlot, { SoundConfig } from './InstrumentSlot';
import SoundPickerDialog from './SoundPickerDialog';

const STEPS = 16;
const MAX_INSTRUMENTS = 20;

const DEFAULT_INSTRUMENT_COUNT = 10;

interface CustomizableBeatGridProps {
  pattern: Record<string, boolean[]>;
  setPattern: React.Dispatch<React.SetStateAction<Record<string, boolean[]>>>;
  instruments: (SoundConfig | null)[];
  setInstruments: React.Dispatch<React.SetStateAction<(SoundConfig | null)[]>>;
  currentStep: number;
  isPlaying: boolean;
  onPlaySound: (sound: SoundConfig) => void;
  onStopPlayback?: () => void;
  skipDefaultLoad?: boolean;
}

export const CustomizableBeatGrid: React.FC<CustomizableBeatGridProps> = ({
  pattern,
  setPattern,
  instruments,
  setInstruments,
  currentStep,
  isPlaying,
  onPlaySound,
  onStopPlayback,
  skipDefaultLoad = false,
}) => {
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(skipDefaultLoad);

  // Update initialized when skipDefaultLoad changes (e.g., when loading a beat)
  useEffect(() => {
    if (skipDefaultLoad) {
      setInitialized(true);
    }
  }, [skipDefaultLoad]);

  // Load default sounds on mount
  useEffect(() => {
    if (initialized || skipDefaultLoad) return;
    
    const loadDefaultSounds = async () => {
      try {
        const { data, error } = await supabase
          .from('beat_pad_sounds')
          .select('id, name, emoji, color, sound_type, frequency, decay, oscillator_type, has_noise, audio_url')
          .eq('is_active', true)
          .eq('is_default', true)
          .order('display_order')
          .limit(DEFAULT_INSTRUMENT_COUNT);

        if (error) throw error;

        if (data && data.length > 0) {
          // Use the first 10 default sounds in display_order
          const initialInstruments: (SoundConfig | null)[] = [...data];
          
          // Fill remaining slots with nulls up to MAX_INSTRUMENTS
          while (initialInstruments.length < MAX_INSTRUMENTS) {
            initialInstruments.push(null);
          }
          
          setInstruments(initialInstruments);
          
          // Initialize pattern for each slot
          const initialPattern: Record<string, boolean[]> = {};
          initialInstruments.forEach((_, idx) => {
            initialPattern[idx.toString()] = Array(STEPS).fill(false);
          });
          setPattern(initialPattern);
        }
      } catch (error) {
        console.error('Error loading default sounds:', error);
      } finally {
        setInitialized(true);
      }
    };

    loadDefaultSounds();
  }, [initialized, skipDefaultLoad, setInstruments, setPattern]);

  const handleOpenSoundPicker = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    setSoundPickerOpen(true);
  };

  const handleSelectSound = (sound: SoundConfig) => {
    if (selectedSlot === null) return;
    
    setInstruments(prev => {
      const newInstruments = [...prev];
      newInstruments[selectedSlot] = sound;
      return newInstruments;
    });
    
    // Ensure pattern exists for this slot
    setPattern(prev => {
      if (!prev[selectedSlot.toString()]) {
        return {
          ...prev,
          [selectedSlot.toString()]: Array(STEPS).fill(false),
        };
      }
      return prev;
    });
  };

  const handleRemoveSound = (slotIndex: number) => {
    setInstruments(prev => {
      const newInstruments = [...prev];
      newInstruments[slotIndex] = null;
      return newInstruments;
    });
    
    // Clear the pattern for this slot
    setPattern(prev => ({
      ...prev,
      [slotIndex.toString()]: Array(STEPS).fill(false),
    }));
  };

  const handleClearAll = () => {
    // Clear all instruments
    const emptyInstruments: (SoundConfig | null)[] = Array(MAX_INSTRUMENTS).fill(null);
    setInstruments(emptyInstruments);
    
    // Clear all patterns
    const emptyPattern: Record<string, boolean[]> = {};
    for (let i = 0; i < MAX_INSTRUMENTS; i++) {
      emptyPattern[i.toString()] = Array(STEPS).fill(false);
    }
    setPattern(emptyPattern);
  };

  const handleToggleCell = (slotIndex: number, step: number) => {
    const sound = instruments[slotIndex];
    if (!sound) return;
    
    setPattern(prev => {
      const key = slotIndex.toString();
      const newPattern = { ...prev };
      newPattern[key] = [...(prev[key] || Array(STEPS).fill(false))];
      newPattern[key][step] = !newPattern[key][step];
      return newPattern;
    });
    
    // Play sound when turning on
    if (sound && !pattern[slotIndex.toString()]?.[step]) {
      onPlaySound(sound);
    }
  };

  const excludeSoundIds = instruments.filter(Boolean).map(s => s!.id);
  const activeSlots = instruments.filter(Boolean).length;
  const canAddMore = activeSlots < MAX_INSTRUMENTS;

  // Determine how many slots to show - show all slots that have sounds,
  // plus one empty slot for adding new sounds (up to max)
  const lastFilledIndex = instruments.reduce((last, sound, idx) => 
    sound ? idx : last, -1
  );
  const slotsToShow = Math.min(
    MAX_INSTRUMENTS,
    Math.max(lastFilledIndex + 2, 10) // Show at least 10 slots (defaults), or last filled + 1
  );

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <div className="min-w-[700px] space-y-2 touch-pan-x">
        {/* Step indicators */}
        <div className="flex items-center gap-1 pl-24 md:pl-32">
          {Array.from({ length: STEPS }).map((_, step) => (
            <div
              key={step}
              className={cn(
                "flex-1 h-6 flex items-center justify-center text-xs font-medium rounded",
                step % 4 === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                isPlaying && currentStep === step && "ring-2 ring-primary"
              )}
            >
              {step + 1}
            </div>
          ))}
        </div>

        {/* Instrument rows */}
        {instruments.slice(0, slotsToShow).map((sound, idx) => (
          <InstrumentSlot
            key={idx}
            slotIndex={idx}
            sound={sound}
            stepPattern={pattern[idx.toString()] || Array(STEPS).fill(false)}
            currentStep={currentStep}
            isPlaying={isPlaying}
            onToggleCell={(step) => handleToggleCell(idx, step)}
            onPlaySound={() => sound && onPlaySound(sound)}
            onRemove={() => handleRemoveSound(idx)}
            onSelectSound={() => handleOpenSoundPicker(idx)}
          />
        ))}

        {/* Action buttons */}
        <div className="flex gap-2">
          {activeSlots > 0 && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="border-dashed text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
          {canAddMore && slotsToShow < MAX_INSTRUMENTS && (
            <Button
              variant="outline"
              onClick={() => handleOpenSoundPicker(slotsToShow)}
              className="flex-1 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sound ({activeSlots}/{MAX_INSTRUMENTS})
            </Button>
          )}
        </div>
      </div>

      <SoundPickerDialog
        open={soundPickerOpen}
        onOpenChange={setSoundPickerOpen}
        onSelectSound={handleSelectSound}
        excludeSoundIds={excludeSoundIds}
        onPreviewStart={onStopPlayback}
      />
    </div>
  );
};

export default CustomizableBeatGrid;
