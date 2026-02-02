import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mood Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextMonth}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
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
                    className="aspect-square flex items-center justify-center relative"
                    title={entry ? `${entry.mood_label}` : undefined}
                  >
                    {entry && avatarImage?.url ? (
                      // Show avatar image
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
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
                      // Show emoji or date number
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs
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
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-muted-foreground">Positive</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-muted-foreground">Neutral</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-muted-foreground">Negative</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
