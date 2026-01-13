import { useState, useCallback, useEffect, useRef } from 'react';
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
   * Defaults to 15.
   */
  silenceStopSeconds?: number;
}

const COMMIT_AFTER_SILENCE_MS = 1200;
const MIN_MS_BETWEEN_COMMITS = 1200;

export function VoiceInput({
  onTranscript,
  onPartialTranscript,
  placeholder = 'Tap the microphone and speak...',
  className,
  buttonSize = 'default',
  showTranscript = true,
  autoStop = true,
  maxDuration = 60,
  silenceStopSeconds = 15,
}: VoiceInputProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [committedText, setCommittedText] = useState('');

  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSpeechAtRef = useRef<number>(Date.now());
  const lastCommitAtRef = useRef<number>(0);
  const disconnectAfterNextCommitRef = useRef(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(false);

  const clearTimers = useCallback(() => {
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }
  }, []);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',

    // We keep this MANUAL and do our own committing, so the mic keeps recording
    // until the user stops it (or we hit the longer silence auto-stop).
    commitStrategy: CommitStrategy.MANUAL,

    onSessionStarted: () => {
      lastSpeechAtRef.current = Date.now();
      toast.success('Listening... Speak now!');
    },
    onPartialTranscript: (data) => {
      setPartialText(data.text);
      onPartialTranscript?.(data.text);

      if (data.text?.trim()) {
        lastSpeechAtRef.current = Date.now();
      }
    },
    onCommittedTranscript: (data) => {
      const chunk = data.text?.trim();
      if (!chunk) return;

      setCommittedText((prev) => (prev ? `${prev} ${chunk}` : chunk));
      setPartialText('');

      // IMPORTANT: send only the NEW chunk; the parent can decide how to append.
      onTranscript(chunk);

      if (disconnectAfterNextCommitRef.current) {
        disconnectAfterNextCommitRef.current = false;
        setPendingDisconnect(true);
      }
    },
    onDisconnect: () => {
      clearTimers();
    },
    onError: (error) => {
      console.error('Scribe error:', error);
      toast.error('Voice input error — please try again.');
    },
    onAuthError: () => {
      toast.error('Voice input authentication failed. Please try again.');
    },
    onQuotaExceededError: () => {
      toast.error('Voice input quota exceeded. Please try again later.');
    },
  });

  // Keep a steady stream of committed transcripts while speaking by committing
  // after a short pause in partial transcript updates.
  useEffect(() => {
    if (!scribe.isConnected) return;

    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }

    if (!partialText?.trim()) return;

    commitTimeoutRef.current = setTimeout(() => {
      if (!scribe.isConnected) return;
      if (!partialText?.trim()) return;

      const now = Date.now();
      if (now - lastCommitAtRef.current < MIN_MS_BETWEEN_COMMITS) return;

      lastCommitAtRef.current = now;
      scribe.commit();
    }, COMMIT_AFTER_SILENCE_MS);

    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
    };
  }, [partialText, scribe]);

  // Auto-stop after long silence (15s by default)
  useEffect(() => {
    if (!scribe.isConnected) return;
    if (!autoStop) return;

    const silenceMs = Math.max(0, (silenceStopSeconds || 0) * 1000);
    if (silenceMs <= 0) return;

    const interval = setInterval(() => {
      const sinceSpeech = Date.now() - lastSpeechAtRef.current;
      if (sinceSpeech >= silenceMs) {
        // Stop and tell the user why.
        handleStop(true);
        toast.info('Stopped after silence');
      }
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scribe.isConnected, autoStop, silenceStopSeconds]);

  // Auto-stop after max duration
  useEffect(() => {
    if (!scribe.isConnected) return;
    if (!maxDuration || maxDuration <= 0) return;

    maxDurationTimeoutRef.current = setTimeout(() => {
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

  // Disconnect after final commit when stopping
  useEffect(() => {
    if (!pendingDisconnect) return;
    if (!scribe.isConnected) {
      setPendingDisconnect(false);
      return;
    }

    scribe.disconnect();
    setPendingDisconnect(false);
  }, [pendingDisconnect, scribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, [clearTimers, scribe]);

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

      // If we have uncommitted partial text, commit it first, then disconnect.
      if (partialText?.trim()) {
        disconnectAfterNextCommitRef.current = true;

        const now = Date.now();
        if (now - lastCommitAtRef.current >= MIN_MS_BETWEEN_COMMITS) {
          lastCommitAtRef.current = now;
          scribe.commit();
        }

        // Safety net: if commit callback never fires, disconnect anyway.
        setTimeout(() => {
          if (scribe.isConnected && disconnectAfterNextCommitRef.current) {
            disconnectAfterNextCommitRef.current = false;
            scribe.disconnect();
          }
        }, 1200);

        return;
      }

      scribe.disconnect();

      if (!fromAutoStop) {
        toast.success('Stopped');
      }
    },
    [clearTimers, partialText, scribe]
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
