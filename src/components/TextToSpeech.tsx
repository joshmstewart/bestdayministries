import { useState, useEffect, useRef, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
    
    try {
      if (isPlaying && audioRef.current) {
        // Stop current playback
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
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

      // Create audio element from base64 using a data URI
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const newAudio = new Audio(audioUrl);

      newAudio.onended = () => {
        setIsPlaying(false);
        onPlayingChange?.(false);
      };

      newAudio.onerror = () => {
        setIsPlaying(false);
        toast({
          title: "Playback Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };

      audioRef.current = newAudio;
      
      // Start playback immediately
      try {
        await newAudio.play();
        setIsPlaying(true);
        onPlayingChange?.(true);
      } catch (playError) {
        console.error('TTS - Failed to play audio:', playError);
        toast({
          title: "Playback Error",
          description: "Failed to start audio playback",
          variant: "destructive",
        });
      }

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
