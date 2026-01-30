import { DailyMoodCheckin } from "./DailyMoodCheckin";
import { DailyFortune } from "./DailyFortune";
import { StreakMeter } from "./StreakMeter";
import { DailyBar } from "./DailyBar";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";

/**
 * A combined hub of daily features that can be displayed on the community page
 * or as a standalone page.
 */
export function DailyHub() {
  return (
    <div className="space-y-4">
      {/* Streak Meter - always visible at top */}
      <StreakMeter />
      
      {/* Daily Fortune */}
      <DailyFortune />
      
      {/* Daily Mood Check-in */}
      <DailyMoodCheckin />
    </div>
  );
}

export { DailyMoodCheckin, DailyFortune, StreakMeter, DailyBar, QuickMoodPicker, DailyFortunePopup };
