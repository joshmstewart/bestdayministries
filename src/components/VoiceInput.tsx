import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

  /**
   * If true, the recorder will auto-stop after `silenceStopSeconds` of no speech activity.
   * (Users can always click Stop manually.)
   */
  autoStop?: boolean;

  /** Max recording duration in seconds. Set to 0 to disable. */
  maxDuration?: number;

  /**
   * Seconds of no speech activity before auto-stopping (only used when `autoStop=true`).
   * Defaults to 30.
   */
  silenceStopSeconds?: number;
}

export function VoiceInput({
  onTranscript,
  onPartialTranscript,
  placeholder = 'Tap the microphone and speak...',
  className,
  buttonSize = 'default',
  showTranscript = true,
  autoStop = true,
  maxDuration = 120,
  silenceStopSeconds = 30,
}: VoiceInputProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [committedText, setCommittedText] = useState('');

  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechAtRef = useRef<number>(Date.now());
  const silenceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
  }, []);

  // Memoize handlers/options so `useScribe` doesn't recreate its internal client on every render.
  // A recreated client will drop the websocket and looks like "it stopped" after a couple seconds.
  const handleSessionStarted = useCallback(() => {
    console.log('[VoiceInput] Session started');
    lastSpeechAtRef.current = Date.now();
    toast.success('Listening... Speak now!');
  }, []);

  const handlePartial = useCallback(
    (data: { text: string }) => {
      console.log('[VoiceInput] Partial:', data.text);
      setPartialText(data.text);
      onPartialTranscript?.(data.text);

      if (data.text?.trim()) {
        lastSpeechAtRef.current = Date.now();
      }
    },
    [onPartialTranscript]
  );

  const handleCommitted = useCallback(
    (data: { text: string }) => {
      console.log('[VoiceInput] Committed:', data.text);
      const chunk = data.text?.trim();
      if (!chunk) return;

      lastSpeechAtRef.current = Date.now();
      setCommittedText((prev) => (prev ? `${prev} ${chunk}` : chunk));
      setPartialText('');

      // Send the NEW chunk; the parent can decide how to append.
      onTranscript(chunk);
    },
    [onTranscript]
  );

  const handleDisconnect = useCallback(() => {
    console.log('[VoiceInput] Disconnected');
    clearTimers();
  }, [clearTimers]);

  const handleError = useCallback((error: unknown) => {
    console.error('[VoiceInput] Scribe error:', error);
    // Don't show toast for every error - some are recoverable
  }, []);

  const handleAuthError = useCallback(() => {
    toast.error('Voice input authentication failed. Please try again.');
  }, []);

  const handleQuotaError = useCallback(() => {
    toast.error('Voice input quota exceeded. Please try again later.');
  }, []);

  const scribeOptions = useMemo(
    () => ({
      modelId: 'scribe_v2_realtime',
      commitStrategy: CommitStrategy.VAD,
      onSessionStarted: handleSessionStarted,
      onPartialTranscript: handlePartial,
      onCommittedTranscript: handleCommitted,
      onDisconnect: handleDisconnect,
      onError: handleError,
      onAuthError: handleAuthError,
      onQuotaExceededError: handleQuotaError,
    }),
    [
      handleSessionStarted,
      handlePartial,
      handleCommitted,
      handleDisconnect,
      handleError,
      handleAuthError,
      handleQuotaError,
    ]
  );

  // Use VAD (Voice Activity Detection) - the SDK handles commits automatically based on silence
  const scribe = useScribe(scribeOptions);

  // Keep a ref to the latest scribe instance for unmount cleanup.
  const scribeRef = useRef(scribe);
  useEffect(() => {
    scribeRef.current = scribe;
  }, [scribe]);

  // Auto-stop after long silence (30s by default)
  useEffect(() => {
    if (!scribe.isConnected) return;
    if (!autoStop) return;

    const silenceMs = Math.max(0, (silenceStopSeconds || 0) * 1000);
    if (silenceMs <= 0) return;

    silenceCheckIntervalRef.current = setInterval(() => {
      const sinceSpeech = Date.now() - lastSpeechAtRef.current;
      if (sinceSpeech >= silenceMs) {
        console.log('[VoiceInput] Auto-stopping after silence');
        handleStop(true);
        toast.info('Stopped after silence');
      }
    }, 1000);

    return () => {
      if (silenceCheckIntervalRef.current) {
        clearInterval(silenceCheckIntervalRef.current);
        silenceCheckIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scribe.isConnected, autoStop, silenceStopSeconds]);

  // Auto-stop after max duration
  useEffect(() => {
    if (!scribe.isConnected) return;
    if (!maxDuration || maxDuration <= 0) return;

    maxDurationTimeoutRef.current = setTimeout(() => {
      console.log('[VoiceInput] Max duration reached');
      handleStop(true);
      toast.info('Recording stopped - maximum duration reached');
    }, maxDuration * 1000);

    return () => {
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scribe.isConnected, maxDuration]);

  // Cleanup ONLY on unmount (do not depend on `scribe`, otherwise some renders recreate the client and this cleanup runs)
  useEffect(() => {
    return () => {
      clearTimers();
      if (scribeRef.current?.isConnected) {
        scribeRef.current.disconnect();
      }
    };
  }, [clearTimers]);

  const handleStart = useCallback(async () => {
    setIsConnecting(true);
    setCommittedText('');
    setPartialText('');
    lastSpeechAtRef.current = Date.now();

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

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
    } finally {
      setIsConnecting(false);
    }
  }, [scribe]);

  const handleStop = useCallback(
    (fromAutoStop = false) => {
      clearTimers();

      if (!scribe.isConnected) return;

      scribe.disconnect();

      if (!fromAutoStop) {
        toast.success('Stopped');
      }
    },
    [clearTimers, scribe]
  );

  const handleToggle = useCallback(() => {
    if (scribe.isConnected) {
      handleStop(false);
    } else {
      handleStart();
    }
  }, [scribe.isConnected, handleStart, handleStop]);

  const displayText = partialText || committedText;
  const isActive = scribe.isConnected || isConnecting;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={isActive ? 'destructive' : 'outline'}
          size={buttonSize}
          onClick={handleToggle}
          disabled={isConnecting}
          className={cn('relative transition-all duration-300', isActive && 'animate-pulse')}
          title={isActive ? 'Stop recording' : 'Start recording'}
        >
          {isConnecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isActive ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5 text-red-500" strokeWidth={2.5} />
          )}
          {buttonSize !== 'icon' && (
            <span className="ml-2">{isConnecting ? 'Connecting...' : isActive ? 'Stop' : 'Speak'}</span>
          )}

          {isActive && !isConnecting && (
            <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-green-500 animate-ping" />
          )}
        </Button>

        {isActive && !isConnecting && (
          <div className="flex items-center gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${8 + i * 4}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showTranscript && (
        <div
          className={cn(
            'min-h-[60px] p-3 rounded-lg border bg-muted/50 transition-colors',
            isActive && 'border-primary/50 bg-muted'
          )}
        >
          {displayText ? (
            <p className="text-sm">
              {committedText && <span>{committedText} </span>}
              {partialText && <span className="text-muted-foreground italic">{partialText}</span>}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{isActive ? 'Listening...' : placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
