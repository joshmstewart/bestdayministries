import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SoundConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sound_type: string;
  frequency?: number;
  decay?: number;
  oscillator_type?: string;
  has_noise?: boolean;
  audio_url?: string;
}

interface InstrumentSlotProps {
  sound: SoundConfig | null;
  stepPattern: boolean[];
  currentStep: number;
  isPlaying: boolean;
  onToggleCell: (step: number) => void;
  onPlaySound: () => void;
  onRemove: () => void;
  onSelectSound: () => void;
  slotIndex: number;
}

const STEPS = 16;

export const InstrumentSlot: React.FC<InstrumentSlotProps> = ({
  sound,
  stepPattern,
  currentStep,
  isPlaying,
  onToggleCell,
  onPlaySound,
  onRemove,
  onSelectSound,
  slotIndex,
}) => {
  // Use callback to prevent event propagation issues on mobile
  const handleCellTap = useCallback((step: number, e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleCell(step);
  }, [onToggleCell]);

  const handlePlaySound = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPlaySound();
  }, [onPlaySound]);

  if (!sound) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          onClick={onSelectSound}
          className="w-24 md:w-32 h-12 flex items-center gap-2 border-dashed touch-manipulation"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">Add Sound</span>
        </Button>
        {/* Empty cells placeholder */}
        {Array.from({ length: STEPS }).map((_, step) => (
          <div
            key={step}
            className={cn(
              "flex-1 aspect-square rounded-lg border-2 border-dashed opacity-30",
              step % 4 === 0 ? "border-primary/30" : "border-border"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group">
      {/* Instrument label with remove button */}
      <div className="relative">
        <button
          onPointerDown={handlePlaySound}
          className="w-24 md:w-32 flex items-center gap-2 px-2 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors text-left h-12 touch-manipulation select-none"
        >
          <span className="text-xl">{sound.emoji}</span>
          <span className="text-xs md:text-sm font-medium truncate flex-1">{sound.name}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Beat cells - using onPointerDown for reliable mobile touch handling */}
      {Array.from({ length: STEPS }).map((_, step) => {
        const isActive = stepPattern[step] ?? false;
        const isCurrentStep = isPlaying && currentStep === step;

        return (
          <button
            key={step}
            type="button"
            onPointerDown={(e) => handleCellTap(step, e)}
            className={cn(
              "flex-1 aspect-square rounded-lg border-2 transition-colors",
              "active:scale-95 touch-manipulation select-none",
              step % 4 === 0 ? "border-primary/30" : "border-border",
              isActive ? "shadow-lg" : "bg-card",
              isCurrentStep && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            style={{
              backgroundColor: isActive ? sound.color : undefined,
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        );
      })}
    </div>
  );
};

export default InstrumentSlot;
