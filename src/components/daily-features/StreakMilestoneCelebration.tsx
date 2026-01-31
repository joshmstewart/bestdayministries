import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Coins, Gift, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface MilestoneAwarded {
  badge_name: string;
  badge_icon: string | null;
  bonus_coins: number;
  free_sticker_packs: number;
  description: string | null;
}

interface StreakMilestoneCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneAwarded;
  currentStreak: number;
  onOpenPack?: () => void;
}

export function StreakMilestoneCelebration({
  open,
  onOpenChange,
  milestone,
  currentStreak,
  onOpenPack,
}: StreakMilestoneCelebrationProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (open && !confettiFired.current) {
      confettiFired.current = true;
      
      // Fire-themed confetti burst
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FF6B35', '#F7931E', '#FFD700', '#FF4500', '#FF8C00'],
      });
      
      // Side flames
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.6 },
          colors: ['#FF6B35', '#F7931E', '#FFD700'],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.6 },
          colors: ['#FF4500', '#FF8C00', '#FFD700'],
        });
      }, 250);

      // Final golden burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#FFD700', '#FFA500', '#FFDF00'],
        });
      }, 500);
    }
    
    if (!open) {
      confettiFired.current = false;
    }
  }, [open]);

  const handleOpenPack = () => {
    onOpenChange(false);
    onOpenPack?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center" hideCloseButton>
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 via-red-500 to-yellow-500 flex items-center justify-center animate-pulse shadow-2xl">
            <Flame className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 bg-clip-text text-transparent">
              🔥 {milestone.badge_name}! 🔥
            </span>
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {currentStreak}-day streak milestone achieved!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Badge display */}
          {milestone.description && (
            <p className="text-sm text-muted-foreground italic">
              "{milestone.description}"
            </p>
          )}

          {/* Rewards section */}
          <div className="bg-gradient-to-r from-orange-50 via-red-50 to-yellow-50 dark:from-orange-900/20 dark:via-red-900/20 dark:to-yellow-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800 space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Rewards Unlocked
            </p>
            
            {/* Coins reward */}
            {milestone.bonus_coins > 0 && (
              <div className="flex items-center justify-center gap-3 bg-white/50 dark:bg-black/20 rounded-lg p-3">
                <Coins className="w-8 h-8 text-yellow-500" />
                <span className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  +{milestone.bonus_coins}
                </span>
                <span className="text-lg font-medium text-yellow-700 dark:text-yellow-400">
                  coins
                </span>
              </div>
            )}

            {/* Sticker packs reward */}
            {milestone.free_sticker_packs > 0 && (
              <div className="flex items-center justify-center gap-3 bg-white/50 dark:bg-black/20 rounded-lg p-3">
                <Gift className="w-8 h-8 text-purple-500" />
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  +{milestone.free_sticker_packs}
                </span>
                <span className="text-lg font-medium text-purple-700 dark:text-purple-400">
                  sticker pack{milestone.free_sticker_packs > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Streak display */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">
              Keep the streak going for more rewards!
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {milestone.free_sticker_packs > 0 && onOpenPack && (
            <Button 
              onClick={handleOpenPack}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 text-white font-semibold"
            >
              <Gift className="w-5 h-5 mr-2" />
              Open Sticker Pack! 🎁
            </Button>
          )}
          <Button 
            onClick={() => onOpenChange(false)}
            variant={milestone.free_sticker_packs > 0 && onOpenPack ? "outline" : "default"}
            className={milestone.free_sticker_packs > 0 && onOpenPack 
              ? "w-full" 
              : "w-full bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 hover:from-orange-600 hover:via-red-600 hover:to-yellow-600 text-white font-semibold"
            }
          >
            {milestone.free_sticker_packs > 0 && onOpenPack ? "Maybe Later" : "Keep It Going! 🔥"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}