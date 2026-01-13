import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DENOMINATIONS, getDenominationLabel } from "@/lib/moneyCountingUtils";

interface CashDrawerProps {
  onSelectMoney: (denomination: string) => void;
  disabled: boolean;
}

export function CashDrawer({ onSelectMoney, disabled }: CashDrawerProps) {
  const bills = DENOMINATIONS.filter((d) => d.type === "bill");
  const coins = DENOMINATIONS.filter((d) => d.type === "coin");

  return (
    <Card className={cn("transition-opacity", disabled && "opacity-50")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🗃️</span>
          Cash Drawer
        </CardTitle>
        {disabled && (
          <p className="text-sm text-muted-foreground">
            Collect the customer's cash first!
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bills Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Bills</h3>
          <div className="grid grid-cols-3 gap-2">
            {bills.map((denom) => (
              <Button
                key={denom.value}
                variant="outline"
                className={cn(
                  "h-16 flex items-center justify-center",
                  "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
                  "border-green-300 dark:border-green-700 hover:border-green-500"
                )}
                onClick={() => onSelectMoney(denom.value.toString())}
                disabled={disabled}
              >
                <span className="text-lg font-bold text-green-700 dark:text-green-300">
                  {denom.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Coins Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Coins</h3>
          <div className="grid grid-cols-4 gap-2">
            {coins.map((denom) => {
              const coinColors: { [key: string]: string } = {
                "0.25": "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-gray-400",
                "0.10": "from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500 border-gray-500",
                "0.05": "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-gray-400",
                "0.01": "from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-700 border-amber-500",
              };
              return (
                <Button
                  key={denom.value}
                  variant="outline"
                  className={cn(
                    "h-14 flex items-center justify-center rounded-full aspect-square",
                    "bg-gradient-to-br",
                    coinColors[denom.value.toString()] || "from-gray-200 to-gray-300"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  <span className="text-sm font-bold">{denom.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
