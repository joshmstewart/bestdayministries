import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Play, Pause, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTION_PROMPTS = [
  { label: 'Deep Kick', prompt: 'Deep punchy electronic kick drum with sub bass' },
  { label: 'Laser Zap', prompt: 'Retro 8-bit arcade laser zap sound' },
  { label: 'Tribal Drum', prompt: 'Deep tribal drum hit with reverb' },
  { label: 'Glitch', prompt: 'Digital glitch sound effect short burst' },
  { label: 'Whoosh', prompt: 'Quick swoosh whoosh transition sound' },
  { label: 'Chime', prompt: 'Bright magical chime bell hit' },
  { label: 'Bass Drop', prompt: 'Heavy bass drop with wobble' },
  { label: 'Synth Hit', prompt: 'Punchy synthetic chord hit' },
];

interface GeneratedSound {
  url: string;
  prompt: string;
}

export const AIGenerateSoundSection: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState([2]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSound, setGeneratedSound] = useState<GeneratedSound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for your sound');
      return;
    }

    setIsGenerating(true);
    
    // Clean up previous sound
    if (generatedSound) {
      URL.revokeObjectURL(generatedSound.url);
      setGeneratedSound(null);
    }

    try {
      toast.info('Creating your sound effect... ✨', { duration: 3000 });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-sfx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            prompt: prompt.trim(),
            duration: duration[0],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate sound: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setGeneratedSound({ url: audioUrl, prompt: prompt.trim() });
      toast.success('Sound effect created! 🎵');
      
      // Auto-play the generated sound
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error generating sound:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate sound');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !generatedSound) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!generatedSound) return;
    
    const a = document.createElement('a');
    a.href = generatedSound.url;
    a.download = `ai-sound-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Sound downloaded!');
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Sound Generator</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe any sound and AI will create it for you!
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SUGGESTION_PROMPTS.map((suggestion) => (
          <Button
            key={suggestion.label}
            variant="outline"
            size="sm"
            onClick={() => handleSuggestionClick(suggestion.prompt)}
            className="text-xs h-7"
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      {/* Input section */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="prompt" className="text-sm">Sound Description</Label>
          <Input
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Deep punchy kick drum with reverb"
            className="mt-1"
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
          />
        </div>

        <div>
          <Label className="text-sm">Duration: {duration[0]}s</Label>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={0.5}
            max={5}
            step={0.5}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">0.5s - 5s (shorter = faster generation)</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Sound...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Sound
            </>
          )}
        </Button>
      </div>

      {/* Generated sound player */}
      {generatedSound && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium truncate">Your AI Sound</p>
                <p className="text-xs text-muted-foreground truncate">{generatedSound.prompt}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlayback}
                  className="h-8 w-8"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDownload}
                  className="h-8 w-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <audio
              ref={audioRef}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIGenerateSoundSection;
