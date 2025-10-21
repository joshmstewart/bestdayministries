import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCoins = () => {
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCoins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCoins(data?.coins || 0);
    } catch (error) {
      console.error('Error fetching coins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      await fetchCoins();

      // Subscribe to realtime updates for this user only
      const channel = supabase
        .channel('coins-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Coins updated via realtime:', payload);
            fetchCoins();
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const awardCoins = async (userId: string, amount: number, description: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!profile) throw new Error('User not found');

      const newBalance = (profile.coins || 0) + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount,
          transaction_type: amount > 0 ? 'earned' : 'spent',
          description,
        });

      if (txError) throw txError;

      toast({
        title: amount > 0 ? "Coins Earned!" : "Coins Spent",
        description: `${Math.abs(amount)} coins ${amount > 0 ? 'added to' : 'deducted from'} account`,
      });

      fetchCoins();
    } catch (error) {
      console.error('Error awarding coins:', error);
      toast({
        title: "Error",
        description: "Failed to update coins",
        variant: "destructive",
      });
    }
  };

  return {
    coins,
    loading,
    refetch: fetchCoins,
    awardCoins,
  };
};
