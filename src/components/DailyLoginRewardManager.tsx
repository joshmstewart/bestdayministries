import { useDailyLoginReward } from "@/hooks/useDailyLoginReward";
import { StreakMilestoneCelebration } from "./daily-features/StreakMilestoneCelebration";

/**
 * Component that runs the daily login reward check.
 * Place this inside AuthProvider to check for daily login bonus on app load.
 * Shows celebration dialog when streak milestones are achieved.
 */
export const DailyLoginRewardManager = () => {
  const { milestoneAwarded, currentStreak, showCelebration, setShowCelebration } = useDailyLoginReward();

  return (
    <>
      {milestoneAwarded && (
        <StreakMilestoneCelebration
          open={showCelebration}
          onOpenChange={setShowCelebration}
          milestone={milestoneAwarded}
          currentStreak={currentStreak}
        />
      )}
    </>
  );
};
