import { useState } from "react";
import { useDailyLoginReward } from "@/hooks/useDailyLoginReward";
import { StreakMilestoneCelebration } from "./daily-features/StreakMilestoneCelebration";
import { PackOpeningDialog } from "./PackOpeningDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Component that runs the daily login reward check.
 * Place this inside AuthProvider to check for daily login bonus on app load.
 * Shows celebration dialog when streak milestones are achieved.
 * Allows immediate pack opening when sticker packs are awarded.
 */
export const DailyLoginRewardManager = () => {
  const { user } = useAuth();
  const { milestoneAwarded, currentStreak, showCelebration, setShowCelebration, bonusCardId } = useDailyLoginReward();
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [packCardId, setPackCardId] = useState<string | null>(null);

  const handleOpenPack = async () => {
    // Use the bonus card ID from the hook if available, otherwise find the latest bonus card
    if (bonusCardId) {
      setPackCardId(bonusCardId);
      setShowPackDialog(true);
      return;
    }

    // Fallback: find an unscratched bonus card for this user
    if (!user) return;
    
    const { data: bonusCard } = await supabase
      .from("daily_scratch_cards")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_bonus_card", true)
      .eq("is_scratched", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bonusCard) {
      setPackCardId(bonusCard.id);
      setShowPackDialog(true);
    }
  };

  const handlePackOpened = () => {
    setPackCardId(null);
  };

  return (
    <>
      {milestoneAwarded && (
        <StreakMilestoneCelebration
          open={showCelebration}
          onOpenChange={setShowCelebration}
          milestone={milestoneAwarded}
          currentStreak={currentStreak}
          onOpenPack={milestoneAwarded.free_sticker_packs > 0 ? handleOpenPack : undefined}
        />
      )}

      {packCardId && (
        <PackOpeningDialog
          open={showPackDialog}
          onOpenChange={setShowPackDialog}
          cardId={packCardId}
          onOpened={handlePackOpened}
        />
      )}
    </>
  );
};
