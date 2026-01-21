import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Calendar, Star, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeCollectionDialog } from "./BadgeCollectionDialog";
import { BadgeDefinition, getBadgeDefinition, BADGE_DEFINITIONS } from "@/lib/choreBadgeDefinitions";

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
  badgeDefinitions?: BadgeDefinition[];
}

export function ChoreStreakDisplay({ streak, badges, loading, badgeDefinitions = BADGE_DEFINITIONS }: ChoreStreakDisplayProps) {
  const [showBadgeCollection, setShowBadgeCollection] = useState(false);

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
    <>
      <Card className="mb-6 overflow-hidden">
        <CardContent className="py-4">
          {/* Stats Row - 4 columns */}
          <div className="grid grid-cols-4 gap-2">
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

            {/* Badges Button */}
            <button 
              onClick={() => setShowBadgeCollection(true)}
              className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{badges.length}/{badgeDefinitions.length || 8}</span>
                <ChevronRight className="h-4 w-4 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Tap to View</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <BadgeCollectionDialog
        open={showBadgeCollection}
        onOpenChange={setShowBadgeCollection}
        earnedBadges={badges}
        allBadges={badgeDefinitions}
        currentStreak={currentStreak}
        totalDays={totalDays}
      />
    </>
  );
}
