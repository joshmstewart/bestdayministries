import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, PenTool, Package, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";
import { DailyFivePopup } from "./DailyFivePopup";
import { DailyScratchCard } from "@/components/DailyScratchCard";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDailyBarIcons } from "@/hooks/useDailyBarIcons";
import { useFeaturedSticker } from "@/hooks/useFeaturedSticker";
import { useDailyScratchCardStatus } from "@/hooks/useDailyScratchCardStatus";
import { useDailyEngagementSettings } from "@/hooks/useDailyEngagementSettings";

// Fallback icons when no custom image is uploaded
const FALLBACK_ICONS: Record<string, { icon: React.ReactNode; emoji: string }> = {
  mood: { icon: <span className="text-2xl">🌈</span>, emoji: "🌈" },
  "daily-five": { icon: <PenTool className="w-5 h-5" />, emoji: "🎯" },
  fortune: { icon: <Sparkles className="w-5 h-5" />, emoji: "✨" },
  stickers: { icon: <Package className="w-5 h-5" />, emoji: "🎁" },
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
  stickers: {
    gradient: "from-orange-500 to-yellow-500",
    bgGradient: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
  },
};

export function DailyBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { icons, loading } = useDailyBarIcons();
  const { imageUrl: featuredStickerUrl } = useFeaturedSticker();
  const { hasAvailableCard, loading: cardStatusLoading } = useDailyScratchCardStatus();
  const { canSeeFeature } = useDailyEngagementSettings();

  if (!isAuthenticated) return null;

  const handleItemClick = (itemId: string) => {
    // Stickers: if no card available, go to album instead of popup
    if (itemId === "stickers" && !hasAvailableCard) {
      navigate('/sticker-album');
      return;
    }
    setActivePopup(itemId);
  };

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
      <div className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-2xl p-3 border border-border/50">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">Daily:</span>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {icons.map((item) => {
              // Hide stickers button if daily_scratch_widget feature is disabled
              if (item.item_key === "stickers" && !canSeeFeature('daily_scratch_widget')) {
                return null;
              }
              
              const gradientStyles = GRADIENTS[item.item_key] || GRADIENTS.mood;
              const fallback = FALLBACK_ICONS[item.item_key] || FALLBACK_ICONS.mood;
              const isStickers = item.item_key === "stickers";
              const isStickersGrayed = isStickers && !hasAvailableCard && !cardStatusLoading;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.item_key)}
                  className={cn(
                    "group relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl",
                    "transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    activePopup === item.item_key && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={isStickersGrayed ? { filter: 'grayscale(100%)' } : undefined}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                    {/* For stickers, show featured sticker image if available */}
                    {isStickers && featuredStickerUrl ? (
                      <img 
                        src={featuredStickerUrl} 
                        alt={item.label} 
                        className="w-full h-full object-contain"
                      />
                    ) : item.icon_url ? (
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
                  
                  {/* Pulse indicator for stickers - only show when card available */}
                  {isStickers && hasAvailableCard && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
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

      {/* Stickers Popup */}
      <Dialog open={activePopup === "stickers"} onOpenChange={(open) => !open && setActivePopup(null)}>
        <DialogContent className="max-w-sm" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <span className="bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                Daily Sticker Pack
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Open your daily sticker pack
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <DailyScratchCard />
            <Button 
              variant="outline" 
              onClick={() => {
                setActivePopup(null);
                navigate("/sticker-album");
              }}
              className="mt-2"
            >
              View Full Album
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
