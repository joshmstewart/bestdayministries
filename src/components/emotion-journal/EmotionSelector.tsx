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

  const EmotionButton = ({ emotion }: { emotion: EmotionType }) => {
    const isSelected = selectedEmotion?.id === emotion.id;
    
    return (
      <button
        onClick={() => onSelect(emotion)}
        className={cn(
          "flex flex-col items-center p-3 rounded-2xl transition-all duration-300 border-2",
          "hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2",
          "bg-white/70 backdrop-blur-sm",
          isSelected
            ? "scale-110 shadow-xl border-current animate-pulse"
            : "border-transparent hover:border-current/30"
        )}
        style={{
          backgroundColor: isSelected ? `${emotion.color}30` : undefined,
          borderColor: isSelected ? emotion.color : undefined,
          boxShadow: isSelected ? `0 8px 32px ${emotion.color}40` : undefined,
          ['--tw-ring-color' as string]: emotion.color,
        }}
      >
        <span 
          className={cn(
            "text-5xl mb-2 transition-transform duration-300",
            isSelected && "animate-bounce"
          )} 
          role="img" 
          aria-label={emotion.name}
        >
          {emotion.emoji}
        </span>
        <span 
          className={cn(
            "text-sm font-semibold transition-colors",
            isSelected && "text-current"
          )}
          style={{ color: isSelected ? emotion.color : undefined }}
        >
          {emotion.name}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Positive Emotions */}
      {positiveEmotions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-green-100/50 to-emerald-100/50 border border-green-200">
          <h3 className="text-base font-bold text-green-700 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
            🌟 Positive Feelings
            <TextToSpeech 
              text={`Positive feelings: ${positiveEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {positiveEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}

      {/* Neutral Emotions */}
      {neutralEmotions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-100/50 to-gray-100/50 border border-slate-200">
          <h3 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-slate-400 to-gray-500" />
            😌 Neutral Feelings
            <TextToSpeech 
              text={`Neutral feelings: ${neutralEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {neutralEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}

      {/* Negative Emotions */}
      {negativeEmotions.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-100/50 to-red-100/50 border border-rose-200">
          <h3 className="text-base font-bold text-rose-700 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-400 to-red-500 animate-pulse" />
            💪 Challenging Feelings
            <TextToSpeech 
              text={`Challenging feelings: ${negativeEmotions.map(e => e.name).join(', ')}`} 
              size="icon" 
            />
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {negativeEmotions.map(emotion => (
              <EmotionButton key={emotion.id} emotion={emotion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
