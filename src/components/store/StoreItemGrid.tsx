import { StoreItemCard } from "./StoreItemCard";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  pageCount?: number;
}

interface Purchase {
  id: string;
  store_item_id: string;
  coins_spent: number;
  purchased_at: string;
}

interface StoreItemGridProps {
  items: StoreItem[];
  onPurchase: (itemId: string, price: number) => Promise<boolean>;
  userCoins: number;
  loading: boolean;
  purchases: Purchase[];
  purchasedPackIds?: Set<string>;
}

export const StoreItemGrid = ({ items, onPurchase, userCoins, loading, purchases, purchasedPackIds }: StoreItemGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-[400px] bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No items available in the store</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
      {items.map((item) => {
        // Check both regular purchases and memory pack purchases
        const isPurchased = purchases.some(p => p.store_item_id === item.id) || 
                           (purchasedPackIds?.has(item.id) ?? false);
        return (
          <StoreItemCard
            key={item.id}
            id={item.id}
            name={item.name}
            description={item.description}
            price={item.price}
            category={item.category}
            imageUrl={item.image_url}
            onPurchase={onPurchase}
            userCoins={userCoins}
            isPurchased={isPurchased}
            pageCount={item.pageCount}
          />
        );
      })}
    </div>
  );
};
