import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { StorePurchase } from "@/hooks/useStorePurchases";
import { format } from "date-fns";
import { CoinIcon } from "@/components/CoinIcon";

interface UserInventoryProps {
  purchases: StorePurchase[];
  loading: boolean;
}

export const UserInventory = ({ purchases, loading }: UserInventoryProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            You haven't purchased anything yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {purchases.map((purchase) => (
        <Card key={purchase.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">
                  {purchase.store_items.name}
                </CardTitle>
                <CardDescription>
                  {purchase.store_items.description}
                </CardDescription>
              </div>
              {purchase.store_items.image_url && (
                <OptimizedImage
                  src={purchase.store_items.image_url}
                  alt={purchase.store_items.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CoinIcon size={16} />
                  <span className="font-semibold">{purchase.coins_spent}</span>
                </div>
                <Badge variant="outline">
                  {purchase.store_items.category}
                </Badge>
              </div>
              <span className="text-muted-foreground">
                {format(new Date(purchase.purchased_at), "MMM d, yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
