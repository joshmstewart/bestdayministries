import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useState } from "react";
import { PurchaseDialog } from "./PurchaseDialog";
import { CoinIcon } from "@/components/CoinIcon";

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
        <CardHeader>
          {imageUrl && (
            <div className="mb-4 rounded-lg overflow-hidden bg-muted">
              <OptimizedImage
                src={imageUrl}
                alt={name}
                className="w-full h-48 object-cover"
              />
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
        <CardContent className="flex-1">
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
