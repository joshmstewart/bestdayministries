import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Check, Lock, Coins, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCoins } from "@/hooks/useCoins";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocationPackPickerProps {
  userId: string;
}

interface LocationPack {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_free: boolean;
  price_coins: number;
  display_order: number;
}

interface UserPack {
  pack_id: string;
  is_enabled: boolean;
}

export const LocationPackPicker = ({ userId }: LocationPackPickerProps) => {
  const queryClient = useQueryClient();
  const { coins, deductCoins } = useCoins();
  const [purchasePack, setPurchasePack] = useState<LocationPack | null>(null);

  // Fetch all active location packs
  const { data: packs = [], isLoading: loadingPacks } = useQuery({
    queryKey: ["workout-location-packs-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_location_packs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as LocationPack[];
    },
  });

  // Fetch user's owned/enabled packs
  const { data: userPacks = [], isLoading: loadingUserPacks } = useQuery({
    queryKey: ["user-workout-location-packs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_location_packs")
        .select("pack_id, is_enabled")
        .eq("user_id", userId);

      if (error) throw error;
      return data as UserPack[];
    },
    enabled: !!userId,
  });

  const userPacksMap = new Map(userPacks.map((up) => [up.pack_id, up]));

  const isPackOwned = (pack: LocationPack) => {
    return pack.is_free || userPacksMap.has(pack.id);
  };

  const isPackEnabled = (packId: string) => {
    const userPack = userPacksMap.get(packId);
    // If user has a preference, use it; otherwise default to enabled for owned packs
    return userPack?.is_enabled ?? true;
  };

  // Toggle pack enabled status
  const toggleMutation = useMutation({
    mutationFn: async ({ packId, enabled }: { packId: string; enabled: boolean }) => {
      const existingRecord = userPacksMap.get(packId);

      if (existingRecord) {
        const { error } = await supabase
          .from("user_workout_location_packs")
          .update({ is_enabled: enabled })
          .eq("user_id", userId)
          .eq("pack_id", packId);

        if (error) throw error;
      } else {
        // For free packs, create a record when toggling
        const { error } = await supabase
          .from("user_workout_location_packs")
          .insert({
            user_id: userId,
            pack_id: packId,
            is_enabled: enabled,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-workout-location-packs"] });
    },
    onError: () => {
      toast.error("Failed to update location preference");
    },
  });

  // Purchase a pack
  const purchaseMutation = useMutation({
    mutationFn: async (pack: LocationPack) => {
      const success = await deductCoins(pack.price_coins, `Purchased ${pack.name} location pack`, pack.id);
      if (!success) {
        throw new Error("Not enough coins");
      }

      const { error } = await supabase
        .from("user_workout_location_packs")
        .insert({
          user_id: userId,
          pack_id: pack.id,
          is_enabled: true,
        });

      if (error) throw error;
      return pack;
    },
    onSuccess: (pack) => {
      queryClient.invalidateQueries({ queryKey: ["user-workout-location-packs"] });
      toast.success(`🗺️ You unlocked ${pack.name}!`);
      setPurchasePack(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to purchase");
      setPurchasePack(null);
    },
  });

  const handlePackClick = (pack: LocationPack) => {
    const owned = isPackOwned(pack);
    if (!owned) {
      setPurchasePack(pack);
    }
  };

  const enabledCount = packs.filter((p) => isPackOwned(p) && isPackEnabled(p.id)).length;

  if (loadingPacks || loadingUserPacks) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Location Packs
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {enabledCount} enabled
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enable location packs for your avatar's workout adventures
          </p>

          <div className="space-y-3">
            {packs.map((pack) => {
              const owned = isPackOwned(pack);
              const enabled = owned && isPackEnabled(pack.id);

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    owned
                      ? enabled
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border"
                      : "bg-muted/10 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50"
                  )}
                  onClick={() => !owned && handlePackClick(pack)}
                >
                  {/* Pack Image */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                    {pack.image_url ? (
                      <img
                        src={pack.image_url}
                        alt={pack.name}
                        className={cn("w-full h-full object-cover", !owned && "opacity-60")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {!owned && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Pack Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{pack.name}</p>
                      {!owned && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Coins className="h-3 w-3" />
                          {pack.price_coins}
                        </Badge>
                      )}
                    </div>
                    {pack.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {pack.description}
                      </p>
                    )}
                  </div>

                  {/* Toggle or Lock */}
                  {owned ? (
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ packId: pack.id, enabled: checked })
                      }
                      disabled={toggleMutation.isPending}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePackClick(pack);
                      }}
                    >
                      <Coins className="h-3 w-3" />
                      Unlock
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {packs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No location packs available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <AlertDialog open={!!purchasePack} onOpenChange={() => setPurchasePack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {purchasePack?.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{purchasePack?.description}</p>
                {purchasePack?.image_url && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={purchasePack.image_url}
                      alt={purchasePack.name}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 py-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="font-bold text-lg">{purchasePack?.price_coins} coins</span>
                </div>
                <p className="text-sm">
                  You have <span className="font-semibold">{coins}</span> coins
                  {coins < (purchasePack?.price_coins || 0) && (
                    <span className="text-destructive"> (not enough)</span>
                  )}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => purchasePack && purchaseMutation.mutate(purchasePack)}
              disabled={coins < (purchasePack?.price_coins || 0) || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Coins className="h-4 w-4 mr-2" />
              )}
              Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
