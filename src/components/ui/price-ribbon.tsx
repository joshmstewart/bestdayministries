import { CoinIcon } from "@/components/CoinIcon";

interface PriceRibbonProps {
  /** Price in coins (not required when isFree is true) */
  price?: number;
  /** Position: top-right (default) or top-left */
  position?: "top-right" | "top-left";
  /** Size variant */
  size?: "sm" | "md";
  /** Whether to show the FREE badge instead of price */
  isFree?: boolean;
}

/**
 * A diagonal ribbon showing price in coins.
 * Used for purchasable items like coloring books and memory match packs.
 */
export function PriceRibbon({ 
  price, 
  position = "top-right",
  size = "sm",
  isFree = false,
}: PriceRibbonProps) {
  if (isFree) {
    return (
      <div 
        className={`absolute z-10 bg-green-500 text-white font-bold shadow-md ${
          size === "sm" ? "text-[9px] py-0.5 px-8" : "text-xs py-1 px-10"
        } ${
          position === "top-right" 
            ? "top-3 -right-8 rotate-45" 
            : "top-3 -left-8 -rotate-45"
        }`}
        style={{ transformOrigin: 'center' }}
      >
        FREE
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-10 overflow-hidden">
      <div 
        className={`absolute bg-yellow-500 text-black font-bold shadow-md flex items-center justify-center gap-1 ${
          size === "sm" ? "text-[9px] py-0.5 px-8 top-3" : "text-xs py-1 px-10 top-4"
        } ${
          position === "top-right" 
            ? "-right-8 rotate-45" 
            : "-left-8 -rotate-45"
        }`}
        style={{ transformOrigin: 'center' }}
      >
        {price}
        <CoinIcon size={size === "sm" ? 10 : 14} />
      </div>
    </div>
  );
}
