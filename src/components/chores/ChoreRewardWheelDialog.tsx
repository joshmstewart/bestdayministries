import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Coins, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showCoinNotification } from "@/utils/coinNotification";
import { SpinningWheel, WheelSegment } from "./SpinningWheel";
import confetti from "canvas-confetti";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { cn } from "@/lib/utils";

interface ChoreRewardWheelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onPrizeWon?: (prizeType: string, amount: number, cardIds?: string[]) => void;
}

interface WheelConfig {
  active_preset: string;
  presets: {
    [key: string]: {
      name: string;
      description: string;
      segments: WheelSegment[];
    };
  };
}

export function ChoreRewardWheelDialog({
  open,
  onOpenChange,
  userId,
  onPrizeWon,
}: ChoreRewardWheelDialogProps) {
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [wonPrize, setWonPrize] = useState<WheelSegment | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [wheelClickSound, setWheelClickSound] = useState<{ url: string; volume: number } | null>(null);
  const { playSound, soundEffects } = useSoundEffects();

  // Get MST date using Intl (must match edge function logic)
  const getMSTDate = (): string => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  };

  // Get wheel click sound from sound effects
  useEffect(() => {
    const wheelEffect = soundEffects['wheel_click'];
    if (wheelEffect?.is_enabled && wheelEffect.file_url) {
      setWheelClickSound({ url: wheelEffect.file_url, volume: wheelEffect.volume });
    } else {
      setWheelClickSound(null);
    }
  }, [soundEffects]);

  // Load wheel config and check if already spun today
  // CRITICAL: Reset ALL interactive state when dialog opens to prevent stuck states
  useEffect(() => {
    if (!open) return;
    
    // Reset state immediately when dialog opens - prevents "stuck" from previous sessions
    setSpinning(false);
    setClaiming(false);
    setHasSpunToday(false);
    setWonPrize(null);
    setLoading(true);
    
    const loadData = async () => {
      try {
        // Load wheel config from app_settings
        const { data: configData, error: configError } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "chore_wheel_config")
          .maybeSingle();

        if (configError) throw configError;

        if (configData?.setting_value) {
          const config = configData.setting_value as unknown as WheelConfig;
          const activePresetKey = config.active_preset || "balanced";
          const activePreset = config.presets?.[activePresetKey];
          if (activePreset?.segments && Array.isArray(activePreset.segments)) {
            setSegments(activePreset.segments);
          } else {
            console.warn("Wheel config missing segments:", config);
          }
        } else {
          console.warn("No wheel config found in app_settings");
        }

        // Check if user has already spun today (use MST date)
        const today = getMSTDate();
        const { data: spinData } = await supabase
          .from("chore_wheel_spins")
          .select("id, prize_type, prize_amount")
          .eq("user_id", userId)
          .eq("spin_date", today)
          .maybeSingle();

        if (spinData) {
          setHasSpunToday(true);
          // Show what they won
          setWonPrize({
            label: spinData.prize_type === "coins" 
              ? `${spinData.prize_amount} Coins` 
              : `${spinData.prize_amount} Pack${spinData.prize_amount > 1 ? 's' : ''}`,
            type: spinData.prize_type as "coins" | "sticker_pack",
            amount: spinData.prize_amount,
            color: spinData.prize_type === "coins" ? "#FFD700" : "#9370DB",
            probability: 0,
          });
        }
      } catch (error) {
        console.error("Error loading wheel data:", error);
        toast.error("Failed to load wheel");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, userId]);

  const handleSpinStart = () => {
    // Play click sound when spin starts
    playSound("button_click");
  };

  // Unified disabled state for wheel and button
  const wheelDisabled = loading || hasSpunToday || claiming;

  const startSpin = () => {
    if (wheelDisabled || spinning) return;
    setSpinning(true);
    handleSpinStart();
  };

  const handleSpinEnd = async (segment: WheelSegment) => {
    setSpinning(false);
    setWonPrize(segment);
    setClaiming(true);

    // Fire confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    });

    // Play win sound
    if (segment.type === "coins") {
      playSound("success");
    } else {
      playSound("sticker_pack_reveal");
    }

    try {
      // Call edge function to claim the prize
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in again");
        return;
      }

      const response = await supabase.functions.invoke("spin-chore-wheel", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          prizeType: segment.type,
          prizeAmount: segment.amount,
        },
      });

      if (response.error) {
        console.error("Error claiming prize:", response.error);
        toast.error("Failed to claim prize");
        return;
      }

      const result = response.data;
      
      if (result.success) {
        setHasSpunToday(true);
        
        if (segment.type === "coins") {
          showCoinNotification(segment.amount, "Won from Reward Wheel!");
        } else {
          toast.success(`You won ${segment.amount} sticker pack${segment.amount > 1 ? 's' : ''}! 🎁`);
        }

        // Notify parent about the prize
        onPrizeWon?.(segment.type, segment.amount, result.cardIds);
      } else {
        toast.error(result.error || "Failed to claim prize");
      }
    } catch (error) {
      console.error("Error claiming prize:", error);
      toast.error("Failed to claim prize");
    } finally {
      setClaiming(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md overflow-hidden" 
        hideCloseButton
        style={{
          background: wonPrize 
            ? wonPrize.type === "coins"
              ? "linear-gradient(180deg, hsl(46 95% 95%) 0%, hsl(33 100% 97%) 50%, hsl(0 0% 100%) 100%)"
              : "linear-gradient(180deg, hsl(270 60% 95%) 0%, hsl(280 50% 97%) 50%, hsl(0 0% 100%) 100%)"
            : "linear-gradient(180deg, hsl(24 85% 97%) 0%, hsl(33 100% 98%) 100%)"
        }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, hsl(46 95% 55%) 0%, transparent 70%)" }}
          />
          <div 
            className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, hsl(24 85% 56%) 0%, transparent 70%)" }}
          />
        </div>

        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Gift className="h-5 w-5 text-primary" />
            Reward Wheel!
          </DialogTitle>
          <DialogDescription className="text-center">
            Spin to win coins or sticker packs!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : segments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Wheel configuration not found.
            </p>
          ) : (
            <>
              <SpinningWheel
                segments={segments}
                onSpinEnd={handleSpinEnd}
                spinning={spinning}
                onSpinStart={startSpin}
                disabled={wheelDisabled}
                size={280}
                clickSoundUrl={wheelClickSound?.url}
                clickSoundVolume={wheelClickSound?.volume}
              />

              {wonPrize && (
                <div 
                  className={cn(
                    "flex flex-col items-center gap-2 animate-fade-in p-4 rounded-xl",
                    wonPrize.type === "coins" 
                      ? "bg-gradient-to-br from-secondary/20 to-accent/10"
                      : "bg-gradient-to-br from-purple-200/30 to-purple-100/20"
                  )}
                  style={{
                    boxShadow: "0 4px 16px -4px hsl(var(--primary) / 0.15)"
                  }}
                >
                  <div className="flex items-center gap-2 text-lg font-bold">
                    {wonPrize.type === "coins" ? (
                      <>
                        <Coins className="h-6 w-6 text-yellow-500" />
                        <span>{wonPrize.amount} Coins!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-6 w-6 text-purple-500" />
                        <span>{wonPrize.amount} Sticker Pack{wonPrize.amount > 1 ? 's' : ''}!</span>
                      </>
                    )}
                  </div>
                  {claiming && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Claiming your prize...
                    </p>
                  )}
                </div>
              )}

              {!hasSpunToday && !wonPrize && (
                <Button
                  size="lg"
                  onClick={startSpin}
                  disabled={wheelDisabled || spinning}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all"
                >
                  {spinning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Spinning...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Spin the Wheel!
                    </>
                  )}
                </Button>
              )}

              {hasSpunToday && !spinning && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
