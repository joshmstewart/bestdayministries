import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check, Eye } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useState, useEffect } from "react";
import { PurchaseDialog } from "./PurchaseDialog";
import { CoinIcon } from "@/components/CoinIcon";
import { supabase } from "@/integrations/supabase/client";
import { MemoryMatchGridPreview } from "./MemoryMatchGridPreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StoreItemCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  onPurchase: (itemId: string, price: number) => Promise<boolean>;
  userCoins: number;
  isPurchased: boolean;
  pageCount?: number;
}

interface ColoringPage {
  id: string;
  title: string;
  image_url: string;
}

export const StoreItemCard = ({
  id,
  name,
  description,
  price,
  category,
  imageUrl,
  onPurchase,
  userCoins,
  isPurchased,
  pageCount,
}: StoreItemCardProps) => {
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const canAfford = userCoins >= price;
  const isColoringBook = id.startsWith("coloring_book_");
  // Check by name since IDs are UUIDs
  const isMemoryMatchHard = name === "Memory Match - Hard Mode";
  const isMemoryMatchExtreme = name === "Memory Match - Extreme Mode";
  const bookId = isColoringBook ? id.replace("coloring_book_", "") : null;

  // Fetch coloring book pages when preview opens
  useEffect(() => {
    if (showPreviewDialog && isColoringBook && bookId) {
      setLoadingPages(true);
      supabase
        .from("coloring_pages")
        .select("id, title, image_url")
        .eq("book_id", bookId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setColoringPages(data);
          }
          setLoadingPages(false);
        });
    }
  }, [showPreviewDialog, isColoringBook, bookId]);

  const handlePurchase = async () => {
    setPurchasing(true);
    const success = await onPurchase(id, price);
    setPurchasing(false);
    if (success) {
      setShowPurchaseDialog(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "badge":
        return "bg-primary/10 text-primary";
      case "avatar":
        return "bg-secondary/10 text-secondary";
      case "content":
        return "bg-accent/10 text-accent";
      case "power-up":
        return "bg-gradient-warm text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          {(isMemoryMatchHard || isMemoryMatchExtreme) ? (
            <div className="relative mb-4 rounded-lg overflow-hidden group">
              <MemoryMatchGridPreview 
                difficulty={isMemoryMatchHard ? 'hard' : 'extreme'} 
                cardBackUrl={imageUrl || undefined}
              />
              {/* Preview overlay button */}
              <button
                onClick={() => setShowPreviewDialog(true)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <div className="bg-white/90 rounded-full p-3 shadow-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-foreground" />
                </div>
              </button>
            </div>
          ) : imageUrl && (
            <div className="relative mb-4 rounded-lg overflow-hidden bg-muted group">
              <OptimizedImage
                src={imageUrl}
                alt={name}
                className="w-full object-contain"
              />
              {/* Preview overlay button */}
              <button
                onClick={() => setShowPreviewDialog(true)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <div className="bg-white/90 rounded-full p-3 shadow-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-foreground" />
                  {isColoringBook && (
                    <span className="text-sm font-medium text-foreground">Preview Pages</span>
                  )}
                </div>
              </button>
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{name}</CardTitle>
            <Badge variant="outline" className={getCategoryColor(category)}>
              {category}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {description}
          </CardDescription>
          {isColoringBook && pageCount !== undefined && pageCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="flex items-center gap-2 text-2xl font-bold text-primary">
            <CoinIcon size={24} />
            <span>{price.toLocaleString()}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => setShowPurchaseDialog(true)}
            disabled={!canAfford || isPurchased}
            className="w-full"
            variant={isPurchased ? "secondary" : "default"}
          >
            {isPurchased ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Purchased
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {canAfford ? "Purchase" : "Insufficient Coins"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview: {name}
            </DialogTitle>
            <DialogDescription>
              {isColoringBook
                ? "See what's inside this coloring book before you buy!"
                : description}
            </DialogDescription>
          </DialogHeader>

          {isColoringBook ? (
            <ScrollArea className="max-h-[50vh]">
              {loadingPages ? (
                <div className="text-center py-8 text-muted-foreground">Loading preview...</div>
              ) : coloringPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pages to preview yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-1">
                  {coloringPages.map((page) => (
                    <div key={page.id} className="space-y-1">
                      <div className="rounded-lg overflow-hidden border bg-white p-1">
                        <img
                          src={page.image_url}
                          alt={page.title}
                          className="w-full h-auto object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center truncate">{page.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          ) : (
            imageUrl && (
              <div className="rounded-lg overflow-hidden bg-muted">
                <OptimizedImage
                  src={imageUrl}
                  alt={name}
                  className="w-full object-contain"
                />
              </div>
            )
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <span>Price:</span>
              <span className="flex items-center gap-1 font-bold text-primary">
                <CoinIcon size={14} />
                {price.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowPreviewDialog(false);
                  setShowPurchaseDialog(true);
                }}
                disabled={!canAfford || isPurchased}
                variant={isPurchased ? "secondary" : "default"}
              >
                {isPurchased ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Purchased
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {canAfford ? "Purchase" : "Insufficient Coins"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        itemName={name}
        itemPrice={price}
        userCoins={userCoins}
        onConfirm={handlePurchase}
        purchasing={purchasing}
      />
    </>
  );
};
