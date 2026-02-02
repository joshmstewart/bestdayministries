import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Store, PartyPopper, Rocket, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

interface VendorGuideCompletionCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewStore?: () => void;
}

export function VendorGuideCompletionCelebration({
  open,
  onOpenChange,
  onViewStore,
}: VendorGuideCompletionCelebrationProps) {
  const confettiFired = useRef(false);

  // Fire confetti when dialog opens
  useEffect(() => {
    if (open && !confettiFired.current) {
      confettiFired.current = true;
      
      // Initial burst - gold and green for success
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#22C55E', '#10B981', '#FFA500', '#34D399', '#FBBF24'],
      });
      
      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 75,
          angle: 60,
          spread: 65,
          origin: { x: 0, y: 0.7 },
          colors: ['#FFD700', '#22C55E', '#10B981'],
        });
        confetti({
          particleCount: 75,
          angle: 120,
          spread: 65,
          origin: { x: 1, y: 0.7 },
          colors: ['#FFA500', '#34D399', '#FBBF24'],
        });
      }, 200);
      
      // Second wave
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#22C55E', '#FFA500'],
        });
      }, 400);

      // Final celebration burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 120,
          origin: { y: 0.4 },
          colors: ['#FFD700', '#22C55E', '#10B981', '#FFA500'],
        });
      }, 600);
    }
    
    if (!open) {
      confettiFired.current = false;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center animate-bounce shadow-xl">
            <PartyPopper className="w-12 h-12 text-white" />
          </div>
          <DialogTitle className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              🎉 You Did It! 🎉
            </span>
          </DialogTitle>
          <DialogDescription className="text-lg text-foreground">
            Your store is all set up and ready for customers!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Achievement display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-3 mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                Startup Guide Complete!
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              You've completed all the essential steps to launch your store
            </p>
          </div>

          {/* What's next */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Rocket className="w-5 h-5 text-primary" />
              <span className="font-medium">What's Next?</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Add more products to grow your catalog</p>
              <p>• Share your store link with customers</p>
              <p>• Check back for orders and earnings</p>
            </div>
          </div>

          {/* Encouragement message */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">You're ready to start selling!</span>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {onViewStore && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                onViewStore();
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
            >
              <Store className="w-4 h-4 mr-2" />
              View My Store
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Keep Exploring Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
