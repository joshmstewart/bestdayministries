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
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];

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
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const fetchItems = async () => {
    try {
      // Fetch user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        setUserRole(roleData?.role || "supporter");
      }

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

  // Filter items by role visibility first
  const roleFilteredItems = items.filter(item => {
    // Admin can see all items
    if (userRole === "admin" || userRole === "owner") return true;
    // Check if item is visible to user's role
    const visibleRoles = (item as any).visible_to_roles;
    if (!visibleRoles || visibleRoles.length === 0) return true;
    return userRole && visibleRoles.includes(userRole);
  });

  const categories = ["all", ...new Set(roleFilteredItems.map(item => item.category))];
  
  const filteredItems = selectedCategory === "all" 
    ? roleFilteredItems 
    : roleFilteredItems.filter(item => item.category === selectedCategory);

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
            <h1 className="text-4xl font-bold">JoyCoin Store</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Spend your earned JoyCoins on exclusive items, badges, and more!
            </p>
          </div>

          <Tabs defaultValue="store" className="space-y-6">
            <TabsList className="inline-flex flex-wrap h-auto mx-auto">
              <TabsTrigger value="store" className="flex items-center gap-2 whitespace-nowrap">
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
                purchases={purchases}
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
