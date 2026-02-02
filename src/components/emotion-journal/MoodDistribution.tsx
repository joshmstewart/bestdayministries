import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface MoodDistributionProps {
  userId: string;
}

const CATEGORY_COLORS: { [key: string]: string } = {
  positive: '#22c55e', // green-500
  neutral: '#eab308',  // yellow-500
  negative: '#ef4444', // red-500
};

export function MoodDistribution({ userId }: MoodDistributionProps) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    loadDistribution();
  }, [userId]);

  const loadDistribution = async () => {
    setLoading(true);
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    // Get entries with their emotion types to get categories
    const { data: entries, error } = await supabase
      .from('mood_entries')
      .select('mood_label')
      .eq('user_id', userId)
      .gte('entry_date', thirtyDaysAgo);

    if (error || !entries) {
      setLoading(false);
      return;
    }

    // Get emotion types for categories
    const { data: emotionTypes } = await supabase
      .from('emotion_types')
      .select('name, category');

    const categoryMap = new Map<string, string>();
    emotionTypes?.forEach(e => categoryMap.set(e.name, e.category?.toLowerCase() || 'neutral'));

    // Count by category
    const categoryCounts: { [key: string]: number } = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    entries.forEach(entry => {
      const category = categoryMap.get(entry.mood_label) || 'neutral';
      categoryCounts[category]++;
    });

    const chartData = Object.entries(categoryCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: CATEGORY_COLORS[name],
      }));

    setData(chartData);
    setTotalEntries(entries.length);
    setLoading(false);
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

  if (totalEntries === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <PieChartIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No mood data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Mood Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} entries`, 'Count']}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          {data.map(item => (
            <div key={item.name} className="p-2 rounded-lg bg-muted/30">
              <div className="text-lg font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-xs text-muted-foreground">{item.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
