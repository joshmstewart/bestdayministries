import { cn } from '@/lib/utils';
import { TextToSpeech } from '@/components/TextToSpeech';

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  coping_suggestions: string[] | null;
}

interface EmotionSelectorProps {
  emotions: EmotionType[];
  selectedEmotion: EmotionType | null;
  onSelect: (emotion: EmotionType) => void;
}

export function EmotionSelector({ emotions, selectedEmotion, onSelect }: EmotionSelectorProps) {
  // Group emotions by category
  const positiveEmotions = emotions.filter(e => e.category === 'positive');
  const negativeEmotions = emotions.filter(e => e.category === 'negative');
  const neutralEmotions = emotions.filter(e => e.category === 'neutral');

  const EmotionButton = ({ emotion }: { emotion: EmotionType }) => (
    <button
      onClick={() => onSelect(emotion)}
      className={cn(
        "flex flex-col items-center p-3 rounded-xl transition-all duration-200",
        "hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2",
        selectedEmotion?.id === emotion.id
          ? "ring-2 ring-offset-2 scale-110 shadow-lg"
          : "hover:bg-accent/50"
      )}
      style={{
        borderColor: selectedEmotion?.id === emotion.id ? emotion.color : 'transparent',
        backgroundColor: selectedEmotion?.id === emotion.id ? `${emotion.color}20` : undefined,
        ['--tw-ring-color' as string]: emotion.color,
      }}
    >
      <span className="text-4xl mb-1 transition-transform" role="img" aria-label={emotion.name}>
        {emotion.emoji}
      </span>
      <span className="text-xs font-medium">{emotion.name}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Positive Emotions */}
      {positiveEmotions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Positive Feelings
            <TextToSpeech 
              text={`Positive feelings: ${positiveEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {positiveEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}

      {/* Neutral Emotions */}
      {neutralEmotions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Neutral Feelings
            <TextToSpeech 
              text={`Neutral feelings: ${neutralEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {neutralEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}

      {/* Negative Emotions */}
      {negativeEmotions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Challenging Feelings
            <TextToSpeech 
              text={`Challenging feelings: ${negativeEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {negativeEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
