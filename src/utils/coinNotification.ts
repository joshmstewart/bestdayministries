import { toast } from "@/hooks/use-toast";

/**
 * Centralized utility for showing coin earned notifications
 * Use this whenever coins are awarded to ensure consistent UI
 */
export const showCoinNotification = (amount: number, reason?: string) => {
  toast({
    title: `+${amount} JoyCoins! 🪙`,
    description: reason || "Coins added to your balance",
  });
};
