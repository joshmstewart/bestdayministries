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
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CoinIcon } from '@/components/CoinIcon';

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
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<JokeCategory[]>([]);
  const [purchasedCategories, setPurchasedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch all active categories (excluding 'random')
      const { data: categoryData, error: categoryError } = await supabase
        .from('joke_categories')
        .select('id, name, emoji, is_free, coin_price')
        .eq('is_active', true)
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

  const handleSelectAll = () => {
    const accessibleCategories = categories.filter(hasAccess).map(c => c.id);
    onCategoriesChange(accessibleCategories);
  };

  const selectedCount = selectedCategories.length;
  const totalAccessible = categories.filter(hasAccess).length;

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

          <div className="flex-1 overflow-y-auto space-y-2 py-4">
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

            {/* Category List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              categories.map((category) => {
                const accessible = hasAccess(category);
                const isSelected = selectedCategories.includes(category.id);

                return (
                  <div
                    key={category.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      accessible
                        ? 'hover:bg-muted/50 cursor-pointer'
                        : 'opacity-60 bg-muted/30'
                    } ${isSelected && accessible ? 'border-primary bg-primary/5' : 'border-border'}`}
                    onClick={() => handleCategoryToggle(category.id, category)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!accessible}
                      className="pointer-events-none"
                    />
                    <span className="text-xl">{category.emoji}</span>
                    <span className="flex-1 font-medium capitalize">{category.name}</span>
                    
                    {!accessible && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Lock className="w-3.5 h-3.5" />
                        <CoinIcon size={14} />
                        <span>{category.coin_price}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Locked categories hint */}
            {categories.some(c => !hasAccess(c)) && (
              <p className="text-xs text-muted-foreground text-center pt-4">
                🔒 Locked categories can be purchased in the Store
              </p>
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
