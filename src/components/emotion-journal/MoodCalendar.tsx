import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isSameMonth } from 'date-fns';
import { useAvatarEmotionImages } from '@/hooks/useAvatarEmotionImages';

interface MoodCalendarProps {
  userId: string;
}

interface MoodEntry {
  entry_date: string;
  mood_emoji: string;
  mood_label: string;
}

// Map mood categories to colors
const getMoodColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'positive':
      return 'bg-green-400';
    case 'neutral':
      return 'bg-yellow-400';
    case 'negative':
      return 'bg-red-400';
    default:
      return 'bg-muted';
  }
};

export function MoodCalendar({ userId }: MoodCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<Map<string, MoodEntry>>(new Map());
  const [emotionCategories, setEmotionCategories] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load avatar emotion images
  const { imagesByEmotionName, hasAvatar } = useAvatarEmotionImages(userId);

  useEffect(() => {
    loadEmotionTypes();
  }, []);

  useEffect(() => {
    if (emotionCategories.size > 0) {
      loadMonthEntries();
    }
  }, [userId, currentMonth, emotionCategories]);

  const loadEmotionTypes = async () => {
    const { data } = await supabase
      .from('emotion_types')
      .select('name, category');
    
    if (data) {
      const categoryMap = new Map<string, string>();
      data.forEach(e => categoryMap.set(e.name, e.category));
      setEmotionCategories(categoryMap);
    }
  };

  const loadMonthEntries = async () => {
    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('mood_entries')
      .select('entry_date, mood_emoji, mood_label')
      .eq('user_id', userId)
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd);

    if (!error && data) {
      const entryMap = new Map<string, MoodEntry>();
      data.forEach(entry => {
        entryMap.set(entry.entry_date, entry);
      });
      setEntries(entryMap);
    }
    setLoading(false);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const canGoNext = !isSameMonth(currentMonth, new Date());

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Mood Calendar
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToPrevMonth}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium min-w-[80px] text-center">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6"
            onClick={goToNextMonth}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          </div>
        ) : (
        <>
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="w-6 h-6" />
              ))}
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const entry = entries.get(dateStr);
                const category = entry ? emotionCategories.get(entry.mood_label) : null;
                const colorClass = category ? getMoodColor(category) : '';
                const avatarImage = entry ? imagesByEmotionName[entry.mood_label] : null;

                return (
                  <div
                    key={dateStr}
                    className="w-6 h-6 flex items-center justify-center"
                    title={entry ? `${entry.mood_label}` : undefined}
                  >
                    {entry && avatarImage?.url ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-muted">
                        <img
                          src={avatarImage.url}
                          alt={entry.mood_label}
                          className="w-full h-full object-cover"
                          style={{
                            transform: `scale(${avatarImage.cropScale})`,
                            transformOrigin: 'center',
                          }}
                        />
                      </div>
                    ) : (
                      <div className={`
                        w-5 h-5 rounded-full flex items-center justify-center text-[9px]
                        ${entry ? colorClass : 'bg-muted/30'}
                        ${entry ? 'text-white font-medium' : 'text-muted-foreground'}
                      `}>
                        {entry ? entry.mood_emoji : format(day, 'd')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-3 mt-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-muted-foreground">Positive</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-muted-foreground">Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-muted-foreground">Negative</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
