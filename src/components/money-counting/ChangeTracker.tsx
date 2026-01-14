import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ArrowDown } from "lucide-react";
import { formatMoney, getDenominationLabel } from "@/lib/moneyCountingUtils";
import { getCurrencyImage } from "@/lib/currencyImages";
import { cn } from "@/lib/utils";

interface ChangeTrackerProps {
  changeNeeded: number;
  changeGiven: { [key: string]: number };
  cashCollected: boolean;
  onReturnMoney: (denomination: string) => void;
  customCurrencyImages?: { [key: string]: string };
}

export function ChangeTracker({
  changeNeeded,
  changeGiven,
  cashCollected,
  onReturnMoney,
  customCurrencyImages,
}: ChangeTrackerProps) {
  const totalGiven = Object.entries(changeGiven).reduce(
    (sum, [denom, count]) => sum + parseFloat(denom) * count,
    0
  );
  
  const remaining = Math.max(0, changeNeeded - totalGiven);
  const progress = changeNeeded > 0 ? (totalGiven / changeNeeded) * 100 : 0;

  // Sort change given by denomination descending
  const sortedChange = Object.entries(changeGiven)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span>Change Due</span>
          </div>
          <span className="text-3xl font-bold text-primary">
            {formatMoney(remaining)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {formatMoney(totalGiven)} / {formatMoney(changeNeeded)}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        {/* Change given so far */}
        {sortedChange.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Change given:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedChange.map(([denom, count]) => {
                const numValue = parseFloat(denom);
                const isBill = numValue >= 1;
                const image = getCurrencyImage(denom, customCurrencyImages);
                
                return Array.from({ length: count }).map((_, i) => (
                  <Button
                    key={`${denom}-${i}`}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative group p-1 h-auto",
                      "hover:bg-destructive/10 transition-colors"
                    )}
                    onClick={() => onReturnMoney(denom)}
                    title="Click to return to drawer"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={getDenominationLabel(denom)}
                        className={cn(
                          "object-contain shadow-sm",
                          isBill ? "w-16 h-auto" : "w-10 h-10 rounded-full"
                        )}
                      />
                    ) : (
                      <span className={cn(
                        "px-2 py-1 rounded",
                        isBill
                          ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border border-green-300"
                          : "rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                      )}>
                        {getDenominationLabel(denom)}
                      </span>
                    )}
                    <span className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </span>
                  </Button>
                ));
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click any piece to return it to the drawer
            </p>
          </div>
        )}

        {/* Status message */}
        {!cashCollected && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Collect the customer's cash to start making change!
            </p>
          </div>
        )}

        {cashCollected && sortedChange.length === 0 && remaining > 0 && (
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-primary font-medium">
              Select bills and coins from the drawer to make {formatMoney(changeNeeded)} in change!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
