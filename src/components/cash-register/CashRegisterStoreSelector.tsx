import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronDown, Lock, Check } from "lucide-react";
import { CoinIcon } from "@/components/CoinIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStorePurchases } from "@/hooks/useStorePurchases";
import { useCoins } from "@/hooks/useCoins";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Json } from "@/integrations/supabase/types";

interface StoreType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_default: boolean;
  is_free: boolean;
  is_pack_only: boolean;
  price_coins: number;
  menu_items: Json | null;
  receipt_address: string | null;
  receipt_tagline: string | null;
}

interface CashRegisterStoreSelectorProps {
  stores: StoreType[];
  selectedStore: StoreType | null;
  unlockedStoreIds: Set<string>;
  onSelectStore: (store: StoreType) => void;
  onStorePurchased: () => void;
}

export const CashRegisterStoreSelector = ({
  stores,
  selectedStore,
  unlockedStoreIds,
  onSelectStore,
  onStorePurchased,
}: CashRegisterStoreSelectorProps) => {
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [storeToPurchase, setStoreToPurchase] = useState<StoreType | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  
  const { purchaseItem } = useStorePurchases();
  const { coins } = useCoins();

  const isStoreUnlocked = (store: StoreType) => {
    return store.is_free || 
           (!store.is_pack_only && (store.price_coins || 0) === 0) || 
           unlockedStoreIds.has(store.id);
  };

  const handleStoreClick = (store: StoreType) => {
    if (isStoreUnlocked(store)) {
      onSelectStore(store);
    } else {
      setStoreToPurchase(store);
      setPurchaseDialogOpen(true);
    }
  };

  const handlePurchase = async () => {
    if (!storeToPurchase) return;
    
    setPurchasing(true);
    const success = await purchaseItem(
      `cash_register_store_${storeToPurchase.id}`,
      storeToPurchase.price_coins
    );
    setPurchasing(false);
    
    if (success) {
      setPurchaseDialogOpen(false);
      onStorePurchased();
      // Auto-select the newly purchased store
      onSelectStore(storeToPurchase);
    }
  };

  const canAfford = storeToPurchase ? coins >= storeToPurchase.price_coins : false;

  // Separate unlocked and locked stores
  const unlockedStores = stores.filter(isStoreUnlocked);
  const lockedStores = stores.filter(s => !isStoreUnlocked(s));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Store className="h-4 w-4 mr-2" />
            {selectedStore?.name || "Select Store"}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
          {/* Unlocked stores */}
          {unlockedStores.map((store) => (
            <DropdownMenuItem
              key={store.id}
              onClick={() => handleStoreClick(store)}
              className={`flex items-center justify-between ${selectedStore?.id === store.id ? "bg-accent" : ""}`}
            >
              <span className="truncate">{store.name}</span>
              {selectedStore?.id === store.id && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
          
          {/* Separator and locked stores section */}
          {lockedStores.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                🔓 Available for Purchase
              </div>
              {lockedStores.map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{store.name}</span>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <CoinIcon size={12} />
                    {store.price_coins}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Unlock Store
            </DialogTitle>
            <DialogDescription>
              Purchase this store to play with it in Cash Register!
            </DialogDescription>
          </DialogHeader>

          {storeToPurchase && (
            <div className="space-y-4">
              {/* Store preview */}
              {storeToPurchase.image_url && (
                <div className="rounded-lg overflow-hidden aspect-video bg-muted">
                  <OptimizedImage
                    src={storeToPurchase.image_url}
                    alt={storeToPurchase.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-lg">{storeToPurchase.name}</h3>
                {storeToPurchase.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {storeToPurchase.description}
                  </p>
                )}
              </div>

              {/* Price and balance */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="text-muted-foreground">Price</div>
                  <div className="flex items-center gap-1 font-bold text-lg">
                    <CoinIcon size={18} />
                    {storeToPurchase.price_coins.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div className="text-muted-foreground">Your Balance</div>
                  <div className={`flex items-center gap-1 font-bold text-lg ${canAfford ? "text-primary" : "text-destructive"}`}>
                    <CoinIcon size={18} />
                    {coins.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchase} 
              disabled={!canAfford || purchasing}
            >
              {purchasing ? (
                "Purchasing..."
              ) : canAfford ? (
                <>
                  <CoinIcon size={16} className="mr-2" />
                  Purchase
                </>
              ) : (
                "Insufficient Coins"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
