import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { useAuth } from "@/contexts/AuthContext";

// Generate a unique ID for each hook instance
let hookInstanceCounter = 0;

export const useCoins = () => {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const instanceIdRef = useRef<number>(++hookInstanceCounter);

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
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    // Always fetch fresh coins on mount to ensure we have latest data
    fetchCoins();

    // Subscribe to realtime updates for coins - use unique channel name per instance
    const channelName = `coins-changes-${user.id}-${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Directly update from payload for immediate response
          const newCoins = (payload.new as { coins?: number })?.coins;
          if (typeof newCoins === 'number') {
            setCoins(newCoins);
          } else {
            fetchCoins();
          }
        }
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

      toast.success(`${Math.abs(amount)} coins ${amount > 0 ? 'earned' : 'spent'}!`);

      fetchCoins();
    } catch (error) {
      console.error('Error awarding coins:', error);
      showErrorToastWithCopy("Failed to update coins", error);
    }
  };

  const deductCoins = async (amount: number, description: string, relatedItemId?: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Check current balance
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (!currentProfile) throw new Error('User not found');

      const currentCoins = currentProfile.coins || 0;
      if (currentCoins < amount) {
        showErrorToast('Not enough coins!');
        return false;
      }

      const newBalance = currentCoins - amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -amount,
          transaction_type: 'spent',
          description,
          related_item_id: relatedItemId || null,
        });

      if (txError) throw txError;

      setCoins(newBalance);
      return true;
    } catch (error) {
      console.error('Error deducting coins:', error);
      showErrorToastWithCopy("Failed to deduct coins", error);
      return false;
    }
  };

  return {
    coins,
    loading: loading || authLoading,
    refetch: fetchCoins,
    awardCoins,
    deductCoins,
  };
};
