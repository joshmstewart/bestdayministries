import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCoins } from "@/hooks/useCoins";

export interface StorePurchase {
  id: string;
  store_item_id: string;
  coins_spent: number;
  purchased_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  store_items: {
    name: string;
    description: string;
    image_url: string | null;
    category: string;
  };
}

export const useStorePurchases = () => {
  const [purchases, setPurchases] = useState<StorePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { coins, refetch: refetchCoins } = useCoins();

  const fetchPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_store_purchases")
        .select(`
          id,
          store_item_id,
          coins_spent,
          purchased_at,
          is_redeemed,
          redeemed_at,
          store_items (
            name,
            description,
            image_url,
            category
          )
        `)
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      toast({
        title: "Error",
        description: "Failed to load your purchases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (itemId: string, itemPrice: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to make purchases",
          variant: "destructive",
        });
        return false;
      }

      // Check if user has enough coins
      if (coins < itemPrice) {
        toast({
          title: "Insufficient Coins",
          description: `You need ${itemPrice} JoyCoins but only have ${coins}`,
          variant: "destructive",
        });
        return false;
      }

      // Check if this is a memory match pack (id starts with "memory_pack_")
      const isMemoryPack = itemId.startsWith("memory_pack_");
      const actualItemId = isMemoryPack ? itemId.replace("memory_pack_", "") : itemId;

      // Start transaction: deduct coins and create purchase
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const newBalance = (profile.coins || 0) - itemPrice;

      // Update coins
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coins: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;

      if (isMemoryPack) {
        // Handle memory match pack purchase
        const { error: packPurchaseError } = await supabase
          .from("user_memory_match_packs")
          .insert({
            user_id: user.id,
            pack_id: actualItemId,
          });

        if (packPurchaseError) throw packPurchaseError;

        // Record transaction
        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: -itemPrice,
          transaction_type: "store_purchase",
          description: "Memory Match pack purchase",
          related_item_id: actualItemId,
        });
      } else {
        // Create regular store purchase record
        const { error: purchaseError } = await supabase
          .from("user_store_purchases")
          .insert({
            user_id: user.id,
            store_item_id: actualItemId,
            coins_spent: itemPrice,
          });

        if (purchaseError) throw purchaseError;

        // Record transaction
        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: -itemPrice,
          transaction_type: "store_purchase",
          description: "Store purchase",
          related_item_id: actualItemId,
        });
      }

      toast({
        title: "Purchase Successful!",
        description: `Item purchased for ${itemPrice} JoyCoins`,
      });

      // Refresh data
      await fetchPurchases();
      await refetchCoins();

      return true;
    } catch (error: any) {
      console.error("Error purchasing item:", error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  return {
    purchases,
    loading,
    purchaseItem,
    refetch: fetchPurchases,
  };
};
