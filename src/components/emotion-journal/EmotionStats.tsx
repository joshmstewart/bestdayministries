import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Award, BarChart2 } from 'lucide-react';
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns';

interface MoodStats {
  totalEntries: number;
  topMoods: { mood: string; emoji: string; count: number }[];
  weeklyBreakdown: { [key: string]: number };
  streakDays: number;
}

interface EmotionStatsProps {
  userId: string;
}

export function EmotionStats({ userId }: EmotionStatsProps) {
  const [stats, setStats] = useState<MoodStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Get all entries for the last 30 days
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data: entries, error } = await supabase
        .from('mood_entries')
        .select('id, mood_emoji, mood_label, entry_date')
        .eq('user_id', userId)
        .gte('entry_date', thirtyDaysAgo)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        setStats({
          totalEntries: 0,
          topMoods: [],
          weeklyBreakdown: {},
          streakDays: 0,
        });
        return;
      }

      // Calculate mood counts
      const moodCounts: { [key: string]: { count: number; emoji: string } } = {};
      entries.forEach(entry => {
        if (!moodCounts[entry.mood_label]) {
          moodCounts[entry.mood_label] = { count: 0, emoji: entry.mood_emoji };
        }
        moodCounts[entry.mood_label].count++;
      });

      const sortedMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1].count - a[1].count);
      
      // Get all moods with the highest count (up to 3)
      const maxCount = sortedMoods[0]?.[1].count || 0;
      const topMoods = sortedMoods
        .filter(([, data]) => data.count === maxCount)
        .slice(0, 3)
        .map(([mood, data]) => ({ mood, emoji: data.emoji, count: data.count }));

      // Calculate weekly breakdown (this week)
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
      
      const weeklyBreakdown: { [key: string]: number } = {
        Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
      };

      entries.forEach(entry => {
        const entryDate = new Date(entry.entry_date + 'T12:00:00');
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          const day = format(entryDate, 'EEE');
          weeklyBreakdown[day]++;
        }
      });

      // Calculate streak (consecutive days with at least one entry)
      const uniqueDays = new Set(entries.map(e => e.entry_date));
      
      let streak = 0;
      let checkDate = new Date();
      
      while (uniqueDays.has(format(checkDate, 'yyyy-MM-dd'))) {
        streak++;
        checkDate = subDays(checkDate, 1);
      }

      setStats({
        totalEntries: entries.length,
        topMoods,
        weeklyBreakdown,
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

      {/* Most Common Feelings - shows ties */}
      {stats.topMoods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              {stats.topMoods.length === 1 ? 'Most Common Feeling' : 'Most Common Feelings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className={`grid gap-4 ${stats.topMoods.length === 1 ? 'grid-cols-1' : stats.topMoods.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {stats.topMoods.map((mood, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl mb-2">{mood.emoji}</div>
                  <div className="text-lg font-medium">{mood.mood}</div>
                  <div className="text-sm text-muted-foreground">
                    Logged {mood.count} {mood.count === 1 ? 'time' : 'times'}
                  </div>
                </div>
              ))}
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
          <p className="text-sm text-muted-foreground">
            How many times you logged your mood each day
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end h-32">
            {Object.entries(stats.weeklyBreakdown).map(([day, count]) => (
              <div key={day} className="flex flex-col items-center gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {count > 0 ? count : ''}
                </div>
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

    </div>
  );
}
