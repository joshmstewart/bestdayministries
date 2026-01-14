import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DENOMINATIONS } from "@/lib/moneyCountingUtils";
import { getCurrencyImage } from "@/lib/currencyImages";
import { getCoinSize, BASE_COIN_SIZE } from "@/lib/coinSizeRatios";

interface CashDrawerProps {
  onSelectMoney: (denomination: string) => void;
  disabled: boolean;
  customCurrencyImages?: { [key: string]: string };
}

export function CashDrawer({ onSelectMoney, disabled, customCurrencyImages }: CashDrawerProps) {
  const bills = DENOMINATIONS.filter((d) => d.type === "bill");
  const coins = DENOMINATIONS.filter((d) => d.type === "coin");

  const getImage = (denomination: string) => getCurrencyImage(denomination, customCurrencyImages);

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
          <div className="grid grid-cols-3 gap-1.5">
            {bills.map((denom) => {
              const image = getImage(denom.value.toString());
              return (
                <button
                  key={denom.value}
                  className={cn(
                    "relative cursor-pointer transition-all duration-150 flex flex-col items-center",
                    "hover:scale-105 hover:z-10 active:scale-95",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                    disabled && "pointer-events-none"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      className="w-full h-auto object-contain rounded shadow-md hover:shadow-lg"
                    />
                  ) : (
                    <div className="w-full aspect-[2.35/1] bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                      <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        {denom.label}
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-semibold mt-1 text-muted-foreground">
                    {denom.label}
                  </span>
                </button>
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
                <button
                  key={denom.value}
                  className={cn(
                    "relative cursor-pointer transition-all duration-150 flex flex-col items-center",
                    "hover:scale-110 hover:z-10 active:scale-95",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full",
                    disabled && "pointer-events-none"
                  )}
                  onClick={() => onSelectMoney(denom.value.toString())}
                  disabled={disabled}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={denom.label}
                      style={{ width: coinSize, height: coinSize }}
                      className="object-contain rounded-full shadow-md hover:shadow-lg"
                    />
                  ) : (
                    <div 
                      style={{ width: coinSize, height: coinSize }}
                      className="bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center"
                    >
                      <span className="text-xs font-bold">{denom.label}</span>
                    </div>
                  )}
                  <span className="text-xs font-semibold mt-1 text-muted-foreground">
                    {denom.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
