import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinsDisplay } from "@/components/CoinsDisplay";
import { StoreItemGrid } from "@/components/store/StoreItemGrid";
import { UserInventory } from "@/components/store/UserInventory";
import { useStorePurchases } from "@/hooks/useStorePurchases";
import { useCoins } from "@/hooks/useCoins";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  display_order: number;
}

const Store = () => {
  const navigate = useNavigate();
  const { coins } = useCoins();
  const { purchases, loading: purchasesLoading, purchaseItem, refetch } = useStorePurchases();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("store_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching store items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categories = ["all", ...new Set(items.map(item => item.category))];
  
  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/community")}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Community
            </Button>
            <CoinsDisplay />
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">JoyCoins Store</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Spend your earned JoyCoins on exclusive items, badges, and more!
            </p>
          </div>

          <Tabs defaultValue="store" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="store" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Browse Store
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                My Inventory
                {purchases.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    {purchases.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="store" className="space-y-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              <StoreItemGrid
                items={filteredItems}
                onPurchase={purchaseItem}
                userCoins={coins}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="inventory">
              <UserInventory 
                purchases={purchases} 
                loading={purchasesLoading} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Store;
