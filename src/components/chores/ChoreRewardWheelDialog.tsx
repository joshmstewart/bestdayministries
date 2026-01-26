import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Coins, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpinningWheel, WheelSegment } from "./SpinningWheel";
import confetti from "canvas-confetti";
import { useSoundEffects } from "@/hooks/useSoundEffects";

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
  const { playSound } = useSoundEffects();

  // Load wheel config and check if already spun today
  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      setLoading(true);
      setWonPrize(null);
      
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
          const activePreset = config.presets[config.active_preset];
          if (activePreset) {
            setSegments(activePreset.segments);
          }
        }

        // Check if user has already spun today
        const today = new Date().toISOString().split("T")[0];
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
    // This is called when the spin animation begins
    playSound("button_click");
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
          toast.success(`You won ${segment.amount} coins! 🪙`);
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

  const startSpin = () => {
    if (hasSpunToday || spinning) return;
    setSpinning(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Gift className="h-5 w-5 text-primary" />
            Reward Wheel!
          </DialogTitle>
          <DialogDescription className="text-center">
            Spin to win coins or sticker packs!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
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
                  onSpinStart={handleSpinStart}
                  disabled={hasSpunToday}
                  size={280}
                />

              {wonPrize && (
                <div className="flex flex-col items-center gap-2 animate-fade-in">
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
                  disabled={spinning}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
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
