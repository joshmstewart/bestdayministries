import { useState } from "react";
import { Package, Check, ShoppingCart, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoins } from "@/hooks/useCoins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
import { CoinIcon } from "@/components/CoinIcon";

interface Pack {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  is_default: boolean;
  is_purchasable: boolean;
  price_coins: number;
  images: { name: string; image_url: string }[];
  background_color: string | null;
  module_color: string | null;
  card_back_url: string | null;
}

interface PackCarouselProps {
  packs: Pack[];
  selectedPackId: string | null;
  onSelectPack: (packId: string | null) => void;
  canUsePack: (pack: Pack) => boolean;
  onPurchasePack?: (pack: Pack) => void;
  onPackPurchased?: () => void;
  className?: string;
}

export function PackCarousel({
  packs,
  selectedPackId,
  onSelectPack,
  canUsePack,
  onPurchasePack,
  onPackPurchased,
  className,
}: PackCarouselProps) {
  const { user } = useAuth();
  const { coins, deductCoins, refetch: refetchCoins } = useCoins();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [packToPurchase, setPackToPurchase] = useState<Pack | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Sort packs: usable first, then purchasable
  const sortedPacks = [...packs].sort((a, b) => {
    const aCanUse = canUsePack(a);
    const bCanUse = canUsePack(b);
    if (aCanUse && !bCanUse) return -1;
    if (!aCanUse && bCanUse) return 1;
    return 0;
  });

  // Find currently selected pack
  const selectedPack = selectedPackId
    ? sortedPacks.find((p) => p.id === selectedPackId)
    : sortedPacks.find((p) => p.is_default);

  const featuredPack = selectedPack || sortedPacks[0];

  const handlePurchaseClick = (pack: Pack) => {
    if (!user) {
      toast.error("Please sign in to purchase packs");
      return;
    }
    setPackToPurchase(pack);
    setPurchaseDialogOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!packToPurchase || !user) return;

    if (coins < packToPurchase.price_coins) {
      toast.error("Not enough coins!");
      return;
    }

    setIsPurchasing(true);
    try {
      // Deduct coins
      const success = await deductCoins(
        packToPurchase.price_coins,
        `Purchased Memory Match pack: ${packToPurchase.name}`,
        packToPurchase.id
      );
      if (!success) {
        throw new Error("Failed to deduct coins");
      }

      // Record purchase (no need to manually insert coin_transaction - deductCoins already does it)
      const { error: purchaseError } = await supabase
        .from("user_memory_match_packs")
        .insert({
          user_id: user.id,
          pack_id: packToPurchase.id,
        });

      if (purchaseError) throw purchaseError;

      await refetchCoins();
      onPackPurchased?.();
      
      // Auto-select the newly purchased pack
      onSelectPack(packToPurchase.id);

      toast.success(`Unlocked ${packToPurchase.name}! 🎉`);
      setPurchaseDialogOpen(false);
      setPackToPurchase(null);
    } catch (error) {
      console.error("Error purchasing pack:", error);
      toast.error("Failed to purchase pack");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (packs.length === 0 || !featuredPack) return null;

  const canUseFeatured = canUsePack(featuredPack);
  const featuredPreviewImage =
    featuredPack.preview_image_url || featuredPack.images[0]?.image_url;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Choose Your Pack
        </h3>
        <span className="text-xs text-muted-foreground">
          {packs.length} pack{packs.length !== 1 ? "s" : ""} available
        </span>
      </div>

      {/* Featured Pack Display - Compact Side-by-Side */}
      <div
        className={cn(
          "relative rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer",
          canUseFeatured
            ? "border-primary ring-2 ring-primary/30 shadow-md"
            : "border-border hover:border-primary/30"
        )}
        onClick={() => {
          if (canUseFeatured) {
            onSelectPack(featuredPack.is_default ? null : featuredPack.id);
          } else if (featuredPack.is_purchasable) {
            handlePurchaseClick(featuredPack);
          }
        }}
      >
        <div className="flex">
          {/* Featured Image - Left Side */}
          <div className="relative w-28 h-24 sm:w-36 sm:h-28 flex-shrink-0 bg-muted">
            {featuredPreviewImage ? (
              <img
                src={featuredPreviewImage}
                alt={featuredPack.name}
                className={cn(
                  "w-full h-full object-cover",
                  !canUseFeatured && "grayscale-[30%] opacity-80"
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            {/* Price badge for purchasable */}
            {!canUseFeatured && featuredPack.is_purchasable && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <CoinIcon size={10} />
                <span>{featuredPack.price_coins}</span>
              </div>
            )}
          </div>

          {/* Pack Info - Right Side */}
          <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <h4 className="font-semibold text-sm truncate">
                    {featuredPack.name}
                  </h4>
                </div>
                {featuredPack.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {featuredPack.description}
                  </p>
                )}
              </div>
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {canUseFeatured ? (
                  <div className="bg-primary rounded-full p-1">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                    <ShoppingCart className="w-3 h-3" />
                    <span className="text-[10px]">Buy</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Grid with Names */}
      <div className="flex flex-wrap gap-3 pb-2">
        {sortedPacks.map((pack) => {
          const canUse = canUsePack(pack);
          const isFeatured = pack.id === featuredPack.id;
          const previewImage =
            pack.preview_image_url || pack.images[0]?.image_url;

          return (
            <div key={pack.id} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => {
                  if (canUse) {
                    onSelectPack(pack.is_default ? null : pack.id);
                  } else if (pack.is_purchasable) {
                    handlePurchaseClick(pack);
                  }
                }}
                className={cn(
                  "relative rounded-lg border-2 transition-all duration-200",
                  "w-16 h-16 sm:w-20 sm:h-20",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  isFeatured
                    ? "border-primary ring-2 ring-primary/30"
                    : canUse
                    ? "border-border hover:border-primary/50"
                    : "border-border/50 opacity-70 hover:opacity-90"
                )}
              >
                {/* Thumbnail Image */}
                <div className="w-full h-full rounded-md overflow-hidden">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={pack.name}
                      className={cn(
                        "w-full h-full object-cover",
                        !canUse && "grayscale-[40%]"
                      )}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Selected Indicator */}
                {isFeatured && (
                  <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5 shadow border-2 border-background">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}

                {/* Lock indicator for unpurchased packs */}
                {!canUse && (
                  <div className="absolute inset-0 rounded-md bg-black/30 flex items-center justify-center">
                    <span className="text-sm">🔒</span>
                  </div>
                )}
              </button>
              
              {/* Pack Name */}
              <span className={cn(
                "text-[10px] text-center max-w-16 sm:max-w-20 truncate",
                isFeatured ? "font-semibold text-primary" : "text-muted-foreground"
              )}>
                {pack.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Unlock {packToPurchase?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This pack contains unique memory cards for you to enjoy!
                </p>
                <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price:</span>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CoinIcon size={16} />
                      <span>{packToPurchase?.price_coins}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Your Balance:</span>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CoinIcon size={16} />
                      <span>{coins}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-muted-foreground">After Purchase:</span>
                    <div className={cn(
                      "flex items-center gap-1.5 font-semibold",
                      coins < (packToPurchase?.price_coins || 0) && "text-destructive"
                    )}>
                      <CoinIcon size={16} />
                      <span>{coins - (packToPurchase?.price_coins || 0)}</span>
                    </div>
                  </div>
                </div>
                {coins < (packToPurchase?.price_coins || 0) && (
                  <p className="text-destructive text-sm">
                    You don't have enough coins. Earn more by completing activities!
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurchasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPurchase}
              disabled={coins < (packToPurchase?.price_coins || 0) || isPurchasing}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                "Purchase"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
