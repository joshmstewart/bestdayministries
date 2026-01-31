import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, PenTool, Loader2, ExternalLink, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";
import { DailyFivePopup } from "./DailyFivePopup";
import { DailyCompletionCelebration } from "./DailyCompletionCelebration";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDailyBarIcons } from "@/hooks/useDailyBarIcons";
import { useDailyEngagementSettings } from "@/hooks/useDailyEngagementSettings";
import { useDailyCompletions } from "@/hooks/useDailyCompletions";
import { useDailyScratchCardStatus } from "@/hooks/useDailyScratchCardStatus";
import { useDailyEngagementBonus } from "@/hooks/useDailyEngagementBonus";

// Fallback icons when no custom image is uploaded
const FALLBACK_ICONS: Record<string, { icon: React.ReactNode; emoji: string }> = {
  mood: { icon: <span className="text-2xl">🌈</span>, emoji: "🌈" },
  "daily-five": { icon: <PenTool className="w-5 h-5" />, emoji: "🎯" },
  fortune: { icon: <Sparkles className="w-5 h-5" />, emoji: "✨" },
  stickers: { icon: <span className="text-2xl">🎁</span>, emoji: "🎁" },
};

// Gradient styles for each item type
const GRADIENTS: Record<string, { gradient: string; bgGradient: string }> = {
  mood: {
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
  },
  "daily-five": {
    gradient: "from-teal-500 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20",
  },
  fortune: {
    gradient: "from-indigo-500 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
  },
};

export function DailyBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { icons, loading } = useDailyBarIcons();
  const { canSeeFeature } = useDailyEngagementSettings();
  const { completions, refresh: refreshCompletions } = useDailyCompletions();
  const { hasAvailableCard, previewStickerUrl } = useDailyScratchCardStatus();

  // Calculate if all daily items are completed
  const allCompleted = useMemo(() => {
    const stickersCompleted = !hasAvailableCard;
    return completions.mood && completions.fortune && completions["daily-five"] && stickersCompleted;
  }, [completions, hasAvailableCard]);

  // Track and award bonus for completing all daily activities
  const { showCelebration, setShowCelebration, coinsAwarded } = useDailyEngagementBonus({ allCompleted });

  // Check if user can see the daily bar based on role settings
  const canSeeDailyBar = canSeeFeature('daily_bar');

  if (!isAuthenticated || !canSeeDailyBar) return null;

  const handleItemClick = (itemId: string) => {
    setActivePopup(itemId);
  };

  const handlePopupClose = (itemId: string) => {
    setActivePopup(null);
    // Refresh completion status after closing a popup
    refreshCompletions();
  };
  
  // All icons are shown - stickers uses same availability logic as Daily Scratch Widget

  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-2xl p-3 border border-border/50">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Daily Bar Container */}
      <div className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-2xl p-1.5 border border-border/50">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">Daily:</span>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {icons.map((item) => {
              const gradientStyles = GRADIENTS[item.item_key] || GRADIENTS.mood;
              const fallback = FALLBACK_ICONS[item.item_key] || FALLBACK_ICONS.mood;
              
              // For stickers, use scratch card availability; for others, use completion status
              const isStickers = item.item_key === 'stickers';
              const isCompleted = isStickers 
                ? !hasAvailableCard  // Stickers is "done" when no card available
                : (completions[item.item_key as keyof typeof completions] || false);
              
              // For stickers, use the preview sticker URL from the scratch card system
              const iconUrl = isStickers ? previewStickerUrl : item.icon_url;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isStickers) {
                      // Stickers click navigates to sticker album
                      navigate('/sticker-album');
                    } else {
                      handleItemClick(item.item_key);
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-0.5 p-1 sm:p-2 rounded-xl",
                    "transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    activePopup === item.item_key && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <div 
                    className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center relative"
                    style={isCompleted ? { filter: 'grayscale(100%)', opacity: 0.6 } : undefined}
                  >
                    {iconUrl ? (
                      <img 
                        src={iconUrl} 
                        alt={item.label} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className={cn(
                        "w-full h-full rounded-full flex items-center justify-center",
                        "bg-gradient-to-br shadow-md",
                        gradientStyles.gradient,
                        "text-white"
                      )}>
                        {fallback.icon}
                      </div>
                    )}
                  </div>
                  {/* Completion checkmark */}
                  {isCompleted && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] sm:text-xs font-medium transition-colors",
                    isCompleted 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mood Popup */}
      <Dialog open={activePopup === "mood"} onOpenChange={(open) => !open && handlePopupClose("mood")}>
        <DialogContent className="max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🌈</span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                How are you feeling?
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Select your mood for today
            </DialogDescription>
          </DialogHeader>
          <QuickMoodPicker onComplete={() => handlePopupClose("mood")} />
        </DialogContent>
      </Dialog>

      {/* Fortune Popup */}
      <Dialog open={activePopup === "fortune"} onOpenChange={(open) => !open && handlePopupClose("fortune")}>
        <DialogContent className="max-w-lg" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Daily Inspiration
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Today's inspirational message
            </DialogDescription>
          </DialogHeader>
          <DailyFortunePopup onClose={() => handlePopupClose("fortune")} />
        </DialogContent>
      </Dialog>

      {/* Daily Five Popup */}
      <Dialog open={activePopup === "daily-five"} onOpenChange={(open) => !open && handlePopupClose("daily-five")}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Daily Five
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handlePopupClose("daily-five");
                  navigate("/games/daily-five");
                }}
                className="text-xs text-muted-foreground"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Full Page
              </Button>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Play today's word puzzle
            </DialogDescription>
          </DialogHeader>
          <DailyFivePopup onComplete={() => handlePopupClose("daily-five")} />
        </DialogContent>
      </Dialog>

      {/* Completion Celebration */}
      <DailyCompletionCelebration
        open={showCelebration}
        onOpenChange={setShowCelebration}
        coinsAwarded={coinsAwarded}
      />

    </div>
  );
}
