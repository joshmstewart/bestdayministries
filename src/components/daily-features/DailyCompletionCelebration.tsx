import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";

interface DailyCompletionCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coinsAwarded: number;
}

export function DailyCompletionCelebration({
  open,
  onOpenChange,
  coinsAwarded,
}: DailyCompletionCelebrationProps) {
  const confettiFired = useRef(false);

  // Fire confetti when dialog opens
  useEffect(() => {
    if (open && !confettiFired.current) {
      confettiFired.current = true;
      
      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      });
      
      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#4ECDC4', '#45B7D1', '#96CEB4'],
        });
      }, 200);
      
      // Final burst
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500'],
        });
      }, 400);
    }
    
    if (!open) {
      confettiFired.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex items-center justify-center animate-bounce shadow-lg">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              🎉 Amazing Job! 🎉
            </span>
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            You completed all your daily activities!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Reward display */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-muted-foreground mb-2">You earned</p>
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-8 h-8 text-yellow-500" />
              <span className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                +{coinsAwarded}
              </span>
            </div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mt-2">
              Bonus Coins!
            </p>
          </div>

          {/* Encouragement message */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm">Keep up the great work!</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
        </div>

        <Button 
          onClick={() => onOpenChange(false)}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
        >
          Awesome! 🌟
        </Button>
      </DialogContent>
    </Dialog>
  );
}
