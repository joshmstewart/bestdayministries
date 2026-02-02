import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WeeklyAISummaryProps {
  userId: string;
}

interface WeeklySummary {
  id: string;
  week_start: string;
  summary: string;
  created_at: string;
}

export function WeeklyAISummary({ userId }: WeeklyAISummaryProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekEntries, setWeekEntries] = useState<number>(0);
  const { toast } = useToast();

  // Calculate last week's date range
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
  const weekStartStr = format(lastWeekStart, 'yyyy-MM-dd');

  useEffect(() => {
    loadSummary();
    loadWeekEntryCount();
  }, [userId]);

  const loadSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mood_weekly_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    if (!error && data) {
      setSummary(data);
    }
    setLoading(false);
  };

  const loadWeekEntryCount = async () => {
    const { count } = await supabase
      .from('mood_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('entry_date', weekStartStr)
      .lte('entry_date', format(lastWeekEnd, 'yyyy-MM-dd'));

    setWeekEntries(count || 0);
  };

  const generateSummary = async () => {
    if (weekEntries < 3) {
      toast({
        title: "Not enough data",
        description: "Log your mood at least 3 times in a week to get insights.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-mood-weekly-summary', {
        body: { 
          userId,
          weekStart: weekStartStr,
          weekEnd: format(lastWeekEnd, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;

      setSummary(data.summary);
      toast({
        title: "Summary generated!",
        description: "Your weekly mood insights are ready.",
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Couldn't generate summary",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
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

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Weekly Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(lastWeekStart, 'MMM d')} - {format(lastWeekEnd, 'MMM d, yyyy')}
        </p>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">{summary.summary}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Generated {format(parseISO(summary.created_at), 'MMM d')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSummary}
                disabled={generating}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            {weekEntries >= 3 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  You logged {weekEntries} moods last week. Ready for your insights!
                </p>
                <Button onClick={generateSummary} disabled={generating}>
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Weekly Summary
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Log at least 3 moods per week to unlock AI insights.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Last week: {weekEntries}/3 entries
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
