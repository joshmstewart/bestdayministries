import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lock, Trophy, Flame, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BadgeDefinition, getBadgeDefinition } from "@/lib/choreBadgeDefinitions";

interface ChoreBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string | null;
  badge_icon: string;
  earned_at: string;
}

interface BadgeCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  earnedBadges: ChoreBadge[];
  allBadges: BadgeDefinition[];
  currentStreak: number;
  totalDays: number;
}

export function BadgeCollectionDialog({
  open,
  onOpenChange,
  earnedBadges,
  allBadges,
  currentStreak,
  totalDays,
}: BadgeCollectionDialogProps) {
  const earnedTypes = new Set(earnedBadges.map(b => b.badge_type));
  
  const streakBadges = allBadges.filter(b => b.category === 'streak');
  const totalBadges = allBadges.filter(b => b.category === 'total');

  const getProgress = (badge: BadgeDefinition) => {
    const current = badge.category === 'streak' ? currentStreak : totalDays;
    return Math.min((current / badge.threshold) * 100, 100);
  };

  const getProgressText = (badge: BadgeDefinition) => {
    const current = badge.category === 'streak' ? currentStreak : totalDays;
    return `${current}/${badge.threshold} days`;
  };

  const renderBadgeCard = (badge: BadgeDefinition) => {
    const isEarned = earnedTypes.has(badge.type);
    const earnedBadge = earnedBadges.find(b => b.badge_type === badge.type);
    const progress = getProgress(badge);

    return (
      <div
        key={badge.type}
        className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
          isEarned
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-amber-300 dark:border-amber-700 shadow-lg'
            : 'bg-muted/30 border-muted-foreground/20 opacity-75'
        }`}
      >
        {/* Badge image */}
        <div className="flex items-start justify-between mb-3">
          <div className={`${isEarned ? '' : 'grayscale opacity-50'}`}>
            <img 
              src={badge.imageUrl} 
              alt={badge.name}
              className="w-16 h-16 object-contain"
            />
          </div>
          {isEarned ? (
            <Badge className="bg-green-500 text-white text-xs">Earned!</Badge>
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Badge name and description */}
        <h3 className={`font-semibold mb-1 ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>
          {badge.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {badge.description}
        </p>

        {/* Progress or earned date */}
        {isEarned && earnedBadge ? (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            🏆 Earned {new Date(earnedBadge.earned_at).toLocaleDateString()}
          </p>
        ) : (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{getProgressText(badge)}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-amber-500" />
            Badge Collection
          </DialogTitle>
          <DialogDescription>
            Earn badges by completing your chores consistently!
          </DialogDescription>
        </DialogHeader>

        {/* Summary stats */}
        <div className="flex gap-4 p-4 rounded-lg bg-muted/50 mb-6">
          <div className="flex-1 text-center">
            <div className="text-3xl font-bold text-primary">{earnedBadges.length}</div>
            <div className="text-xs text-muted-foreground">Badges Earned</div>
          </div>
          <div className="flex-1 text-center border-l border-r">
            <div className="text-3xl font-bold text-orange-500">{allBadges.length - earnedBadges.length}</div>
            <div className="text-xs text-muted-foreground">Badges Remaining</div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-3xl font-bold text-green-500">
              {Math.round((earnedBadges.length / allBadges.length) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Streak Badges */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-lg">Streak Badges</h3>
            <Badge variant="outline" className="text-xs">
              {streakBadges.filter(b => earnedTypes.has(b.type)).length}/{streakBadges.length}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {streakBadges.map(renderBadgeCard)}
          </div>
        </div>

        {/* Total Completion Badges */}
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-lg">Milestone Badges</h3>
            <Badge variant="outline" className="text-xs">
              {totalBadges.filter(b => earnedTypes.has(b.type)).length}/{totalBadges.length}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {totalBadges.map(renderBadgeCard)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
