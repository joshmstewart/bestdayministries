import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { TextToSpeech } from "@/components/TextToSpeech";
import { format, subDays, parseISO } from "date-fns";

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

interface MissedChore {
  chore: Chore;
  missedDate: string;
}

interface MissedChoresSectionProps {
  missedChores: MissedChore[];
  onAddToToday: (choreId: string) => void;
  loading?: boolean;
}

export function MissedChoresSection({ 
  missedChores, 
  onAddToToday,
  loading = false 
}: MissedChoresSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading || missedChores.length === 0) {
    return null;
  }

  // Group missed chores by date
  const groupedByDate = missedChores.reduce((acc, item) => {
    if (!acc[item.missedDate]) {
      acc[item.missedDate] = [];
    }
    acc[item.missedDate].push(item);
    return acc;
  }, {} as Record<string, MissedChore[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="mb-6 border-accent/50 bg-accent/5">
      <CardHeader className="pb-2">
        <CardTitle 
          className="text-base font-medium flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 text-accent-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>Missed Chores ({missedChores.length})</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2">
          <p className="text-sm text-muted-foreground mb-4">
            These chores weren't completed. Tap the + button to add them to today's list.
          </p>
          
          <div className="space-y-4">
            {sortedDates.map(date => (
              <div key={date}>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {format(parseISO(date), 'EEEE, MMM d')}
                </p>
                <div className="space-y-2">
                  {groupedByDate[date].map(({ chore }) => (
                    <div 
                      key={`${chore.id}-${date}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                    >
                      <span className="text-2xl shrink-0">{chore.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{chore.title}</span>
                          <TextToSpeech 
                            text={`${chore.title}${chore.description ? `. ${chore.description}` : ''}`}
                            size="icon"
                          />
                        </div>
                        {chore.description && chore.description.trim() && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {chore.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={() => onAddToToday(chore.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Today
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
