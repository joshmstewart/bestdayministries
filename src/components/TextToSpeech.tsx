import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechProps {
  text: string;
  voice?: 'Aria' | 'Roger' | 'Sarah' | 'Charlie' | 'Johnny Dynamite' | 'Grampa Werthers' | 'Batman' | 'Cherry Twinkle' | 'Creature' | 'Marshal' | 'Austin' | 'Jerry B.' | 'Maverick' | 'Grandma Muffin';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TextToSpeech = ({ 
  text, 
  voice,
  size = 'icon'
}: TextToSpeechProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [userVoice, setUserVoice] = useState<string>('Aria');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    const loadUserVoice = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tts_voice, tts_enabled')
          .eq('id', user.id)
          .single();
        
        if (profile?.tts_voice) {
          setUserVoice(profile.tts_voice);
        }
        if (profile?.tts_enabled !== undefined) {
          setTtsEnabled(profile.tts_enabled);
        }
      }
    };
    
    loadUserVoice();
  }, []);

  const handlePlay = async (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to parent elements
    e.stopPropagation();
    
    try {
      if (isPlaying && audio) {
        // Stop current playback
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);

      // Use passed voice prop or user's preferred voice
      const selectedVoice = voice || userVoice;
      
      console.log('TTS - Sending text to API:', text);
      console.log('TTS - Text length:', text.length);
      console.log('TTS - Voice:', selectedVoice);

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: selectedVoice }
      });

      if (error) throw error;

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      console.log('TTS - Received audio content, length:', data.audioContent.length);

      // Create audio element from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      console.log('TTS - Created audio blob, size:', audioBlob.size);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('TTS - Created audio URL:', audioUrl);
      
      const newAudio = new Audio(audioUrl);

      newAudio.onended = () => {
        console.log('TTS - Audio ended');
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      newAudio.onerror = (e) => {
        console.error('TTS - Audio error:', e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Playback Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };

      setAudio(newAudio);
      
      // Start playback immediately
      try {
        console.log('TTS - Starting playback...');
        await newAudio.play();
        console.log('TTS - Playback started successfully, currentTime after play:', newAudio.currentTime);
        setIsPlaying(true);
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
  };

  // Don't render if TTS is disabled
  if (!ttsEnabled) {
    return null;
  }

  return (
    <Button
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
};
