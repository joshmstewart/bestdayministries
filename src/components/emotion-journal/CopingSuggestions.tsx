import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Heart } from 'lucide-react';

interface CopingSuggestionsProps {
  emotion: string;
  emoji: string;
  suggestions: string[];
}

export function CopingSuggestions({ emotion, emoji, suggestions }: CopingSuggestionsProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Lightbulb className="h-5 w-5" />
          Things That Might Help
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          It's okay to feel {emotion.toLowerCase()} {emoji}. Here are some ideas:
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-3">
              <Heart className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
              <span className="text-sm">{suggestion}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
