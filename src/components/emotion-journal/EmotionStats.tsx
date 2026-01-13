import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Award, BarChart2 } from 'lucide-react';
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns';

interface EmotionStats {
  totalEntries: number;
  mostFrequentEmotion: { emotion: string; emoji: string; count: number } | null;
  weeklyBreakdown: { [key: string]: number };
  averageIntensity: number;
  streakDays: number;
}

interface EmotionStatsProps {
  userId: string;
}

export function EmotionStats({ userId }: EmotionStatsProps) {
  const [stats, setStats] = useState<EmotionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get all entries for the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const { data: entries, error } = await supabase
        .from('emotion_journal_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        setStats({
          totalEntries: 0,
          mostFrequentEmotion: null,
          weeklyBreakdown: {},
          averageIntensity: 0,
          streakDays: 0,
        });
        return;
      }

      // Calculate most frequent emotion
      const emotionCounts: { [key: string]: { count: number; emoji: string } } = {};
      entries.forEach(entry => {
        if (!emotionCounts[entry.emotion]) {
          emotionCounts[entry.emotion] = { count: 0, emoji: entry.emotion_emoji };
        }
        emotionCounts[entry.emotion].count++;
      });

      const sortedEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1].count - a[1].count);
      
      const mostFrequent = sortedEmotions[0];

      // Calculate weekly breakdown (this week)
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      
      const weeklyBreakdown: { [key: string]: number } = {
        Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
      };

      entries.forEach(entry => {
        const entryDate = new Date(entry.created_at);
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          const day = format(entryDate, 'EEE');
          weeklyBreakdown[day]++;
        }
      });

      // Calculate average intensity
      const avgIntensity = entries.reduce((sum, e) => sum + e.intensity, 0) / entries.length;

      // Calculate streak (consecutive days with at least one entry)
      const uniqueDays = new Set(
        entries.map(e => format(new Date(e.created_at), 'yyyy-MM-dd'))
      );
      
      let streak = 0;
      let checkDate = new Date();
      
      while (uniqueDays.has(format(checkDate, 'yyyy-MM-dd'))) {
        streak++;
        checkDate = subDays(checkDate, 1);
      }

      setStats({
        totalEntries: entries.length,
        mostFrequentEmotion: mostFrequent 
          ? { emotion: mostFrequent[0], emoji: mostFrequent[1].emoji, count: mostFrequent[1].count }
          : null,
        weeklyBreakdown,
        averageIntensity: Math.round(avgIntensity * 10) / 10,
        streakDays: streak,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalEntries === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No patterns yet</h3>
          <p className="text-muted-foreground mt-1">
            Log your feelings to see patterns over time!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">📝</div>
            <div className="text-3xl font-bold">{stats.totalEntries}</div>
            <div className="text-sm text-muted-foreground">Entries (30 days)</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">🔥</div>
            <div className="text-3xl font-bold">{stats.streakDays}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Frequent Emotion */}
      {stats.mostFrequentEmotion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Most Common Feeling
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="text-6xl mb-3">{stats.mostFrequentEmotion.emoji}</div>
            <div className="text-xl font-medium">{stats.mostFrequentEmotion.emotion}</div>
            <div className="text-sm text-muted-foreground">
              Logged {stats.mostFrequentEmotion.count} times
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end h-32">
            {Object.entries(stats.weeklyBreakdown).map(([day, count]) => (
              <div key={day} className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 rounded-t-md bg-primary transition-all"
                  style={{ 
                    height: count === 0 ? 4 : Math.max(16, count * 24),
                    opacity: count === 0 ? 0.3 : 1
                  }}
                />
                <span className="text-xs text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Intensity */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Average Intensity</div>
              <div className="text-2xl font-bold">{stats.averageIntensity} / 5</div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i <= Math.round(stats.averageIntensity)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
