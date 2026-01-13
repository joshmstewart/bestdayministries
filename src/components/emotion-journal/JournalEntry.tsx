import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInput } from '@/components/VoiceInput';
import { Pencil } from 'lucide-react';
import { useState, useMemo } from 'react';

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
  // Generate a stable random prompt on mount (not on every render)
  const randomPrompt = useMemo(() => {
    const prompts = [
      `What made you feel ${emotion.name.toLowerCase()}?`,
      'What happened today?',
      'Who were you with?',
      'What would help you feel better?',
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [emotion.name]);

  const handleVoiceTranscript = (text: string) => {
    // Append transcribed text to existing value
    const newValue = value ? `${value} ${text}` : text;
    onChange(newValue);
  };

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

        {/* Voice Input - shows transcript and populates textarea */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium mb-3">🎤 Speak your thoughts:</p>
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            placeholder="Tap the microphone to speak... Your words will appear here and be added to the text below."
            showTranscript={true}
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
