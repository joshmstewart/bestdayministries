import { MoodCalendar } from './MoodCalendar';
import { MoodDistribution } from './MoodDistribution';
import { DayOfWeekTrends } from './DayOfWeekTrends';
import { WeeklyAISummary } from './WeeklyAISummary';

interface EmotionStatsProps {
  userId: string;
}

export function EmotionStats({ userId }: EmotionStatsProps) {
  return (
    <div className="space-y-4">
      {/* Weekly AI Summary at top */}
      <WeeklyAISummary userId={userId} />

      {/* Mood Calendar */}
      <MoodCalendar userId={userId} />

      {/* Distribution and Trends side by side on larger screens */}
      <div className="grid gap-4 md:grid-cols-2">
        <MoodDistribution userId={userId} />
        <DayOfWeekTrends userId={userId} />
      </div>
    </div>
  );
}