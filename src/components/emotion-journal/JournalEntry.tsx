import { useState, useCallback, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/VoiceInput';
import { TextToSpeech } from '@/components/TextToSpeech';

interface EmotionType {
  name: string;
  emoji: string;
  color: string;
}

interface JournalEntryProps {
  value: string;
  onChange: (value: string) => void;
  emotion: EmotionType;
}

export function JournalEntry({ value, onChange }: JournalEntryProps) {
  // Accumulate voice transcript separately, only merge when done
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const wasRecordingRef = useRef(false);

  const handleVoiceTranscript = useCallback((text: string) => {
    // Accumulate chunks from VoiceInput
    setVoiceTranscript(prev => prev ? `${prev} ${text}` : text);
    wasRecordingRef.current = true;
  }, []);

  // When recording stops and we have transcript, merge it into the main value
  // This is detected when VoiceInput calls onTranscript and then user interaction or unmount
  const mergeTranscriptToValue = useCallback(() => {
    if (voiceTranscript.trim()) {
      const newValue = value ? `${value} ${voiceTranscript}` : voiceTranscript;
      onChange(newValue);
      setVoiceTranscript('');
    }
  }, [voiceTranscript, value, onChange]);

  // Merge when component unmounts or when user starts typing
  useEffect(() => {
    return () => {
      // Cleanup: merge any pending transcript
    };
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // If user starts typing and there's pending voice transcript, merge it first
    if (voiceTranscript.trim()) {
      mergeTranscriptToValue();
    }
    onChange(e.target.value);
  };

  const handleTextareaFocus = () => {
    // Merge voice transcript when user focuses on textarea
    if (voiceTranscript.trim()) {
      mergeTranscriptToValue();
    }
  };

  return (
    <div className="space-y-4">
      {/* Voice Input */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          🎤 Speak your thoughts:
          <TextToSpeech text="Speak your thoughts. Tap the microphone button to start recording." size="icon" />
        </p>
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          placeholder="Tap the microphone to speak..."
          showTranscript={true}
          autoStop={true}
          silenceStopSeconds={15}
          maxDuration={0}
        />
        {/* Button to add voice transcript to text area */}
        {voiceTranscript.trim() && (
          <button
            type="button"
            onClick={mergeTranscriptToValue}
            className="mt-2 text-sm text-primary underline hover:no-underline"
          >
            ✓ Add to text below
          </button>
        )}
      </div>

      {/* Text Area */}
      <div>
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
          ✍️ Or type here:
          <TextToSpeech text="Or type here. Write about your feelings in the text box." size="icon" />
        </p>
        <Textarea
          value={value}
          onChange={handleTextareaChange}
          onFocus={handleTextareaFocus}
          placeholder="Write about your feelings..."
          className="min-h-[80px] text-base resize-none"
        />
      </div>

      {/* Listen to your text - shows when there's any content */}
      {value.trim() && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <TextToSpeech text={value} size="default" />
          <div className="flex-1">
            <p className="text-sm font-medium">🔊 Listen to your words</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{value.slice(0, 50)}...</p>
          </div>
        </div>
      )}
    </div>
  );
}
