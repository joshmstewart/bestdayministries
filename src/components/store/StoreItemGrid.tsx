import { StoreItemCard } from "./StoreItemCard";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
}

interface StoreItemGridProps {
  items: StoreItem[];
  onPurchase: (itemId: string, price: number) => Promise<boolean>;
  userCoins: number;
  loading: boolean;
}

export const StoreItemGrid = ({ items, onPurchase, userCoins, loading }: StoreItemGridProps) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
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
        />
      ))}
    </div>
  );
};
