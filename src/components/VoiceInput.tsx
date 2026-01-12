import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  placeholder?: string;
  className?: string;
  buttonSize?: 'sm' | 'default' | 'lg' | 'icon';
  showTranscript?: boolean;
  autoStop?: boolean; // Auto-stop after silence (uses VAD)
  maxDuration?: number; // Max recording duration in seconds
}

export function VoiceInput({
  onTranscript,
  onPartialTranscript,
  placeholder = "Tap the microphone and speak...",
  className,
  buttonSize = 'default',
  showTranscript = true,
  autoStop = true,
  maxDuration = 60,
}: VoiceInputProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [committedText, setCommittedText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    // Use the enum values properly
    commitStrategy: autoStop ? CommitStrategy.VAD : CommitStrategy.MANUAL,
    // Optimize VAD settings for users with speech impediments
    // Longer silence threshold to avoid cutting off slower speech
    vadSilenceThresholdSecs: 1.5,
    // Lower VAD threshold for quieter speech
    vadThreshold: 0.3,
    // Shorter minimum speech to catch brief utterances
    minSpeechDurationMs: 100,
    // Longer silence duration before committing
    minSilenceDurationMs: 1200,
    onSessionStarted: () => {
      setIsListening(true);
    },
    onPartialTranscript: (data) => {
      setPartialText(data.text);
      onPartialTranscript?.(data.text);
    },
    onCommittedTranscript: (data) => {
      const newText = committedText ? `${committedText} ${data.text}` : data.text;
      setCommittedText(newText);
      setPartialText('');
      onTranscript(newText);
    },
    onConnect: () => {
      setIsListening(true);
      toast.success('Listening... Speak now!');
    },
    onDisconnect: () => {
      setIsListening(false);
    },
    onError: (error) => {
      console.error('Scribe error:', error);
      setIsListening(false);
    },
    onAuthError: () => {
      toast.error('Authentication failed. Please try again.');
      setIsListening(false);
    },
    onQuotaExceededError: () => {
      toast.error('Usage quota exceeded. Please try again later.');
      setIsListening(false);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, [scribe]);

  // Auto-stop after max duration
  useEffect(() => {
    if (scribe.isConnected && maxDuration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleStop();
        toast.info('Recording stopped - maximum duration reached');
      }, maxDuration * 1000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [scribe.isConnected, maxDuration]);

  const handleStart = useCallback(async () => {
    setIsConnecting(true);
    setCommittedText('');
    setPartialText('');

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

      // Connect with optimized settings for speech impediments
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      console.error('Failed to start voice input:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please enable microphone permissions.');
      } else {
        toast.error('Failed to start voice input. Please try again.');
      }
      setIsListening(false);
    } finally {
      setIsConnecting(false);
    }
  }, [scribe]);

  const handleStop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If using manual commit, commit any remaining text
    if (!autoStop && partialText) {
      scribe.commit();
    }

    scribe.disconnect();
    setIsListening(false);
  }, [scribe, autoStop, partialText]);

  const handleToggle = useCallback(() => {
    if (scribe.isConnected) {
      handleStop();
    } else {
      handleStart();
    }
  }, [scribe.isConnected, handleStart, handleStop]);

  const displayText = partialText || committedText;
  const isActive = scribe.isConnected || isConnecting || isListening;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={isActive ? "destructive" : "outline"}
          size={buttonSize}
          onClick={handleToggle}
          disabled={isConnecting}
          className={cn(
            "relative transition-all duration-300",
            isActive && "animate-pulse"
          )}
        >
          {isConnecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isActive ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5 text-red-500" strokeWidth={2.5} />
          )}
          {buttonSize !== 'icon' && (
            <span className="ml-2">
              {isConnecting ? 'Connecting...' : isActive ? 'Stop' : 'Speak'}
            </span>
          )}
          
          {/* Pulsing indicator when active */}
          {isActive && !isConnecting && (
            <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-green-500 animate-ping" />
          )}
        </Button>

        {/* Visual feedback - animated bars when listening */}
        {isActive && !isConnecting && (
          <div className="flex items-center gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${8 + (i * 4)}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transcript display */}
      {showTranscript && (
        <div 
          className={cn(
            "min-h-[60px] p-3 rounded-lg border bg-muted/50 transition-colors",
            isActive && "border-primary/50 bg-muted"
          )}
        >
          {displayText ? (
            <p className="text-sm">
              {committedText && <span>{committedText} </span>}
              {partialText && (
                <span className="text-muted-foreground italic">{partialText}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isActive ? "Listening..." : placeholder}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
