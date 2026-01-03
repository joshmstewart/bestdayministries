import { Truck, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FreeShippingProgressProps {
  currentSubtotal: number;
  threshold?: number;
  vendorName?: string;
}

export const FreeShippingProgress = ({ 
  currentSubtotal, 
  threshold = 35,
  vendorName
}: FreeShippingProgressProps) => {
  const remaining = Math.max(0, threshold - currentSubtotal);
  const progress = Math.min(100, (currentSubtotal / threshold) * 100);
  const hasFreeShipping = currentSubtotal >= threshold;

  if (hasFreeShipping) {
    return (
      <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
          <Check className="h-4 w-4" />
          <span className="font-medium">
            {vendorName ? `${vendorName}: ` : ''}FREE shipping unlocked!
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 bg-muted/50 rounded-lg space-y-1.5">
      <div className="flex items-center gap-2">
        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs">
          {vendorName && <span className="font-medium">{vendorName}: </span>}
          Add <span className="font-semibold text-primary">${remaining.toFixed(2)}</span> more for FREE shipping
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>${currentSubtotal.toFixed(2)}</span>
        <span>${threshold.toFixed(2)}</span>
      </div>
    </div>
  );
};
