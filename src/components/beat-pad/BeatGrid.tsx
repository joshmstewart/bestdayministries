import React from 'react';
import { cn } from '@/lib/utils';
import { InstrumentType, INSTRUMENT_LABELS } from '@/hooks/useBeatPadAudio';

interface BeatGridProps {
  pattern: Record<InstrumentType, boolean[]>;
  currentStep: number;
  isPlaying: boolean;
  onToggleCell: (instrument: InstrumentType, step: number) => void;
  onPlaySound: (instrument: InstrumentType) => void;
}

const STEPS = 16;
const INSTRUMENTS: InstrumentType[] = ['kick', 'snare', 'hihat', 'clap', 'bass', 'synth1', 'synth2', 'bell'];

export const BeatGrid: React.FC<BeatGridProps> = ({
  pattern,
  currentStep,
  isPlaying,
  onToggleCell,
  onPlaySound,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[700px] space-y-2">
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
        {INSTRUMENTS.map((instrument) => {
          const label = INSTRUMENT_LABELS[instrument];
          return (
            <div key={instrument} className="flex items-center gap-1">
              {/* Instrument label */}
              <button
                onClick={() => onPlaySound(instrument)}
                className="w-24 md:w-32 flex items-center gap-2 px-2 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors text-left"
              >
                <span className="text-xl">{label.emoji}</span>
                <span className="text-xs md:text-sm font-medium truncate">{label.name}</span>
              </button>

              {/* Beat cells */}
              {Array.from({ length: STEPS }).map((_, step) => {
                const isActive = pattern[instrument]?.[step] ?? false;
                const isCurrentStep = isPlaying && currentStep === step;
                
                return (
                  <button
                    key={step}
                    onClick={() => onToggleCell(instrument, step)}
                    className={cn(
                      "flex-1 aspect-square rounded-lg border-2 transition-all",
                      "hover:scale-105 active:scale-95",
                      step % 4 === 0 ? "border-primary/30" : "border-border",
                      isActive
                        ? "shadow-lg"
                        : "bg-card hover:bg-accent",
                      isCurrentStep && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    style={{
                      backgroundColor: isActive ? label.color : undefined,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BeatGrid;
