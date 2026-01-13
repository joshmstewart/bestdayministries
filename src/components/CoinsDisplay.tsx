import { useCoins } from "@/hooks/useCoins";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinIcon } from "@/components/CoinIcon";
import { ChevronRight } from "lucide-react";

interface CoinsDisplayProps {
  onClick?: () => void;
}

export const CoinsDisplay = ({ onClick }: CoinsDisplayProps) => {
  const { coins, loading } = useCoins();

  if (loading) {
    return <Skeleton className="h-10 w-36" />;
  }

  return (
    <button
      data-testid="coins-display"
      onClick={onClick}
      className="group relative flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl font-semibold bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-950 shadow-[0_4px_12px_rgba(234,179,8,0.4)] hover:shadow-[0_6px_16px_rgba(234,179,8,0.5)] border border-yellow-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      aria-label="View coin ledger"
      title="View transaction history"
    >
      {/* Shine effect overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tl from-yellow-300/30 via-transparent to-transparent" />
      
      {/* Coin icon and count */}
      <CoinIcon className="relative z-10 drop-shadow-sm" size={18} />
      <span className="relative z-10 drop-shadow-sm text-base font-bold">{coins.toLocaleString()}</span>
      
      {/* Divider and ledger hint */}
      <div className="relative z-10 h-5 w-px bg-yellow-800/30 mx-1" />
      <div className="relative z-10 flex items-center gap-0.5 text-xs font-medium opacity-80 group-hover:opacity-100 transition-opacity">
        <span>Ledger</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
};
