import { Coins } from "lucide-react";
import { useCoins } from "@/hooks/useCoins";
import { Skeleton } from "@/components/ui/skeleton";

export const CoinsDisplay = () => {
  const { coins, loading } = useCoins();

  if (loading) {
    return <Skeleton className="h-8 w-20" />;
  }

  return (
    <div className="flex items-center gap-2 bg-gradient-warm text-primary-foreground px-3 py-1.5 rounded-full font-semibold">
      <Coins className="h-4 w-4" />
      <span>{coins.toLocaleString()}</span>
    </div>
  );
};
