import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TextToSpeech } from '@/components/TextToSpeech';
import { Volume2, VolumeX } from 'lucide-react';

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

// Shared with DailyBar mood module
const TTS_STORAGE_KEY = 'dailybar-mood-tts-enabled';

export function EmotionSelector({ emotions, selectedEmotion, onSelect }: EmotionSelectorProps) {
  // TTS toggle state - persisted in localStorage
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(TTS_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Persist TTS preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TTS_STORAGE_KEY, String(ttsEnabled));
    } catch (e) {
      console.warn('Failed to persist emotion journal TTS preference:', e);
    }
  }, [ttsEnabled]);

  // Order emotions: positive first, then neutral, then negative (matching DailyBar mood order)
  const categoryOrder = { positive: 0, neutral: 1, negative: 2 };
  const orderedEmotions = [...emotions].sort((a, b) => {
    const aOrder = categoryOrder[a.category as keyof typeof categoryOrder] ?? 1;
    const bOrder = categoryOrder[b.category as keyof typeof categoryOrder] ?? 1;
    return aOrder - bOrder;
  });

  const allEmotionNames = orderedEmotions.map(e => e.name).join(', ');

  return (
    <div className="space-y-3">
      {/* Header with TTS toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-green-600 via-gray-500 to-red-500 bg-clip-text text-transparent">
            How are you feeling?
          </span>
          {ttsEnabled && (
            <TextToSpeech 
              text={`How are you feeling? Choose from: ${allEmotionNames}`} 
              size="icon" 
            />
          )}
        </div>
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={cn(
            "p-2 rounded-full transition-all duration-200",
            "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
            ttsEnabled 
              ? "bg-primary/10 text-primary" 
              : "bg-muted/50 text-muted-foreground"
          )}
          title={ttsEnabled ? "Turn off voice reading" : "Turn on voice reading"}
        >
          {ttsEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Emotion grid - 4 per row matching DailyBar */}
      <div className="grid grid-cols-4 gap-1.5">
        {orderedEmotions.map((emotion) => {
          const isSelected = selectedEmotion?.id === emotion.id;
          
          return (
            <button
              key={emotion.id}
              onClick={() => onSelect(emotion)}
              className={cn(
                "flex flex-col items-center p-1.5 rounded-lg transition-all duration-300",
                "hover:scale-105 focus:outline-none focus-visible:outline-none",
                isSelected && "scale-105"
              )}
            >
              <div 
                className={cn(
                  "w-14 h-14 flex items-center justify-center rounded-full transition-all",
                  isSelected ? "shadow-lg" : "hover:shadow-md"
                )}
                style={{
                  backgroundColor: isSelected ? `${emotion.color}30` : undefined,
                  boxShadow: isSelected 
                    ? `0 0 0 3px ${emotion.color}, 0 0 0 5px white, 0 0 0 7px ${emotion.color}40` 
                    : undefined,
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
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <span 
                  className={cn(
                    "text-xs font-medium transition-colors text-center",
                    isSelected ? "font-bold" : "text-gray-700"
                  )}
                  style={{ color: isSelected ? emotion.color : undefined }}
                >
                  {emotion.name}
                </span>
                {isSelected && ttsEnabled && (
                  <div onClick={(e) => e.stopPropagation()} className="scale-75">
                    <TextToSpeech 
                      text={`I'm feeling ${emotion.name}`} 
                      size="icon"
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Category indicators */}
      <div className="flex justify-between px-2 text-xs font-medium">
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
  );
}
