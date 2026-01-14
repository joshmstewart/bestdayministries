import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Loader2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CoinIcon } from '@/components/CoinIcon';
import { useCoins } from '@/hooks/useCoins';
import { toast } from 'sonner';

interface JokeCategory {
  id: string;
  name: string;
  emoji: string;
  is_free: boolean;
  coin_price: number;
}

interface JokeCategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

export const JokeCategorySelector: React.FC<JokeCategorySelectorProps> = ({
  selectedCategories,
  onCategoriesChange,
}) => {
  const { user } = useAuth();
  const { coins, deductCoins, refetch: refetchCoins } = useCoins();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<JokeCategory[]>([]);
  const [purchasedCategories, setPurchasedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch all active categories that should appear in selector
    const { data: categoryData, error: categoryError } = await supabase
      .from('joke_categories')
      .select('id, name, emoji, is_free, coin_price, show_in_selector')
      .eq('is_active', true)
      .eq('show_in_selector', true)
      .neq('name', 'random')
      .order('display_order');
    
    if (!categoryError && categoryData) {
      setCategories(categoryData);
    }

    // Fetch purchased categories if user is logged in
    if (user) {
      const { data: purchaseData } = await supabase
        .from('user_store_purchases')
        .select('store_item_id')
        .eq('user_id', user.id);
      
      if (purchaseData) {
        setPurchasedCategories(purchaseData.map(p => p.store_item_id).filter(Boolean) as string[]);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const hasAccess = (category: JokeCategory) => {
    return category.is_free || purchasedCategories.includes(category.id);
  };

  const handleCategoryToggle = (categoryId: string, category: JokeCategory) => {
    if (!hasAccess(category)) return; // Can't toggle locked categories
    
    if (selectedCategories.includes(categoryId)) {
      // Don't allow deselecting if it's the last one
      if (selectedCategories.length > 1) {
        onCategoriesChange(selectedCategories.filter(c => c !== categoryId));
      }
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const handlePurchase = async (category: JokeCategory) => {
    if (!user) {
      toast.error('Please log in to purchase categories');
      return;
    }

    if (coins < category.coin_price) {
      toast.error(`Not enough coins! You need ${category.coin_price} coins.`);
      return;
    }

    setPurchasingId(category.id);

    try {
      // Deduct coins
      const deducted = await deductCoins(category.coin_price, `Purchased joke category: ${category.name}`);
      if (!deducted) {
        throw new Error('Failed to deduct coins');
      }

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('user_store_purchases')
        .insert({
          user_id: user.id,
          store_item_id: category.id,
          item_type: 'joke_category',
          item_name: `Joke Category: ${category.name}`,
          coins_spent: category.coin_price,
        });

      if (purchaseError) throw purchaseError;

      // Record transaction
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        amount: -category.coin_price,
        transaction_type: 'purchase',
        description: `Purchased joke category: ${category.name}`,
        related_item_id: category.id,
      });

      // Refresh data
      await fetchData();
      await refetchCoins();
      
      // Auto-select the newly purchased category
      onCategoriesChange([...selectedCategories, category.id]);

      toast.success(`Unlocked ${category.name} jokes! 🎉`);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase category');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleSelectAll = () => {
    const accessibleCategories = categories.filter(hasAccess).map(c => c.id);
    onCategoriesChange(accessibleCategories);
  };

  // Separate accessible and locked categories
  const accessibleCategories = categories.filter(hasAccess);
  const lockedCategories = categories.filter(c => !hasAccess(c));

  const selectedCount = selectedCategories.length;
  const totalAccessible = accessibleCategories.length;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="bg-background/80 backdrop-blur-sm gap-2"
      >
        <span>Categories</span>
        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
          {selectedCount}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Joke Categories</DialogTitle>
            <DialogDescription>
              Choose which types of jokes you want to see
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {/* Select All */}
            <div className="flex items-center justify-between pb-2 border-b mb-2">
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {totalAccessible} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedCount === totalAccessible}
              >
                Select All
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <>
                {/* Accessible Categories - 2 per row */}
                {accessibleCategories.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {accessibleCategories.map((category) => {
                      const isSelected = selectedCategories.includes(category.id);

                      return (
                        <div
                          key={category.id}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => handleCategoryToggle(category.id, category)}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none"
                          />
                          <span className="text-lg">{category.emoji}</span>
                          <span className="flex-1 font-medium capitalize text-sm truncate">{category.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Locked Categories - single column with purchase option */}
                {lockedCategories.length > 0 && (
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      Unlock More Categories
                    </p>
                    {lockedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20"
                      >
                        <span className="text-xl">{category.emoji}</span>
                        <span className="flex-1 font-medium capitalize">{category.name}</span>
                        
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 shrink-0"
                          onClick={() => handlePurchase(category)}
                          disabled={purchasingId === category.id || coins < category.coin_price}
                        >
                          {purchasingId === category.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <CoinIcon size={14} />
                              <span>{category.coin_price}</span>
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                    
                    {user && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Your balance: <CoinIcon size={12} className="inline mx-0.5" /> {coins} coins
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button onClick={() => setOpen(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
