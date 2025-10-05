import { Progress } from "./ui/progress";
import { DollarSign } from "lucide-react";

interface FundingProgressBarProps {
  currentAmount: number;
  goalAmount: number;
  endingAmount?: number; // Amount that will be cancelled next period
  className?: string;
}

export const FundingProgressBar = ({ 
  currentAmount, 
  goalAmount,
  endingAmount = 0,
  className 
}: FundingProgressBarProps) => {
  const stableAmount = currentAmount - endingAmount;
  const percentage = goalAmount > 0 ? Math.min(100, (currentAmount / goalAmount) * 100) : 0;
  const stablePercentage = goalAmount > 0 ? (stableAmount / goalAmount) * 100 : 0;
  const endingPercentage = goalAmount > 0 ? (endingAmount / goalAmount) * 100 : 0;
  const remaining = Math.max(0, goalAmount - currentAmount);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="w-4 h-4" />
          <span>Monthly Goal Progress</span>
        </div>
        <span className="text-sm font-bold">
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      {/* Custom progress bar with striped section for ending sponsorships */}
      <div className="relative h-3 mb-2 w-full overflow-hidden rounded-full bg-secondary">
        {/* Stable funding - solid color */}
        {stablePercentage > 0 && (
          <div
            className="absolute left-0 top-0 h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, stablePercentage)}%` }}
          />
        )}
        
        {/* Ending funding - diagonal stripes */}
        {endingPercentage > 0 && (
          <div
            className="absolute top-0 h-full transition-all overflow-hidden"
            style={{ 
              left: `${Math.min(100, stablePercentage)}%`,
              width: `${Math.min(100 - stablePercentage, endingPercentage)}%`
            }}
          >
            <div 
              className="h-full w-full"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  hsl(var(--burnt-orange)),
                  hsl(var(--burnt-orange)) 4px,
                  hsl(var(--accent)) 4px,
                  hsl(var(--accent)) 8px
                )`
              }}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          ${currentAmount.toFixed(2)} pledged
          {endingAmount > 0 && (
            <span className="ml-1 text-yellow-600 dark:text-yellow-400">
              (${endingAmount.toFixed(2)} ending)
            </span>
          )}
        </span>
        <span>
          ${remaining.toFixed(2)} remaining of ${goalAmount.toFixed(2)}
        </span>
      </div>
      
      {percentage >= 100 && (
        <div className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
          ✓ Goal Reached! Thank you to all sponsors!
        </div>
      )}
    </div>
  );
};