import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, Trash2, Save, Share2, Sparkles, Loader2, Wand2, Shuffle, Lock } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (tempo: number) => void;
  onClear: () => void;
  onSave: () => void;
  onSaveAndShare: () => void;
  onUnshare: () => void;
  onAIify: () => void;
  onGenerateBeat: () => void;
  onRemix: () => void;
  canSave: boolean;
  canGenerateBeat: boolean;
  showRemix: boolean;
  isSaving: boolean;
  isSharing: boolean;
  isUnsharing: boolean;
  isShared: boolean;
  isAIifying: boolean;
  isGeneratingBeat: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  tempo,
  onPlay,
  onStop,
  onTempoChange,
  onClear,
  onSave,
  onSaveAndShare,
  onUnshare,
  onAIify,
  onGenerateBeat,
  onRemix,
  canSave,
  canGenerateBeat,
  showRemix,
  isSaving,
  isSharing,
  isUnsharing,
  isShared,
  isAIifying,
  isGeneratingBeat,
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

      {/* Generate Beat button */}
      <Button
        variant="outline"
        onClick={onGenerateBeat}
        disabled={isGeneratingBeat || !canGenerateBeat}
        className="w-full"
      >
        {isGeneratingBeat ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4 mr-2" />
        )}
        Generate Beat
      </Button>

      {/* Remix button - only shows when a saved beat is loaded */}
      {showRemix && (
        <Button
          variant="outline"
          onClick={onRemix}
          className="w-full"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Remix
        </Button>
      )}

      {/* Create AI Track button */}
      <Button
        onClick={onAIify}
        disabled={!canSave || isAIifying}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
      >
        {isAIifying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating AI Track...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Create AI Track ✨
          </>
        )}
      </Button>

      {/* Save and Save & Share buttons - matching Coloring pattern */}
      <Button
        variant="outline"
        onClick={onSave}
        disabled={!canSave || isSaving}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {isSaving ? 'Saving...' : 'Save'}
      </Button>

      {isShared ? (
        <Button
          variant="secondary"
          onClick={onUnshare}
          disabled={!canSave || isUnsharing || isSaving}
          className="w-full"
        >
          {isUnsharing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Lock className="h-4 w-4 mr-2" />
          )}
          {isUnsharing ? 'Unsharing...' : 'Unshare'}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onSaveAndShare}
          disabled={!canSave || isSharing || isSaving}
          className="w-full"
        >
          {isSharing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 mr-2" />
          )}
          {isSharing ? 'Sharing...' : 'Save + Share'}
        </Button>
      )}
    </div>
  );
};

export default PlaybackControls;
