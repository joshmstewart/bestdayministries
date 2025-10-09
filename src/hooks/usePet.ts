import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Pet {
  id: string;
  user_id: string;
  pet_type_id: string;
  pet_name: string;
  happiness: number;
  hunger: number;
  energy: number;
  last_fed_at: string | null;
  last_played_at: string | null;
  last_rested_at: string | null;
  last_decay_at: string;
  adopted_at: string;
  pet_types: {
    name: string;
    description: string;
    image_url: string | null;
  };
}

interface PetType {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  unlock_cost: number;
  base_happiness: number;
  base_hunger: number;
  base_energy: number;
}

export function usePet() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_pets")
        .select(`
          *,
          pet_types (
            name,
            description,
            image_url
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setPet(data);
    } catch (error: any) {
      console.error("Error fetching pet:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPetTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("pet_types")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPetTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching pet types:", error);
    }
  };

  const adoptPet = async (petTypeId: string, petName: string, unlockCost: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has enough coins
      const { data: profile } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (!profile || profile.coins < unlockCost) {
        toast({
          title: "Not enough coins",
          description: `You need ${unlockCost} coins to adopt this pet`,
          variant: "destructive",
        });
        return false;
      }

      // Get pet type base stats
      const { data: petType } = await supabase
        .from("pet_types")
        .select("base_happiness, base_hunger, base_energy")
        .eq("id", petTypeId)
        .single();

      if (!petType) throw new Error("Pet type not found");

      // Adopt pet
      const { error: adoptError } = await supabase
        .from("user_pets")
        .insert({
          user_id: user.id,
          pet_type_id: petTypeId,
          pet_name: petName,
          happiness: petType.base_happiness,
          hunger: petType.base_hunger,
          energy: petType.base_energy,
        });

      if (adoptError) throw adoptError;

      // Deduct coins if unlock cost > 0
      if (unlockCost > 0) {
        const { error: coinsError } = await supabase
          .from("profiles")
          .update({ coins: profile.coins - unlockCost })
          .eq("id", user.id);

        if (coinsError) throw coinsError;

        // Log transaction
        await supabase.from("coin_transactions").insert({
          user_id: user.id,
          amount: -unlockCost,
          transaction_type: "pet_adoption",
          description: `Adopted ${petName}`,
          related_item_id: petTypeId,
        });
      }

      toast({
        title: "Pet adopted!",
        description: `Welcome ${petName} to your family!`,
      });

      await fetchPet();
      return true;
    } catch (error: any) {
      toast({
        title: "Error adopting pet",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const feedPet = async () => {
    if (!pet) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const FEED_COST = 5;
      const HUNGER_INCREASE = 20;

      // Check coins
      const { data: profile } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (!profile || profile.coins < FEED_COST) {
        toast({
          title: "Not enough coins",
          description: `You need ${FEED_COST} coins to feed your pet`,
          variant: "destructive",
        });
        return false;
      }

      // Update pet
      const newHunger = Math.min(100, pet.hunger + HUNGER_INCREASE);
      const { error: petError } = await supabase
        .from("user_pets")
        .update({
          hunger: newHunger,
          last_fed_at: new Date().toISOString(),
        })
        .eq("id", pet.id);

      if (petError) throw petError;

      // Deduct coins
      const { error: coinsError } = await supabase
        .from("profiles")
        .update({ coins: profile.coins - FEED_COST })
        .eq("id", user.id);

      if (coinsError) throw coinsError;

      // Log transaction
      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount: -FEED_COST,
        transaction_type: "pet_care",
        description: `Fed ${pet.pet_name}`,
        related_item_id: pet.id,
      });

      toast({
        title: "Pet fed!",
        description: `${pet.pet_name} is happier now!`,
      });

      await fetchPet();
      return true;
    } catch (error: any) {
      toast({
        title: "Error feeding pet",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const playWithPet = async () => {
    if (!pet) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const PLAY_COST = 10;
      const HAPPINESS_INCREASE = 20;
      const ENERGY_DECREASE = 10;

      // Check coins
      const { data: profile } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();

      if (!profile || profile.coins < PLAY_COST) {
        toast({
          title: "Not enough coins",
          description: `You need ${PLAY_COST} coins to play with your pet`,
          variant: "destructive",
        });
        return false;
      }

      // Update pet
      const newHappiness = Math.min(100, pet.happiness + HAPPINESS_INCREASE);
      const newEnergy = Math.max(0, pet.energy - ENERGY_DECREASE);
      const { error: petError } = await supabase
        .from("user_pets")
        .update({
          happiness: newHappiness,
          energy: newEnergy,
          last_played_at: new Date().toISOString(),
        })
        .eq("id", pet.id);

      if (petError) throw petError;

      // Deduct coins
      const { error: coinsError } = await supabase
        .from("profiles")
        .update({ coins: profile.coins - PLAY_COST })
        .eq("id", user.id);

      if (coinsError) throw coinsError;

      // Log transaction
      await supabase.from("coin_transactions").insert({
        user_id: user.id,
        amount: -PLAY_COST,
        transaction_type: "pet_care",
        description: `Played with ${pet.pet_name}`,
        related_item_id: pet.id,
      });

      toast({
        title: "Playtime!",
        description: `${pet.pet_name} had fun!`,
      });

      await fetchPet();
      return true;
    } catch (error: any) {
      toast({
        title: "Error playing with pet",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const restPet = async () => {
    if (!pet) return false;

    try {
      const ENERGY_INCREASE = 30;

      // Update pet
      const newEnergy = Math.min(100, pet.energy + ENERGY_INCREASE);
      const { error: petError } = await supabase
        .from("user_pets")
        .update({
          energy: newEnergy,
          last_rested_at: new Date().toISOString(),
        })
        .eq("id", pet.id);

      if (petError) throw petError;

      toast({
        title: "Pet is resting",
        description: `${pet.pet_name} feels refreshed!`,
      });

      await fetchPet();
      return true;
    } catch (error: any) {
      toast({
        title: "Error resting pet",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPet();
    fetchPetTypes();

    // Subscribe to pet changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPet();
    });

    // Subscribe to realtime updates
    const channel = supabase
      .channel("user_pets_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_pets" },
        () => {
          fetchPet();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    pet,
    petTypes,
    loading,
    adoptPet,
    feedPet,
    playWithPet,
    restPet,
    refreshPet: fetchPet,
  };
}
