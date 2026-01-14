import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DENOMINATIONS } from "@/lib/moneyCountingUtils";
import { getCurrencyImage } from "@/lib/currencyImages";

interface CashDrawerProps {
  onSelectMoney: (denomination: string) => void;
  disabled: boolean;
  customCurrencyImages?: { [key: string]: string };
}

// Real coin diameter ratios (relative to quarter = 1.0)
// Quarter: 24.26mm, Nickel: 21.21mm, Penny: 19.05mm, Dime: 17.91mm
const COIN_SIZE_RATIOS: { [key: string]: number } = {
  "0.25": 1.0,      // Quarter - largest
  "0.10": 0.738,    // Dime - smallest
  "0.05": 0.874,    // Nickel
  "0.01": 0.785,    // Penny
};

const BASE_COIN_SIZE = 64; // Base size in pixels for quarter

export function CashDrawer({ onSelectMoney, disabled, customCurrencyImages }: CashDrawerProps) {
  const bills = DENOMINATIONS.filter((d) => d.type === "bill");
  const coins = DENOMINATIONS.filter((d) => d.type === "coin");

  const getImage = (denomination: string) => getCurrencyImage(denomination, customCurrencyImages);

  const getCoinSize = (value: number) => {
    const ratio = COIN_SIZE_RATIOS[value.toString()] || 1;
    return Math.round(BASE_COIN_SIZE * ratio);
  };

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
      <CardContent className="space-y-4">
        {/* Bills Section */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Bills</h3>
          <div className="grid grid-cols-3 gap-2">
            {bills.map((denom) => {
              const image = getImage(denom.value.toString());
              return (
                <Button
                  key={denom.value}
                  variant="ghost"
                  className={cn(
                    "h-auto p-1.5 flex flex-col items-center justify-center",
                    "hover:bg-accent/50 hover:scale-105 transition-transform",
                    "border border-border/50 hover:border-primary/50 rounded-lg bg-card/50"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      className="w-full h-auto object-contain rounded shadow-sm"
                    />
                  ) : (
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      {denom.label}
                    </span>
                  )}
                  <span className="text-xs font-semibold mt-1 text-muted-foreground">
                    {denom.label}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Coins Section */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Coins</h3>
          <div className="flex items-end justify-center gap-3">
            {coins.map((denom) => {
              const image = getImage(denom.value.toString());
              const coinSize = getCoinSize(denom.value);
              return (
                <Button
                  key={denom.value}
                  variant="ghost"
                  className={cn(
                    "h-auto p-1.5 flex flex-col items-center justify-center",
                    "hover:bg-accent/50 hover:scale-110 transition-transform",
                    "border border-border/50 hover:border-primary/50 rounded-lg bg-card/50"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      style={{ width: coinSize, height: coinSize }}
                      className="object-contain rounded-full shadow-sm"
                    />
                  ) : (
                    <span className="text-xs font-bold">{denom.label}</span>
                  )}
                  <span className="text-xs font-semibold mt-1 text-muted-foreground">
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
