import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/VoiceInput';
import { Pencil } from 'lucide-react';

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

export function JournalEntry({ value, onChange, emotion }: JournalEntryProps) {
  const handleVoiceTranscript = (text: string) => {
    onChange(text);
  };

  const prompts = [
    `What made you feel ${emotion.name.toLowerCase()}?`,
    'What happened today?',
    'Who were you with?',
    'What would help you feel better?',
  ];

  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          Want to say more? (Optional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Writing Prompt */}
        <p className="text-sm text-muted-foreground italic">
          💭 {randomPrompt}
        </p>

        {/* Voice Input */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium mb-3">🎤 Speak your thoughts:</p>
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            placeholder="Tap the microphone to speak..."
            showTranscript={false}
            maxDuration={120}
          />
        </div>

        {/* Text Area */}
        <div>
          <p className="text-sm font-medium mb-2">✍️ Or type here:</p>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write about your feelings..."
            className="min-h-[120px] text-base resize-none"
          />
        </div>

        {/* Character count */}
        <p className="text-xs text-muted-foreground text-right">
          {value.length} characters
        </p>
      </CardContent>
    </Card>
  );
}
