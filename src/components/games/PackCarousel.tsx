import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Package, Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Sort packs: usable first, then purchasable
  const sortedPacks = [...packs].sort((a, b) => {
    const aCanUse = canUsePack(a);
    const bCanUse = canUsePack(b);
    if (aCanUse && !bCanUse) return -1;
    if (!aCanUse && bCanUse) return 1;
    return 0;
  });

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
    }
    return () => {
      container?.removeEventListener("scroll", checkScrollButtons);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [packs]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = container.clientWidth * 0.7;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (packs.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Choose Your Pack
        </h3>
        <span className="text-xs text-muted-foreground">
          {packs.length} pack{packs.length !== 1 ? "s" : ""} available
        </span>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        {/* Gradient Edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-[5]" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-[5]" />
        )}

        {/* Scrollable Pack Strip */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {sortedPacks.map((pack) => {
            const canUse = canUsePack(pack);
            const isSelected = pack.is_default
              ? selectedPackId === null
              : selectedPackId === pack.id;
            const previewImage =
              pack.preview_image_url || pack.images[0]?.image_url;

            return (
              <div
                key={pack.id}
                onClick={() => {
                  if (canUse) {
                    onSelectPack(pack.is_default ? null : pack.id);
                  } else if (pack.is_purchasable && onPurchasePack) {
                    onPurchasePack(pack);
                  }
                }}
                className={cn(
                  "relative flex-shrink-0 cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-200 snap-center",
                  "w-28 sm:w-32 md:w-36",
                  isSelected
                    ? "border-primary ring-2 ring-primary/50 scale-105 shadow-lg"
                    : canUse
                    ? "border-border hover:border-primary/50 hover:scale-[1.02] hover:shadow-md"
                    : "border-border/50 hover:border-yellow-500/50"
                )}
              >
                {/* Price Ribbon for purchasable packs */}
                {!canUse && pack.is_purchasable && (
                  <PriceRibbon price={pack.price_coins} position="top-right" size="sm" />
                )}

                {/* Preview Image */}
                <div className="aspect-square bg-muted">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={pack.name}
                      className={cn(
                        "w-full h-full object-cover transition-all",
                        !canUse && "grayscale-[30%] opacity-80"
                      )}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Pack Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-white truncate">
                      {pack.name}
                    </span>
                    {!canUse && <span className="text-xs flex-shrink-0">🔒</span>}
                  </div>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1 shadow-lg z-20">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}

                {/* Purchase overlay for locked packs */}
                {!canUse && pack.is_purchasable && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                    <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      Buy
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Pack Info */}
      {sortedPacks.length > 0 && (
        <div className="mt-3 text-center">
          <p className="text-sm text-muted-foreground">
            Selected:{" "}
            <span className="font-medium text-foreground">
              {selectedPackId
                ? sortedPacks.find((p) => p.id === selectedPackId)?.name
                : sortedPacks.find((p) => p.is_default)?.name || "Default Pack"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
