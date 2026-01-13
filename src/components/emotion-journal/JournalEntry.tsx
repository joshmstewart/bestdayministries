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
  const handleVoiceTranscript = (text: string) => {
    const newValue = value ? `${value} ${text}` : text;
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      {/* Voice Input */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <p className="text-sm font-medium mb-2">🎤 Speak your thoughts:</p>
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          placeholder="Tap the microphone to speak..."
          showTranscript={true}
          autoStop={true}
          silenceStopSeconds={15}
          maxDuration={0}
        />
      </div>

      {/* Text Area */}
      <div>
        <p className="text-sm font-medium mb-2">✍️ Or type here:</p>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write about your feelings..."
          className="min-h-[80px] text-base resize-none"
        />
      </div>

      {/* Listen to your text */}
      {value.trim() && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <TextToSpeech text={value} size="default" />
          <p className="text-sm font-medium">🔊 Listen to your words</p>
        </div>
      )}
    </div>
  );
}
