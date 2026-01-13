import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, Trash2, Save, Share2 } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (tempo: number) => void;
  onClear: () => void;
  onSave: () => void;
  onShare: () => void;
  canSave: boolean;
  isSaving: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  tempo,
  onPlay,
  onStop,
  onTempoChange,
  onClear,
  onSave,
  onShare,
  canSave,
  isSaving,
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-xl border border-border">
      {/* Playback buttons */}
      <div className="flex items-center justify-center gap-3">
        <Button
          size="lg"
          variant={isPlaying ? "outline" : "default"}
          onClick={isPlaying ? onStop : onPlay}
          className="h-14 w-14 rounded-full"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-1" />
          )}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={onStop}
          className="h-14 w-14 rounded-full"
        >
          <Square className="h-5 w-5" />
        </Button>

        <Button
          size="lg"
          variant="ghost"
          onClick={onClear}
          className="h-14 w-14 rounded-full text-destructive hover:text-destructive"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Tempo slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Tempo</span>
          <span className="text-muted-foreground">{tempo} BPM</span>
        </div>
        <Slider
          value={[tempo]}
          min={60}
          max={180}
          step={5}
          onValueChange={([value]) => onTempoChange(value)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Slow</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Save and share buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onSave}
          disabled={!canSave || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={onShare}
          disabled={!canSave}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default PlaybackControls;
