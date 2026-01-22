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

      {/* Featured Pack Display */}
      <div
        className={cn(
          "relative rounded-2xl border-2 overflow-hidden transition-all duration-300",
          canUseFeatured
            ? "border-primary ring-2 ring-primary/30 shadow-lg"
            : "border-border"
        )}
        onClick={() => {
          if (canUseFeatured) {
            onSelectPack(featuredPack.is_default ? null : featuredPack.id);
          } else if (featuredPack.is_purchasable && onPurchasePack) {
            onPurchasePack(featuredPack);
          }
        }}
      >
        {/* Price Ribbon for purchasable packs */}
        {!canUseFeatured && featuredPack.is_purchasable && (
          <PriceRibbon
            price={featuredPack.price_coins}
            position="top-right"
            size="md"
          />
        )}

        {/* Featured Image */}
        <div className="aspect-[16/9] bg-muted">
          {featuredPreviewImage ? (
            <img
              src={featuredPreviewImage}
              alt={featuredPack.name}
              className={cn(
                "w-full h-full object-cover transition-all",
                !canUseFeatured && "grayscale-[30%] opacity-80"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Featured Pack Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <h4 className="font-semibold text-white truncate">
                  {featuredPack.name}
                </h4>
              </div>
              {featuredPack.description && (
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {featuredPack.description}
                </p>
              )}
            </div>
            {!canUseFeatured && (
              <div className="flex items-center gap-1 bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                <ShoppingCart className="w-3.5 h-3.5" />
                Buy
              </div>
            )}
            {canUseFeatured && (
              <div className="bg-primary rounded-full p-1.5 shadow-lg">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
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
