import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Palette, Sparkles, Gift, Trophy } from "lucide-react";
import { useMonthlyChallenge } from "@/hooks/useMonthlyChallenge";

interface MonthlyChallengeCardProps {
  userId: string;
  onOpenBuilder: () => void;
}

export function MonthlyChallengeCard({ userId, onOpenBuilder }: MonthlyChallengeCardProps) {
  const { theme, progress, dailyCompletions, loading, unplacedStickerCount } = useMonthlyChallenge(userId);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!theme) {
    return null; // No challenge this month
  }

  const progressPercent = Math.min(100, (progress?.completion_days || 0) / theme.days_required * 100);
  const daysRemaining = theme.days_required - (progress?.completion_days || 0);
  const isComplete = progress?.is_completed;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full" />
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{theme.badge_icon}</span>
              <h3 className="text-lg font-bold">{theme.name}</h3>
              {isComplete && (
                <Badge className="bg-green-500 text-white">
                  <Trophy className="h-3 w-3 mr-1" />
                  Complete!
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {theme.description || `Complete your chores to build your ${theme.name.toLowerCase()}!`}
            </p>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{progress?.completion_days || 0} / {theme.days_required} days</span>
                {!isComplete && daysRemaining > 0 && (
                  <span className="text-muted-foreground">{daysRemaining} more needed</span>
                )}
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            {/* Stickers available indicator */}
            {unplacedStickerCount > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-primary/10 rounded-lg">
                <Gift className="h-5 w-5 text-primary animate-bounce" />
                <span className="text-sm font-medium">
                  {unplacedStickerCount} sticker{unplacedStickerCount !== 1 ? 's' : ''} ready to place!
                </span>
              </div>
            )}

            {/* Reward preview */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span>{theme.coin_reward} coins</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{theme.badge_icon}</span>
                <span>{theme.badge_name}</span>
              </div>
            </div>
          </div>

          {/* Mini preview or action */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-lg bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
              {progress?.placed_stickers && progress.placed_stickers.length > 0 ? (
                <div className="text-3xl">
                  {/* Show first few stickers as preview */}
                  {progress.placed_stickers.slice(0, 3).map((_, i) => (
                    <span key={i}>✨</span>
                  ))}
                </div>
              ) : (
                <Palette className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <Button size="sm" onClick={onOpenBuilder} className="gap-1">
              <Palette className="h-4 w-4" />
              {isComplete ? 'View' : 'Build'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
