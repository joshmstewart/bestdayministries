import { Coins } from "lucide-react";
import { useCoins } from "@/hooks/useCoins";
import { Skeleton } from "@/components/ui/skeleton";

export const CoinsDisplay = () => {
  const { coins, loading } = useCoins();

  if (loading) {
    return <Skeleton className="h-8 w-20" />;
  }

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-950 shadow-lg border border-yellow-600/50">
      {/* Shine effect overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-yellow-300/30 via-transparent to-transparent" />
      
      {/* Icon and text */}
      <Coins className="h-4 w-4 relative z-10 drop-shadow-sm" />
      <span className="relative z-10 drop-shadow-sm">{coins.toLocaleString()}</span>
    </div>
  );
};
