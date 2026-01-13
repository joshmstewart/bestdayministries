import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DENOMINATIONS } from "@/lib/moneyCountingUtils";
import { getCurrencyImage } from "@/lib/currencyImages";

interface CashDrawerProps {
  onSelectMoney: (denomination: string) => void;
  disabled: boolean;
}

export function CashDrawer({ onSelectMoney, disabled }: CashDrawerProps) {
  const bills = DENOMINATIONS.filter((d) => d.type === "bill");
  const coins = DENOMINATIONS.filter((d) => d.type === "coin");

  return (
    <Card className={cn("transition-opacity", disabled && "opacity-50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-xl">🗃️</span>
          Cash Drawer
        </CardTitle>
        {disabled && (
          <p className="text-sm text-muted-foreground">
            Collect the customer's cash first!
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bills Section */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Bills</h3>
          <div className="grid grid-cols-3 gap-2">
            {bills.map((denom) => {
              const image = getCurrencyImage(denom.value.toString());
              return (
                <Button
                  key={denom.value}
                  variant="ghost"
                  className={cn(
                    "h-auto p-1 flex flex-col items-center justify-center",
                    "hover:bg-accent/50 hover:scale-105 transition-transform",
                    "border border-transparent hover:border-primary/30 rounded-lg"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      className="w-full h-auto max-h-12 object-contain rounded shadow-sm"
                    />
                  ) : (
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      {denom.label}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold mt-0.5 text-muted-foreground">
                    {denom.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Coins Section */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Coins</h3>
          <div className="grid grid-cols-4 gap-1">
            {coins.map((denom) => {
              const image = getCurrencyImage(denom.value.toString());
              return (
                <Button
                  key={denom.value}
                  variant="ghost"
                  className={cn(
                    "h-auto p-1 flex flex-col items-center justify-center",
                    "hover:bg-accent/50 hover:scale-105 transition-transform",
                    "border border-transparent hover:border-primary/30 rounded-lg"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      className="w-10 h-10 object-contain rounded-full shadow-sm"
                    />
                  ) : (
                    <span className="text-xs font-bold">{denom.label}</span>
                  )}
                  <span className="text-[10px] font-semibold mt-0.5 text-muted-foreground">
                    {denom.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
