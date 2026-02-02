import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { subDays, format, parseISO, getDay } from 'date-fns';

interface DayOfWeekTrendsProps {
  userId: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mood score: positive = 1, neutral = 0, negative = -1
const CATEGORY_SCORES: { [key: string]: number } = {
  positive: 1,
  neutral: 0,
  negative: -1,
};

export function DayOfWeekTrends({ userId }: DayOfWeekTrendsProps) {
  const [data, setData] = useState<{ day: string; score: number; displayValue: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [hardestDay, setHardestDay] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, [userId]);

  const loadTrends = async () => {
    setLoading(true);
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('entry_date, mood_label')
      .eq('user_id', userId)
      .gte('entry_date', thirtyDaysAgo);

    if (error || !entries || entries.length === 0) {
      setLoading(false);
      return;
    }

    // Get emotion categories
    const { data: emotionTypes } = await supabase
      .from('emotion_types')
      .select('name, category');

    const categoryMap = new Map<string, string>();
    emotionTypes?.forEach(e => categoryMap.set(e.name, e.category?.toLowerCase() || 'neutral'));

    // Calculate average score per day of week
    const dayStats: { [key: number]: { total: number; count: number } } = {};
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { total: 0, count: 0 };
    }

    entries.forEach(entry => {
      const date = parseISO(entry.entry_date);
      const dayOfWeek = getDay(date);
      const category = categoryMap.get(entry.mood_label) || 'neutral';
      const score = CATEGORY_SCORES[category] ?? 0;

      dayStats[dayOfWeek].total += score;
      dayStats[dayOfWeek].count++;
    });

    const chartData = DAY_NAMES.map((day, index) => {
      const avgScore = dayStats[index].count > 0 
        ? dayStats[index].total / dayStats[index].count 
        : 0;
      // Transform score from [-1, 1] to [0, 1] for consistent bar heights
      // This ensures neutral (0) shows as 0.5, positive (1) as 1, negative (-1) as 0
      const displayValue = dayStats[index].count > 0 ? (avgScore + 1) / 2 : 0;
      return {
        day,
        score: avgScore, // Keep original for color logic
        displayValue, // Use for bar height
        count: dayStats[index].count,
      };
    });

    // Find best and hardest days (only if they have data)
    const daysWithData = chartData.filter(d => d.count > 0);
    if (daysWithData.length > 0) {
      const sorted = [...daysWithData].sort((a, b) => b.score - a.score);
      setBestDay(sorted[0].day);
      setHardestDay(sorted[sorted.length - 1].day);
    }

    setData(chartData);
    setLoading(false);
  };

  // Green for positive, gray for neutral, red for negative
  const getBarColor = (score: number) => {
    if (score > 0.3) return '#22c55e'; // green
    if (score < -0.3) return '#ef4444'; // red
    return '#9ca3af'; // gray for neutral
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (data.every(d => d.count === 0)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No patterns yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Day of Week Trends
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Which days tend to be better or harder
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }} 
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis 
              domain={[0, 1]} 
              hide 
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                props.payload.score > 0.3 ? 'More positive' : props.payload.score < -0.3 ? 'More challenging' : 'Neutral',
                'Trend'
              ]}
            />
            <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > 0 ? getBarColor(entry.score) : '#e5e7eb'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {bestDay && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <div className="text-lg font-bold text-primary">{bestDay}</div>
              <div className="text-xs text-muted-foreground">Best day</div>
            </div>
          )}
          {hardestDay && hardestDay !== bestDay && (
            <div className="p-3 rounded-lg bg-accent/30 border border-accent/40 text-center">
              <div className="text-lg font-bold text-accent-foreground">{hardestDay}</div>
              <div className="text-xs text-muted-foreground">Hardest day</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
