import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface PricingTier {
  id: string;
  min_quantity: number;
  price_per_unit: number;
}

interface CoffeeProductTiersManagerProps {
  productId: string;
  basePrice: number;
}

export function CoffeeProductTiersManager({ productId, basePrice }: CoffeeProductTiersManagerProps) {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New tier form state
  const [newQuantity, setNewQuantity] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("coffee_product_tiers")
        .select("id, min_quantity, price_per_unit")
        .eq("product_id", productId)
        .order("min_quantity", { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error: any) {
      console.error("Error fetching tiers:", error);
      toast({
        title: "Error loading pricing tiers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchTiers();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const addTier = async () => {
    const quantity = parseInt(newQuantity);
    const price = parseFloat(newPrice);

    if (!quantity || quantity < 1) {
      toast({
        title: "Invalid quantity",
        description: "Minimum quantity must be at least 1",
        variant: "destructive",
      });
      return;
    }

    if (!price || price < 0) {
      toast({
        title: "Invalid price",
        description: "Price per unit must be a positive number",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate quantity
    if (tiers.some(t => t.min_quantity === quantity)) {
      toast({
        title: "Duplicate tier",
        description: `A tier for ${quantity}+ units already exists`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("coffee_product_tiers")
        .insert({
          product_id: productId,
          min_quantity: quantity,
          price_per_unit: price,
        })
        .select("id, min_quantity, price_per_unit")
        .single();

      if (error) throw error;

      setTiers(prev => [...prev, data].sort((a, b) => a.min_quantity - b.min_quantity));
      setNewQuantity("");
      setNewPrice("");
      toast({ title: "Pricing tier added" });
    } catch (error: any) {
      console.error("Error adding tier:", error);
      toast({
        title: "Error adding tier",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (tierId: string) => {
    try {
      const { error } = await supabase
        .from("coffee_product_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;

      setTiers(prev => prev.filter(t => t.id !== tierId));
      toast({ title: "Pricing tier removed" });
    } catch (error: any) {
      console.error("Error deleting tier:", error);
      toast({
        title: "Error removing tier",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!productId) {
    return (
      <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        Save the product first to add pricing tiers.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Volume Pricing Tiers</Label>
        <span className="text-xs text-muted-foreground">
          Base: ${basePrice.toFixed(2)}/unit
        </span>
      </div>

      {/* Existing Tiers */}
      {tiers.length > 0 ? (
        <div className="space-y-2">
          {tiers.map((tier) => {
            const savings = basePrice - tier.price_per_unit;
            const savingsPercent = basePrice > 0 ? ((savings / basePrice) * 100).toFixed(0) : 0;
            
            return (
              <div
                key={tier.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Buy </span>
                    <span className="font-medium">{tier.min_quantity}+</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pay </span>
                    <span className="font-medium">${tier.price_per_unit.toFixed(2)}/ea</span>
                    {savings > 0 && (
                      <span className="ml-2 text-xs text-green-600">
                        (save {savingsPercent}%)
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteTier(tier.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">
          No volume discounts configured. Add tiers below.
        </p>
      )}

      {/* Add New Tier */}
      <div className="flex gap-3 items-end pt-2 border-t">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Min Quantity</Label>
          <Input
            type="number"
            min="1"
            placeholder="e.g., 10"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Price per Unit ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g., 8.99"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addTier}
          disabled={saving || !newQuantity || !newPrice}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Example: "Buy 10+ → $8.99/ea" means customers ordering 10 or more pay the discounted rate.
      </p>
    </div>
  );
}
