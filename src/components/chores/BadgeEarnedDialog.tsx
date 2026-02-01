import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { BadgeDefinition } from "@/lib/choreBadgeDefinitions";
import { TextToSpeech } from "@/components/TextToSpeech";

interface BadgeEarnedDialogProps {
  badge: BadgeDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpinWheel?: () => void;
}

export function BadgeEarnedDialog({ badge, open, onOpenChange, onSpinWheel }: BadgeEarnedDialogProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (open && badge) {
      // Delay content reveal for dramatic effect
      setShowContent(false);
      const timer = setTimeout(() => {
        setShowContent(true);
        
        // Fire confetti bursts
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'];

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: colors
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: colors
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        };
        
        frame();

        // Big center burst
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: colors
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [open, badge]);

  if (!badge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 overflow-hidden">
        <div className="relative flex flex-col items-center py-8 px-4">
          {/* Glow effect behind icon */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-yellow-400/30 rounded-full blur-3xl animate-pulse" />
          
          {/* Badge image with animation */}
          <div 
            className={`relative z-10 mb-6 transition-all duration-700 ${
              showContent 
                ? 'scale-100 opacity-100 rotate-0' 
                : 'scale-0 opacity-0 rotate-180'
            }`}
          >
            <div className="animate-bounce">
              <img 
                src={badge.imageUrl} 
                alt={badge.name}
                className="w-32 h-32 object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Title */}
          <div 
            className={`text-center transition-all duration-500 delay-300 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
              🎉 New Badge Earned! 🎉
            </p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                {badge.name}
              </h2>
              <TextToSpeech 
                text={`Congratulations! You earned the ${badge.name} badge! ${badge.description}`}
                size="icon"
              />
            </div>
            <p className="text-muted-foreground text-lg max-w-xs mx-auto">
              {badge.description}
            </p>
          </div>

          {/* Stats pill */}
          <div 
            className={`mt-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 transition-all duration-500 delay-500 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="text-sm font-medium text-primary">
              {badge.category === 'streak' ? '🔥 Streak Achievement' : '📅 Milestone Achievement'}
            </span>
          </div>

          {/* Action buttons */}
          <div 
            className={`mt-8 flex flex-col gap-3 transition-all duration-500 delay-700 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {onSpinWheel && (
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  onSpinWheel();
                }}
                className="px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                🎡 Spin the Wheel!
              </Button>
            )}
            <Button 
              onClick={() => onOpenChange(false)}
              variant={onSpinWheel ? "outline" : "default"}
              className={onSpinWheel ? "px-8" : "px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"}
            >
              {onSpinWheel ? "Maybe Later" : "Awesome! 🙌"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
