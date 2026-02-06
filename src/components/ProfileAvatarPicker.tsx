import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronDown, ChevronRight, Sparkles, Lock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCoins } from "@/hooks/useCoins";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface ProfileAvatarPickerProps {
  /** Currently selected fitness avatar ID */
  selectedAvatarId: string | null;
  /** Called when user selects an avatar */
  onSelectAvatar: (avatarId: string) => void;
  /** If true, only show free avatars (for signup flows) */
  freeOnly?: boolean;
  /** Optional label override */
  label?: string;
  /** User ID — required when freeOnly is false to check ownership */
  userId?: string | null;
}

interface FitnessAvatar {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  is_free: boolean;
  price_coins: number;
  display_order: number;
  category: string | null;
}

const KNOWN_CATEGORY_META: Record<string, { label: string; emoji: string; sortOrder: number }> = {
  free: { label: "Free Tier", emoji: "🆓", sortOrder: 0 },
  icons: { label: "Iconic Characters", emoji: "⭐", sortOrder: 1 },
  animals: { label: "Animals", emoji: "🐾", sortOrder: 2 },
  superheroes: { label: "Superheroes", emoji: "🦸", sortOrder: 3 },
  monsters: { label: "Monsters", emoji: "👾", sortOrder: 4 },
  humans: { label: "Humans", emoji: "👤", sortOrder: 5 },
};

const getCategoryMeta = (value: string) => {
  const known = KNOWN_CATEGORY_META[value];
  if (known) return known;
  return {
    label: value.charAt(0).toUpperCase() + value.slice(1),
    emoji: "✨",
    sortOrder: 999,
  };
};

export const ProfileAvatarPicker = ({
  selectedAvatarId,
  onSelectAvatar,
  freeOnly = false,
  label = "Choose Your Avatar",
  userId,
}: ProfileAvatarPickerProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const didInitCategories = useRef(false);
  const [purchaseAvatar, setPurchaseAvatar] = useState<FitnessAvatar | null>(null);

  // Only load coins when not in freeOnly mode (logged-in user context)
  const { coins, deductCoins } = useCoins();

  const { data: avatars = [], isLoading } = useQuery({
    queryKey: ["profile-avatars", freeOnly],
    queryFn: async () => {
      let query = supabase
        .from("fitness_avatars")
        .select("id, name, description, preview_image_url, is_free, price_coins, display_order, category")
        .eq("is_active", true)
        .order("display_order");

      if (freeOnly) {
        query = query.eq("is_free", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FitnessAvatar[];
    },
  });

  // Fetch user's owned avatars (only when not freeOnly and userId is provided)
  const { data: ownedAvatarIds = [] } = useQuery({
    queryKey: ["user-fitness-avatars-owned", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_fitness_avatars")
        .select("avatar_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return data.map((r) => r.avatar_id);
    },
    enabled: !freeOnly && !!userId,
  });

  const isAvatarAvailable = (avatar: FitnessAvatar) => {
    if (freeOnly) return true; // signup flow, all shown are free
    if (avatar.is_free) return true;
    return ownedAvatarIds.includes(avatar.id);
  };

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (avatar: FitnessAvatar) => {
      if (!userId) throw new Error("Not authenticated");
      const success = await deductCoins(avatar.price_coins, `Purchased ${avatar.name} profile avatar`, avatar.id);
      if (!success) throw new Error("Not enough coins");

      const { error } = await supabase
        .from("user_fitness_avatars")
        .insert({ user_id: userId, avatar_id: avatar.id, is_selected: false });
      if (error) throw error;
      return avatar;
    },
    onSuccess: (avatar) => {
      queryClient.invalidateQueries({ queryKey: ["user-fitness-avatars-owned"] });
      queryClient.invalidateQueries({ queryKey: ["user-fitness-avatars"] });
      toast.success(`🎉 You unlocked ${avatar.name}!`);
      setPurchaseAvatar(null);
      // Auto-select the newly purchased avatar
      onSelectAvatar(avatar.id);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to purchase");
      setPurchaseAvatar(null);
    },
  });

  const handleAvatarClick = (avatar: FitnessAvatar) => {
    if (isAvatarAvailable(avatar)) {
      onSelectAvatar(avatar.id);
    } else {
      setPurchaseAvatar(avatar);
    }
  };

  // Auto-open categories on first load
  useEffect(() => {
    if (didInitCategories.current || !avatars.length) return;
    const cats = Array.from(new Set(avatars.map((a) => a.category ?? "free")));
    setOpenCategories(new Set(cats));
    didInitCategories.current = true;
  }, [avatars]);

  // Group by category
  const categoryValues = Array.from(new Set(avatars.map((a) => a.category ?? "free"))).sort(
    (a, b) => getCategoryMeta(a).sortOrder - getCategoryMeta(b).sortOrder
  );

  const groupedAvatars = categoryValues
    .map((value) => ({
      value,
      ...getCategoryMeta(value),
      avatars: avatars
        .filter((a) => (a.category ?? "free") === value)
        .sort((a, b) => a.display_order - b.display_order),
    }))
    .filter((g) => g.avatars.length > 0);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading avatars...
      </div>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-2">
              {selectedAvatar?.preview_image_url && (
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary bg-white flex-shrink-0">
                  <img
                    src={selectedAvatar.preview_image_url}
                    alt={selectedAvatar.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <Label className="cursor-pointer">
                {label} {selectedAvatar ? `(${selectedAvatar.name})` : "(Optional)"}
              </Label>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          {groupedAvatars.length === 1 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 border rounded-lg bg-muted/20">
              {groupedAvatars[0].avatars.map((avatar) => (
                <AvatarButton
                  key={avatar.id}
                  avatar={avatar}
                  isSelected={selectedAvatarId === avatar.id}
                  isAvailable={isAvatarAvailable(avatar)}
                  showOwnership={!freeOnly}
                  onSelect={() => handleAvatarClick(avatar)}
                />
              ))}
            </div>
          ) : (
            groupedAvatars.map((group) => (
              <Collapsible
                key={group.value}
                open={openCategories.has(group.value)}
                onOpenChange={() => toggleCategory(group.value)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-2 py-1 h-auto">
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
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 border rounded-lg bg-muted/20">
                    {group.avatars.map((avatar) => (
                      <AvatarButton
                        key={avatar.id}
                        avatar={avatar}
                        isSelected={selectedAvatarId === avatar.id}
                        isAvailable={isAvatarAvailable(avatar)}
                        showOwnership={!freeOnly}
                        onSelect={() => handleAvatarClick(avatar)}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Purchase Dialog */}
      <AlertDialog open={!!purchaseAvatar} onOpenChange={() => setPurchaseAvatar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Unlock {purchaseAvatar?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {purchaseAvatar?.preview_image_url && (
                  <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-white">
                      <img
                        src={purchaseAvatar.preview_image_url}
                        alt={purchaseAvatar.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {purchaseAvatar?.description && <p>{purchaseAvatar.description}</p>}
                <div className="flex items-center justify-center gap-2 py-1">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span className="font-bold text-lg">{purchaseAvatar?.price_coins} coins</span>
                </div>
                <p className="text-sm text-center">
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

function AvatarButton({
  avatar,
  isSelected,
  isAvailable,
  showOwnership,
  onSelect,
}: {
  avatar: FitnessAvatar;
  isSelected: boolean;
  isAvailable: boolean;
  showOwnership: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "relative aspect-square w-full rounded-lg transition-all border-2 overflow-hidden flex items-center justify-center",
          isSelected
            ? "border-primary scale-105 shadow-lg ring-2 ring-primary ring-offset-2"
            : isAvailable
            ? "border-border hover:scale-105 hover:border-primary/50"
            : "border-dashed border-muted-foreground/30 hover:border-primary/50 opacity-70",
          avatar.preview_image_url ? "bg-white" : "bg-muted"
        )}
        title={isAvailable ? avatar.name : `${avatar.name} — ${avatar.price_coins} coins`}
      >
        {avatar.preview_image_url ? (
          <img
            src={avatar.preview_image_url}
            alt={avatar.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        )}
        {isSelected && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg">
            ✓
          </div>
        )}
        {/* Lock overlay for unowned paid avatars */}
        {showOwnership && !isAvailable && (
          <div className="absolute inset-0 bg-background/30 flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>
      {/* Price badge outside the overflow-hidden button */}
      {showOwnership && !isAvailable && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] gap-0.5 z-10 shadow-sm">
          <Coins className="h-3 w-3 text-yellow-500" />
          {avatar.price_coins}
        </Badge>
      )}
    </div>
  );
}
