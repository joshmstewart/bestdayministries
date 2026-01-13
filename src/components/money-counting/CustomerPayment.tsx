import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, HandCoins } from "lucide-react";
import { formatMoney, getDenominationLabel } from "@/lib/moneyCountingUtils";
import { cn } from "@/lib/utils";

interface CustomerPaymentProps {
  customerCash: { [key: string]: number };
  totalPayment: number;
  cashCollected: boolean;
  onCollect: () => void;
}

export function CustomerPayment({
  customerCash,
  totalPayment,
  cashCollected,
  onCollect,
}: CustomerPaymentProps) {
  // Sort by denomination value descending
  const sortedCash = Object.entries(customerCash)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

  return (
    <Card className={cn(cashCollected && "border-green-500 bg-green-50/50 dark:bg-green-950/20")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧑‍💼</span>
            Customer Pays
          </div>
          <Badge variant="secondary" className="text-lg">
            {formatMoney(totalPayment)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display customer's cash */}
        <div className="flex flex-wrap gap-2">
          {sortedCash.map(([denom, count]) => {
            const numValue = parseFloat(denom);
            const isBill = numValue >= 1;
            
            return (
              <div key={denom} className="flex items-center gap-1">
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-center font-semibold text-sm",
                      isBill
                        ? "w-14 h-8 rounded bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 border border-green-300"
                        : "w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border border-gray-400",
                      numValue === 0.01 && "from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-700 border-amber-500"
                    )}
                  >
                    {getDenominationLabel(denom)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Collect button */}
        <Button
          onClick={onCollect}
          disabled={cashCollected}
          className="w-full"
          size="lg"
        >
          {cashCollected ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Cash Collected
            </>
          ) : (
            <>
              <HandCoins className="h-5 w-5 mr-2" />
              Collect Cash & Make Change
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
