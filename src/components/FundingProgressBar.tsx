import { Progress } from "./ui/progress";
import { DollarSign } from "lucide-react";

interface FundingProgressBarProps {
  currentAmount: number;
  goalAmount: number;
  className?: string;
}

export const FundingProgressBar = ({ 
  currentAmount, 
  goalAmount,
  className 
}: FundingProgressBarProps) => {
  const percentage = goalAmount > 0 ? Math.min(100, (currentAmount / goalAmount) * 100) : 0;
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
      
      <Progress value={percentage} className="h-3 mb-2" />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          ${currentAmount.toFixed(2)} pledged
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