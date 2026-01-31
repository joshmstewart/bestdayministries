import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface MoodEntry {
  id: string;
  mood_emoji: string;
  mood_label: string;
  note: string | null;
  created_at: string;
  entry_date: string;
}

interface EmotionHistoryProps {
  userId: string;
}

export function EmotionHistory({ userId }: EmotionHistoryProps) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    loadEntries();
  }, [userId, page]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('id, mood_emoji, mood_label, note, created_at, entry_date')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      setEntries(data || []);
      setHasMore((data?.length || 0) === pageSize);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('mood_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== id));
      toast.success('Entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  if (loading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No entries yet</h3>
          <p className="text-muted-foreground mt-1">
            Start by logging how you're feeling today!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Feeling History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Emoji */}
              <div className="text-4xl flex-shrink-0">
                {entry.mood_emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{entry.mood_label}</span>
                </div>

                {entry.note && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {entry.note}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(entry.entry_date), 'MMM d, yyyy')}
                  {' · '}
                  {formatDistanceToNow(new Date(entry.entry_date), { addSuffix: true })}
                </p>
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(entry.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Newer
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
        >
          Older
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
