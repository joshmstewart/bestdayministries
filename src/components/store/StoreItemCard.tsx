import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check, Eye } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useState } from "react";
import { PurchaseDialog } from "./PurchaseDialog";
import { CoinIcon } from "@/components/CoinIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}: StoreItemCardProps) => {
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const canAfford = userCoins >= price;

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
          {imageUrl && (
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
                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                  <Eye className="h-5 w-5 text-foreground" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          {imageUrl && (
            <div className="rounded-lg overflow-hidden bg-muted">
              <OptimizedImage
                src={imageUrl}
                alt={name}
                className="w-full object-contain"
              />
            </div>
          )}
          <p className="text-muted-foreground">{description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold text-primary">
              <CoinIcon size={20} />
              <span>{price.toLocaleString()} coins</span>
            </div>
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
