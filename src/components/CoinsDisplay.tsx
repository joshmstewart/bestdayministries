import { useCoins } from "@/hooks/useCoins";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinIcon } from "@/components/CoinIcon";
import { Receipt } from "lucide-react";

interface CoinsDisplayProps {
  onClick?: () => void;
}

export const CoinsDisplay = ({ onClick }: CoinsDisplayProps) => {
  const { coins, loading } = useCoins();

  console.log('💰 COMPONENT: CoinsDisplay render - coins:', coins, 'loading:', loading);

  if (loading) {
    console.log('💰 COMPONENT: CoinsDisplay showing skeleton');
    return <Skeleton className="h-8 w-28" />;
  }

  return (
    <button
      data-testid="coins-display"
      onClick={onClick}
      className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-950 shadow-[0_4px_12px_rgba(234,179,8,0.4)] hover:shadow-[0_6px_16px_rgba(234,179,8,0.5)] border border-yellow-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer text-sm"
      aria-label="View coin ledger"
      title="View transaction history"
    >
      {/* Shine effect overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-yellow-300/30 via-transparent to-transparent" />
      
      {/* Icon and text */}
      <CoinIcon className="relative z-10 drop-shadow-sm" size={16} />
      <span className="relative z-10 drop-shadow-sm">{coins.toLocaleString()}</span>
      <Receipt className="relative z-10 h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
