import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { audioManager } from "@/lib/audioManager";

interface TextToSpeechProps {
  text: string;
  voice?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onPlayingChange?: (isPlaying: boolean) => void;
}

// Cache TTS settings per user to avoid repeated fetches
const ttsSettingsCache = new Map<string, { voice: string; enabled: boolean }>();

export const TextToSpeech = memo(({ 
  text, 
  voice,
  size = 'icon',
  onPlayingChange
}: TextToSpeechProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const playbackRef = useRef<{ stop: () => void } | null>(null);
  const [userVoice, setUserVoice] = useState<string>('Sarah');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadUserVoice = async () => {
      if (!user) {
        // No user logged in - use defaults and allow TTS
        setSettingsLoaded(true);
        return;
      }

      // Check cache first
      const cached = ttsSettingsCache.get(user.id);
      if (cached) {
        setUserVoice(cached.voice);
        setTtsEnabled(cached.enabled);
        setSettingsLoaded(true);
        return;
      }

      // Fetch from DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('tts_voice, tts_enabled')
        .eq('id', user.id)
        .single();
      
      const fetchedVoice = profile?.tts_voice || 'Aria';
      const enabled = profile?.tts_enabled !== false;
      
      // Cache the result
      ttsSettingsCache.set(user.id, { voice: fetchedVoice, enabled });
      
      setUserVoice(fetchedVoice);
      setTtsEnabled(enabled);
      setSettingsLoaded(true);
    };
    
    loadUserVoice();
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
    
    try {
      if (isPlaying && playbackRef.current) {
        // Stop current playback
        playbackRef.current.stop();
        playbackRef.current = null;
        setIsPlaying(false);
        onPlayingChange?.(false);
        return;
      }

      setIsLoading(true);

      // Use passed voice prop or user's preferred voice
      const selectedVoice = voice || userVoice;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: selectedVoice }
      });

      if (error) throw error;

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Decode the base64 audio into an ArrayBuffer then AudioBuffer
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await audioManager.decodeBuffer(bytes.buffer);
      if (!audioBuffer) {
        throw new Error('Failed to decode audio');
      }

      // Play through AudioManager (ambient, mixes with music)
      const handle = audioManager.playBufferWithControl(audioBuffer, 1, () => {
        setIsPlaying(false);
        onPlayingChange?.(false);
      });

      playbackRef.current = handle;
      setIsPlaying(true);
      onPlayingChange?.(true);

    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate speech",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, voice, userVoice, text, onPlayingChange, toast]);

  // Don't render if TTS is disabled or settings not loaded yet
  if (!settingsLoaded || !ttsEnabled) {
    return null;
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handlePlay}
      disabled={isLoading}
      title={isPlaying ? "Stop reading" : "Read aloud"}
      className="shrink-0 bg-primary hover:bg-primary/90"
    >
      {isLoading ? (
        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
      ) : isPlaying ? (
        <Pause className="w-5 h-5" />
      ) : (
        <Play className="w-5 h-5 ml-0.5" />
      )}
    </Button>
  );
});

TextToSpeech.displayName = "TextToSpeech";
