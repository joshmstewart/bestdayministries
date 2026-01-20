import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Lock, Coins, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCoins } from "@/hooks/useCoins";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FitnessAvatarPickerProps {
  userId: string;
  onAvatarSelected?: (avatarId: string) => void;
}

interface FitnessAvatar {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  character_prompt: string;
  is_free: boolean;
  price_coins: number;
  display_order: number;
  category: string | null;
}

const AVATAR_CATEGORIES = [
  { value: "free", label: "Free Tier", emoji: "🆓", defaultOpen: true },
  { value: "animals", label: "Animals", emoji: "🐾", defaultOpen: true },
  { value: "superheroes", label: "Superheroes", emoji: "🦸", defaultOpen: true },
  { value: "humans", label: "Humans", emoji: "👤", defaultOpen: false },
];

export const FitnessAvatarPicker = ({ userId, onAvatarSelected }: FitnessAvatarPickerProps) => {
  const queryClient = useQueryClient();
  const { coins, deductCoins } = useCoins();
  const [purchaseAvatar, setPurchaseAvatar] = useState<FitnessAvatar | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(AVATAR_CATEGORIES.filter(c => c.defaultOpen).map(c => c.value))
  );

  // Fetch all available avatars
  const { data: avatars = [], isLoading: loadingAvatars } = useQuery({
    queryKey: ["fitness-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fitness_avatars")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as FitnessAvatar[];
    },
  });

  // Fetch user's owned avatars
  const { data: ownedAvatars = [], isLoading: loadingOwned } = useQuery({
    queryKey: ["user-fitness-avatars", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id, is_selected")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const ownedAvatarIds = ownedAvatars.map((a) => a.avatar_id);
  const selectedAvatarId = ownedAvatars.find((a) => a.is_selected)?.avatar_id;

  // Group avatars by category
  const groupedAvatars = AVATAR_CATEGORIES.map(category => {
    const categoryAvatars = avatars.filter(a => (a.category || 'free') === category.value);
    return {
      ...category,
      avatars: categoryAvatars.sort((a, b) => {
        const aOwned = ownedAvatarIds.includes(a.id);
        const bOwned = ownedAvatarIds.includes(b.id);
        
        // Owned avatars first within category
        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;
        
        // Then by price
        if (!aOwned && !bOwned) {
          return a.price_coins - b.price_coins;
        }
        
        return a.display_order - b.display_order;
      }),
    };
  }).filter(group => group.avatars.length > 0);

  const toggleCategory = (categoryValue: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryValue)) {
        newSet.delete(categoryValue);
      } else {
        newSet.add(categoryValue);
      }
      return newSet;
    });
  };

  // Select an avatar
  const selectMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      // First, deselect all
      await supabase
        .from("user_fitness_avatars")
        .update({ is_selected: false })
        .eq("user_id", userId);

      // Check if user already owns this avatar
      const owned = ownedAvatarIds.includes(avatarId);
      const avatar = avatars.find((a) => a.id === avatarId);
      
      if (!owned && !avatar?.is_free) {
        throw new Error("You don't own this avatar");
      }

      if (owned) {
        // Update existing record
        const { error } = await supabase
          .from("user_fitness_avatars")
          .update({ is_selected: true })
          .eq("user_id", userId)
          .eq("avatar_id", avatarId);
        if (error) throw error;
      } else {
        // Insert new record for free avatar
        const { error } = await supabase
          .from("user_fitness_avatars")
          .insert({
            user_id: userId,
            avatar_id: avatarId,
            is_selected: true,
          });
        if (error) throw error;
      }

      return avatarId;
    },
    onSuccess: (avatarId) => {
      queryClient.invalidateQueries({ queryKey: ["user-fitness-avatars"] });
      const avatar = avatars.find((a) => a.id === avatarId);
      toast.success(`${avatar?.name} is now your fitness buddy!`);
      onAvatarSelected?.(avatarId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to select avatar");
    },
  });

  // Purchase an avatar
  const purchaseMutation = useMutation({
    mutationFn: async (avatar: FitnessAvatar) => {
      const success = await deductCoins(avatar.price_coins, `Purchased ${avatar.name} fitness avatar`, avatar.id);
      if (!success) {
        throw new Error("Not enough coins");
      }

      // Add to user's avatars
      const { error } = await supabase
        .from("user_fitness_avatars")
        .insert({
          user_id: userId,
          avatar_id: avatar.id,
          is_selected: false,
        });

      if (error) throw error;
      return avatar;
    },
    onSuccess: (avatar) => {
      queryClient.invalidateQueries({ queryKey: ["user-fitness-avatars"] });
      toast.success(`🎉 You unlocked ${avatar.name}!`);
      setPurchaseAvatar(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to purchase");
      setPurchaseAvatar(null);
    },
  });

  const handleAvatarClick = (avatar: FitnessAvatar) => {
    const isOwned = ownedAvatarIds.includes(avatar.id) || avatar.is_free;
    
    if (isOwned) {
      selectMutation.mutate(avatar.id);
    } else {
      setPurchaseAvatar(avatar);
    }
  };

  if (loadingAvatars || loadingOwned) {
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
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose Your Fitness Buddy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedAvatars.map((group) => (
            <Collapsible
              key={group.value}
              open={openCategories.has(group.value)}
              onOpenChange={() => toggleCategory(group.value)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-2 py-1 h-auto"
                >
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    {group.emoji} {group.label}
                    <Badge variant="secondary" className="text-xs">
                      {group.avatars.length}
                    </Badge>
                  </span>
                  {openCategories.has(group.value) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 gap-3">
                  {group.avatars.map((avatar) => {
                    const isOwned = ownedAvatarIds.includes(avatar.id) || avatar.is_free;
                    const isSelected = selectedAvatarId === avatar.id;
                    
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarClick(avatar)}
                        disabled={selectMutation.isPending || purchaseMutation.isPending}
                        className={cn(
                          "relative flex flex-col items-center p-3 rounded-xl transition-all border-2",
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2"
                            : isOwned
                            ? "border-border hover:border-primary/50 hover:bg-accent"
                            : "border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30"
                        )}
                      >
                        {/* Avatar Preview */}
                        <div className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center text-2xl mb-2 overflow-hidden",
                          avatar.preview_image_url 
                            ? "bg-white" 
                            : isOwned 
                              ? "bg-gradient-to-br from-primary/20 to-accent" 
                              : "bg-muted"
                        )}>
                          {avatar.preview_image_url ? (
                            <img 
                              src={avatar.preview_image_url} 
                              alt={avatar.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span>
                              {avatar.name.includes("Runner") ? "🏃" :
                               avatar.name.includes("Lifter") ? "💪" :
                               avatar.name.includes("Yogi") ? "🧘" :
                               avatar.name.includes("Swimmer") ? "🏊" :
                               avatar.name.includes("Dancer") ? "💃" :
                               avatar.name.includes("Climber") ? "🧗" :
                               avatar.name.includes("Cyclist") ? "🚴" :
                               avatar.name.includes("Boxer") ? "🥊" :
                               avatar.name.includes("Athlete") ? "🏆" : "⭐"}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-medium text-center leading-tight line-clamp-2">
                          {avatar.name}
                        </span>

                        {/* Status indicators */}
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}

                        {!isOwned && (
                          <Badge variant="secondary" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] gap-0.5">
                            <Coins className="h-3 w-3" />
                            {avatar.price_coins}
                          </Badge>
                        )}

                        {!isOwned && (
                          <Lock className="absolute bottom-1 right-1 h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {!selectedAvatarId && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Tap an avatar to select it as your workout buddy!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <AlertDialog open={!!purchaseAvatar} onOpenChange={() => setPurchaseAvatar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock {purchaseAvatar?.name}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{purchaseAvatar?.description}</p>
                <div className="flex items-center justify-center gap-2 py-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="font-bold text-lg">{purchaseAvatar?.price_coins} coins</span>
                </div>
                <p className="text-sm">
                  You have <span className="font-semibold">{coins}</span> coins
                  {coins < (purchaseAvatar?.price_coins || 0) && (
                    <span className="text-destructive"> (not enough)</span>
                  )}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => purchaseAvatar && purchaseMutation.mutate(purchaseAvatar)}
              disabled={coins < (purchaseAvatar?.price_coins || 0) || purchaseMutation.isPending}
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