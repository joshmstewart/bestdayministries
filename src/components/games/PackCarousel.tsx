import { Package, Check, ShoppingCart, Sparkles } from "lucide-react";
import { PriceRibbon } from "@/components/ui/price-ribbon";
import { cn } from "@/lib/utils";

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
  className?: string;
}

export function PackCarousel({
  packs,
  selectedPackId,
  onSelectPack,
  canUsePack,
  onPurchasePack,
  className,
}: PackCarouselProps) {
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
          } else if (featuredPack.is_purchasable && onPurchasePack) {
            onPurchasePack(featuredPack);
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
                <span>🪙</span>
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
                  <div className="flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full">
                    <ShoppingCart className="w-3 h-3" />
                    <span className="text-[10px]">Buy</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {sortedPacks.map((pack) => {
          const canUse = canUsePack(pack);
          const isSelected = pack.is_default
            ? selectedPackId === null
            : selectedPackId === pack.id;
          const isFeatured = pack.id === featuredPack.id;
          const previewImage =
            pack.preview_image_url || pack.images[0]?.image_url;

          return (
            <button
              key={pack.id}
              onClick={() => {
                if (canUse) {
                  onSelectPack(pack.is_default ? null : pack.id);
                } else if (pack.is_purchasable && onPurchasePack) {
                  onPurchasePack(pack);
                }
              }}
              className={cn(
                "relative flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all duration-200",
                "w-16 h-16 sm:w-20 sm:h-20",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isFeatured
                  ? "border-primary ring-2 ring-primary/50 scale-105"
                  : canUse
                  ? "border-border hover:border-primary/50"
                  : "border-border/50 opacity-70 hover:opacity-90"
              )}
            >
              {/* Thumbnail Image */}
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

              {/* Selected Indicator */}
              {isFeatured && (
                <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 shadow">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}

              {/* Lock indicator for unpurchased packs */}
              {!canUse && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-sm">🔒</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
