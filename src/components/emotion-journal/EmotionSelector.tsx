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
  // Order emotions: positive first, then neutral, then negative (for the wave gradient)
  const positiveEmotions = emotions.filter(e => e.category === 'positive');
  const neutralEmotions = emotions.filter(e => e.category === 'neutral');
  const negativeEmotions = emotions.filter(e => e.category === 'negative');
  const orderedEmotions = [...positiveEmotions, ...neutralEmotions, ...negativeEmotions];

  // Calculate wave offset for each emotion
  const getWaveOffset = (index: number, total: number) => {
    const progress = index / (total - 1);
    const wave = Math.sin(progress * Math.PI) * 20;
    return wave;
  };

  const EmotionButton = ({ emotion, index, total }: { emotion: EmotionType; index: number; total: number }) => {
    const isSelected = selectedEmotion?.id === emotion.id;
    const waveOffset = getWaveOffset(index, total);
    
    return (
      <button
        onClick={() => onSelect(emotion)}
        className={cn(
          "flex flex-col items-center p-2 rounded-xl transition-all duration-300",
          "hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2",
          "bg-white/80 backdrop-blur-sm border-2",
          isSelected
            ? "scale-110 shadow-xl animate-pulse"
            : "border-transparent hover:border-white/50"
        )}
        style={{
          transform: `translateY(${isSelected ? waveOffset - 5 : waveOffset}px) ${isSelected ? 'scale(1.1)' : ''}`,
          backgroundColor: isSelected ? `${emotion.color}40` : undefined,
          borderColor: isSelected ? emotion.color : undefined,
          boxShadow: isSelected ? `0 4px 20px ${emotion.color}50` : undefined,
          ['--tw-ring-color' as string]: emotion.color,
        }}
      >
        <span 
          className={cn(
            "text-3xl transition-transform duration-300",
            isSelected && "animate-bounce"
          )} 
          role="img" 
          aria-label={emotion.name}
        >
          {emotion.emoji}
        </span>
        <span 
          className={cn(
            "text-xs font-medium mt-1 transition-colors",
            isSelected ? "font-bold" : "text-gray-700"
          )}
          style={{ color: isSelected ? emotion.color : undefined }}
        >
          {emotion.name}
        </span>
      </button>
    );
  };

  const allEmotionNames = orderedEmotions.map(e => e.name).join(', ');

  return (
    <div className="space-y-4">
      {/* Wave container with gradient background */}
      <div 
        className="relative p-6 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.2) 25%, rgba(156, 163, 175, 0.2) 50%, rgba(239, 68, 68, 0.2) 75%, rgba(239, 68, 68, 0.3) 100%)'
        }}
      >
        {/* Decorative wave SVG background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d="M0,50 Q25,30 50,50 T100,50"
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="2"
          />
        </svg>

        {/* Header with TTS */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-lg font-bold bg-gradient-to-r from-green-600 via-gray-500 to-red-500 bg-clip-text text-transparent">
            How are you feeling?
          </span>
          <TextToSpeech 
            text={`How are you feeling? Choose from: ${allEmotionNames}`} 
            size="icon" 
          />
        </div>

        {/* Emotion wave */}
        <div className="flex flex-wrap justify-center items-center gap-2 relative py-4">
          {orderedEmotions.map((emotion, index) => (
            <EmotionButton 
              key={emotion.id} 
              emotion={emotion} 
              index={index}
              total={orderedEmotions.length}
            />
          ))}
        </div>

        {/* Category indicators */}
        <div className="flex justify-between mt-4 px-4 text-xs font-medium">
          <span className="text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Happy
          </span>
          <span className="text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Neutral
          </span>
          <span className="text-red-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Challenging
          </span>
        </div>
      </div>
    </div>
  );
}
