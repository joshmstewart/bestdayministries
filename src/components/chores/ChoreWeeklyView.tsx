import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays, getDay } from "date-fns";
import { TextToSpeech } from "@/components/TextToSpeech";

interface Chore {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'every_x_days' | 'every_x_weeks';
  recurrence_value: number | null;
  day_of_week: number | null;
  is_active: boolean;
  display_order: number;
  bestie_id: string;
  created_by: string;
}

interface ChoreCompletion {
  id: string;
  chore_id: string;
  completed_date: string;
}

interface ChoreWeeklyViewProps {
  chores: Chore[];
  completions: ChoreCompletion[];
  onToggleCompletion: (choreId: string) => void;
  today: string;
}

export function ChoreWeeklyView({ 
  chores, 
  completions, 
  onToggleCompletion,
  today 
}: ChoreWeeklyViewProps) {
  const completedChoreIds = new Set(completions.map(c => c.chore_id));

  // Generate 7 days starting from today
  const weekDays = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(now, i));
  }, []);

  // Get chores applicable for a specific date
  const getChoresForDate = (date: Date) => {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    return chores.filter(chore => {
      switch (chore.recurrence_type) {
        case 'daily':
          return true;
        case 'weekly':
          return chore.day_of_week === dayOfWeek;
        case 'every_x_days':
          // Show on all days for simplicity
          return true;
        case 'every_x_weeks':
          return chore.day_of_week === dayOfWeek;
        default:
          return true;
      }
    });
  };

  const isToday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dateStr === today;
  };

  const isPast = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dateStr < today;
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-4">
      <div className="flex gap-3 min-w-max lg:grid lg:grid-cols-7 lg:min-w-max">
      {weekDays.map((date, index) => {
        const dayChores = getChoresForDate(date);
        const todayHighlight = isToday(date);
        const pastDay = isPast(date);

        return (
          <Card 
            key={index}
            className={`min-w-[220px] flex-shrink-0 transition-all ${
              todayHighlight 
                ? 'ring-2 ring-primary bg-primary/5' 
                : pastDay 
                  ? 'opacity-60' 
                  : ''
            }`}
          >
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className={todayHighlight ? 'text-primary font-bold' : ''}>
                  {format(date, 'EEE')}
                </span>
                <Badge 
                  variant={todayHighlight ? "default" : "outline"} 
                  className="text-xs"
                >
                  {format(date, 'd')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {dayChores.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No chores
                </p>
              ) : (
                <div className="space-y-2">
                  {dayChores.map(chore => {
                    // Only allow checking if it's today
                    const canCheck = todayHighlight;
                    const isCompleted = canCheck && completedChoreIds.has(chore.id);

                      return (
                      <div 
                        key={chore.id}
                        className={`flex items-start gap-2 p-2 rounded-md transition-all ${
                          isCompleted 
                            ? 'bg-primary/10' 
                            : 'bg-muted/50'
                        }`}
                      >
                        {canCheck && (
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => onToggleCompletion(chore.id)}
                            className="h-5 w-5 shrink-0 mt-0.5"
                          />
                        )}
                        <span className="text-xl shrink-0">{chore.icon}</span>
                        <span className={`text-xs font-medium leading-tight flex-1 ${
                          isCompleted ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {chore.title}
                        </span>
                        <TextToSpeech 
                          text={`${chore.title}${chore.description ? `. ${chore.description}` : ''}`}
                          size="icon"
                        />
                        {isCompleted && <span className="text-sm shrink-0">✅</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
