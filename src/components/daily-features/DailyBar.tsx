import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, PenTool, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";
import { DailyFivePopup } from "./DailyFivePopup";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDailyBarIcons } from "@/hooks/useDailyBarIcons";
import { useDailyEngagementSettings } from "@/hooks/useDailyEngagementSettings";

// Fallback icons when no custom image is uploaded
const FALLBACK_ICONS: Record<string, { icon: React.ReactNode; emoji: string }> = {
  mood: { icon: <span className="text-2xl">🌈</span>, emoji: "🌈" },
  "daily-five": { icon: <PenTool className="w-5 h-5" />, emoji: "🎯" },
  fortune: { icon: <Sparkles className="w-5 h-5" />, emoji: "✨" },
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

  if (!isAuthenticated) return null;

  const handleItemClick = (itemId: string) => {
    setActivePopup(itemId);
  };
  
  // Filter out stickers - that's handled by the floating Daily Scratch Widget
  const filteredIcons = icons.filter(icon => icon.item_key !== "stickers");

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
            {filteredIcons.map((item) => {
              const gradientStyles = GRADIENTS[item.item_key] || GRADIENTS.mood;
              const fallback = FALLBACK_ICONS[item.item_key] || FALLBACK_ICONS.mood;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.item_key)}
                  className={cn(
                    "group relative flex flex-col items-center gap-0.5 p-1 sm:p-2 rounded-xl",
                    "transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    activePopup === item.item_key && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    {item.icon_url ? (
                      <img 
                        src={item.icon_url} 
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
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mood Popup */}
      <Dialog open={activePopup === "mood"} onOpenChange={(open) => !open && setActivePopup(null)}>
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
          <QuickMoodPicker onComplete={() => setActivePopup(null)} />
        </DialogContent>
      </Dialog>

      {/* Fortune Popup */}
      <Dialog open={activePopup === "fortune"} onOpenChange={(open) => !open && setActivePopup(null)}>
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
          <DailyFortunePopup onClose={() => setActivePopup(null)} />
        </DialogContent>
      </Dialog>

      {/* Daily Five Popup */}
      <Dialog open={activePopup === "daily-five"} onOpenChange={(open) => !open && setActivePopup(null)}>
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
                  setActivePopup(null);
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
          <DailyFivePopup onComplete={() => setActivePopup(null)} />
        </DialogContent>
      </Dialog>

    </div>
  );
}
