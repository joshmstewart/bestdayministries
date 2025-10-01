import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechProps {
  text: string;
  voice?: 'Aria' | 'Roger' | 'Sarah' | 'Charlie';
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TextToSpeech = ({ 
  text, 
  voice,
  variant = 'ghost',
  size = 'icon'
}: TextToSpeechProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [userVoice, setUserVoice] = useState<string>('Aria');

  useEffect(() => {
    const loadUserVoice = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tts_voice')
          .eq('id', user.id)
          .single();
        
        if (profile?.tts_voice) {
          setUserVoice(profile.tts_voice);
        }
      }
    };
    
    loadUserVoice();
  }, []);

  const handlePlay = async () => {
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

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: selectedVoice }
      });

      if (error) throw error;

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Create audio element from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);

      newAudio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      newAudio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Playback Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      };

      setAudio(newAudio);
      await newAudio.play();
      setIsPlaying(true);

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

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePlay}
      disabled={isLoading}
      title={isPlaying ? "Stop reading" : "Read aloud"}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
};
