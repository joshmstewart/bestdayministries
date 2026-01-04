import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useCoins = () => {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize coins from profile when available
  useEffect(() => {
    if (!authLoading) {
      if (profile) {
        setCoins(profile.coins || 0);
      }
      setLoading(false);
    }
  }, [authLoading, profile]);

  const fetchCoins = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
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
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Subscribe to realtime updates for coins
    const channel = supabase
      .channel('coins-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        () => fetchCoins()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, isAuthenticated, user?.id, fetchCoins]);

  const awardCoins = async (userId: string, amount: number, description: string) => {
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!currentProfile) throw new Error('User not found');

      const newBalance = (currentProfile.coins || 0) + amount;

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
    loading: loading || authLoading,
    refetch: fetchCoins,
    awardCoins,
  };
};
