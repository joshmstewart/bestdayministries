import { useDailyLoginReward } from "@/hooks/useDailyLoginReward";

/**
 * Component that runs the daily login reward check.
 * Place this inside AuthProvider to check for daily login bonus on app load.
 */
export const DailyLoginRewardManager = () => {
  useDailyLoginReward();
  return null;
};
