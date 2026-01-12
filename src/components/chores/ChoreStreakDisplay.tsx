import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Calendar, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChoreStreak {
  current_streak: number;
  longest_streak: number;
  total_completion_days: number;
}

interface ChoreBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

interface ChoreStreakDisplayProps {
  streak: ChoreStreak | null;
  badges: ChoreBadge[];
  loading?: boolean;
}

export function ChoreStreakDisplay({ streak, badges, loading }: ChoreStreakDisplayProps) {
  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="animate-pulse flex gap-4">
            <div className="h-16 w-24 bg-muted rounded"></div>
            <div className="h-16 w-24 bg-muted rounded"></div>
            <div className="h-16 w-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalDays = streak?.total_completion_days || 0;

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="py-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Current Streak */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{currentStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
          </div>

          {/* Longest Streak */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Best Streak</p>
          </div>

          {/* Total Days */}
          <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{totalDays}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Total Days</p>
          </div>
        </div>

        {/* Badges Row */}
        {badges.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Badges Earned</span>
              <Badge variant="secondary" className="text-xs">{badges.length}</Badge>
            </div>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20 cursor-help hover:bg-primary/20 transition-colors">
                        <span className="text-lg">{badge.badge_icon}</span>
                        <span className="text-xs font-medium">{badge.badge_name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badge.badge_description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Empty badges state */}
        {badges.length === 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Complete all your chores to earn badges!</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
