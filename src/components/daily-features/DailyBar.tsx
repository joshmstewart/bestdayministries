import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, PenTool, Loader2, ExternalLink, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";
import { DailyFivePopup } from "./DailyFivePopup";
import { DailyCompletionCelebration } from "./DailyCompletionCelebration";
import { PackOpeningDialog } from "@/components/PackOpeningDialog";
import { CollectionSelectorDialog } from "@/components/CollectionSelectorDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDailyBarIcons } from "@/hooks/useDailyBarIcons";
import { useDailyEngagementSettings } from "@/hooks/useDailyEngagementSettings";
import { useDailyCompletions } from "@/hooks/useDailyCompletions";
import { useDailyScratchCardStatus } from "@/hooks/useDailyScratchCardStatus";
import { useDailyEngagementBonus } from "@/hooks/useDailyEngagementBonus";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { icons, loading: iconsLoading } = useDailyBarIcons();
  const { canSeeFeature } = useDailyEngagementSettings();
  const { completions, loading: completionsLoading, refresh: refreshCompletions } = useDailyCompletions();
  const { hasAvailableCard, loading: scratchLoading, previewStickerUrl } = useDailyScratchCardStatus();
  
  // Sticker pack dialog states - matching DailyScratchCard logic exactly
  const [showStickerDialog, setShowStickerDialog] = useState(false);
  const [showBonusStickerDialog, setShowBonusStickerDialog] = useState(false);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [dailyCard, setDailyCard] = useState<any>(null);
  const [bonusCard, setBonusCard] = useState<any>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  
  // Combined loading state - don't render until all statuses are known
  const loading = iconsLoading || completionsLoading || scratchLoading;

  // Calculate if all daily items are completed
  const allCompleted = useMemo(() => {
    const stickersCompleted = !hasAvailableCard;
    return completions.mood && completions.fortune && completions["daily-five"] && stickersCompleted;
  }, [completions, hasAvailableCard]);

  // Track and award bonus for completing all daily activities
  const { showCelebration, setShowCelebration, coinsAwarded } = useDailyEngagementBonus({ allCompleted });

  // Check if user can see the daily bar based on role settings
  const canSeeDailyBar = canSeeFeature('daily_bar');

  // Helper function to get current date in MST (UTC-7)
  const getMSTDate = () => {
    const now = new Date();
    const mstOffset = -7 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    return mstTime;
  };

  // Load card data when stickers are clicked - matches DailyScratchCard logic
  const loadCardData = async () => {
    if (!user) return;
    
    setCardsLoading(true);
    try {
      const mstDate = getMSTDate();
      const today = mstDate.toISOString().split('T')[0];

      // Fetch daily card and bonus cards
      const [{ data: existingCard }, { data: existingBonusCards }] = await Promise.all([
        supabase
          .from('daily_scratch_cards')
          .select('id, is_scratched, collection_id, expires_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', false)
          .maybeSingle(),
        supabase
          .from('daily_scratch_cards')
          .select('id, is_scratched, collection_id, expires_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', true)
          .eq('is_scratched', false)
          .order('purchase_number', { ascending: true })
      ]);

      let cardToUse = existingCard;

      // Generate card if none exists
      if (!cardToUse) {
        const { data: newCardId } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        if (newCardId) {
          const { data: fetchedCard } = await supabase
            .from('daily_scratch_cards')
            .select('id, is_scratched, collection_id, expires_at')
            .eq('id', newCardId)
            .maybeSingle();
          cardToUse = fetchedCard;
        }
      }

      setDailyCard(cardToUse);
      setBonusCard(existingBonusCards?.[0] || null);

      // Determine which dialog to show - matching DailyScratchCard logic exactly
      if (cardToUse && !cardToUse.is_scratched) {
        // Daily card available - show pack dialog
        setShowStickerDialog(true);
      } else if (existingBonusCards && existingBonusCards.length > 0) {
        // Daily scratched but bonus available
        setShowBonusStickerDialog(true);
      } else {
        // All scratched - navigate to album
        navigate('/sticker-album');
      }
    } catch (error) {
      console.error('Error loading card data:', error);
      navigate('/sticker-album');
    } finally {
      setCardsLoading(false);
    }
  };

  const handleCardOpened = () => {
    setDailyCard(null);
    setBonusCard(null);
    refreshCompletions();
  };

  const handleItemClick = (itemId: string) => {
    setActivePopup(itemId);
  };

  const handlePopupClose = (itemId: string) => {
    setActivePopup(null);
    // Refresh completion status after closing a popup
    refreshCompletions();
  };
  
  if (!isAuthenticated || !canSeeDailyBar) return null;

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
                  disabled={isStickers && cardsLoading}
                  onClick={() => {
                    if (isStickers) {
                      // Load card data and show appropriate dialog - matches DailyScratchCard exactly
                      loadCardData();
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

      {/* Daily sticker pack dialog - matches DailyScratchCard exactly */}
      {dailyCard && !dailyCard.is_scratched && (
        <PackOpeningDialog
          open={showStickerDialog}
          onOpenChange={setShowStickerDialog}
          cardId={dailyCard.id}
          onOpened={handleCardOpened}
          onChangeCollection={() => {
            setShowStickerDialog(false);
            setShowCollectionSelector(true);
          }}
        />
      )}

      {/* Bonus sticker pack dialog */}
      {bonusCard && (
        <PackOpeningDialog
          open={showBonusStickerDialog}
          onOpenChange={setShowBonusStickerDialog}
          cardId={bonusCard.id}
          onOpened={handleCardOpened}
          onChangeCollection={() => {
            setShowBonusStickerDialog(false);
            setShowCollectionSelector(true);
          }}
        />
      )}

      {/* Collection selector dialog */}
      <CollectionSelectorDialog
        open={showCollectionSelector}
        onOpenChange={setShowCollectionSelector}
        onSelectCollection={(collectionId) => {
          setSelectedCollectionId(collectionId);
          setShowCollectionSelector(false);
        }}
        isDailyPack={dailyCard && !dailyCard.is_scratched}
      />

      {/* Selected collection pack dialog */}
      {selectedCollectionId && (
        <PackOpeningDialog
          open={!!selectedCollectionId}
          onOpenChange={(open) => !open && setSelectedCollectionId(null)}
          cardId={(dailyCard && !dailyCard.is_scratched) ? dailyCard.id : (bonusCard?.id || null)}
          collectionId={selectedCollectionId}
          onOpened={() => {
            setSelectedCollectionId(null);
            handleCardOpened();
          }}
          onChangeCollection={() => {
            setSelectedCollectionId(null);
            setShowCollectionSelector(true);
          }}
        />
      )}

    </div>
  );
}
