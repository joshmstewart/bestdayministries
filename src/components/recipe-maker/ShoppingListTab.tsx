import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ShoppingCart, Package, Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import { SectionLoadingState } from "@/components/common";

interface ShoppingItem {
  id: string;
  item_name: string;
  item_type: string;
  reason: string | null;
  is_purchased: boolean | null;
  created_at: string;
}

interface ShoppingListTabProps {
  userId: string;
  onAddToInventory?: () => void;
}

export const ShoppingListTab = ({ userId, onAddToInventory }: ShoppingListTabProps) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("recipe_shopping_list")
      .select("*")
      .eq("user_id", userId)
      .order("is_purchased", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading shopping list:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("shopping-list-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_shopping_list",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const togglePurchased = async (item: ShoppingItem) => {
    setActionLoading(`toggle-${item.id}`);
    try {
      await supabase
        .from("recipe_shopping_list")
        .update({ is_purchased: !item.is_purchased })
        .eq("id", item.id);

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i
        )
      );
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Couldn't update item");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteItem = async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      await supabase.from("recipe_shopping_list").delete().eq("id", id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Removed from list");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Couldn't remove item");
    } finally {
      setActionLoading(null);
    }
  };

  const addToInventory = async (item: ShoppingItem) => {
    if (item.item_type !== "ingredient") return;
    
    setActionLoading(`inventory-${item.id}`);
    try {
      // Get current ingredients
      const { data: current } = await supabase
        .from("user_recipe_ingredients")
        .select("ingredients")
        .eq("user_id", userId)
        .maybeSingle();

      const currentIngredients: string[] = current?.ingredients || [];
      
      // Check if already exists
      const alreadyHas = currentIngredients.some(
        (ing) =>
          ing.toLowerCase().includes(item.item_name.toLowerCase()) ||
          item.item_name.toLowerCase().includes(ing.toLowerCase())
      );

      if (alreadyHas) {
        toast.info("Already in your inventory");
        return;
      }

      const newIngredients = [...currentIngredients, item.item_name];

      if (current) {
        await supabase
          .from("user_recipe_ingredients")
          .update({ ingredients: newIngredients })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_recipe_ingredients")
          .insert({ user_id: userId, ingredients: newIngredients });
      }

      // Remove from shopping list after adding to inventory
      await supabase.from("recipe_shopping_list").delete().eq("id", item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      toast.success(`Added ${item.item_name} to inventory`);
      onAddToInventory?.();
    } catch (error) {
      console.error("Error adding to inventory:", error);
      toast.error("Couldn't add to inventory");
    } finally {
      setActionLoading(null);
    }
  };

  const clearPurchased = async () => {
    const purchasedItems = items.filter((i) => i.is_purchased);
    if (purchasedItems.length === 0) return;

    setActionLoading("clear");
    try {
      await supabase
        .from("recipe_shopping_list")
        .delete()
        .eq("user_id", userId)
        .eq("is_purchased", true);

      setItems((prev) => prev.filter((i) => !i.is_purchased));
      toast.success("Cleared purchased items");
    } catch (error) {
      console.error("Error clearing items:", error);
      toast.error("Couldn't clear items");
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ingredient":
        return <Package className="h-4 w-4 text-green-600" />;
      case "tool":
        return <Wrench className="h-4 w-4 text-blue-600" />;
      default:
        return <ShoppingCart className="h-4 w-4 text-primary" />;
    }
  };

  const unpurchasedItems = items.filter((i) => !i.is_purchased);
  const purchasedItems = items.filter((i) => i.is_purchased);

  if (loading) {
    return <SectionLoadingState className="py-12" />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Your shopping list is empty</h3>
        <p className="text-muted-foreground text-sm">
          Add items from recipe ingredients or shopping tips
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with clear button */}
      {purchasedItems.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearPurchased}
            disabled={actionLoading === "clear"}
          >
            {actionLoading === "clear" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear Purchased ({purchasedItems.length})
          </Button>
        </div>
      )}

      {/* Unpurchased items */}
      {unpurchasedItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              To Get ({unpurchasedItems.length})
            </h3>
            <ul className="space-y-2">
              {unpurchasedItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => togglePurchased(item)}
                    disabled={actionLoading?.includes(item.id)}
                  />
                  {getTypeIcon(item.item_type)}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.item_name}</span>
                    {item.reason && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.reason}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                    {item.item_type}
                  </Badge>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.item_type === "ingredient" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addToInventory(item)}
                        disabled={actionLoading?.includes(item.id)}
                        title="Add to inventory"
                      >
                        {actionLoading === `inventory-${item.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteItem(item.id)}
                      disabled={actionLoading?.includes(item.id)}
                      title="Remove from list"
                    >
                      {actionLoading === `delete-${item.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Purchased items */}
      {purchasedItems.length > 0 && (
        <Card className="opacity-75">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-muted-foreground">
              ✓ Purchased ({purchasedItems.length})
            </h3>
            <ul className="space-y-2">
              {purchasedItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => togglePurchased(item)}
                    disabled={actionLoading?.includes(item.id)}
                  />
                  {getTypeIcon(item.item_type)}
                  <span className="flex-1 line-through text-muted-foreground">
                    {item.item_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => deleteItem(item.id)}
                    disabled={actionLoading?.includes(item.id)}
                  >
                    {actionLoading === `delete-${item.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
