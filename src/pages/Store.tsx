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
  const [purchasedPackIds, setPurchasedPackIds] = useState<Set<string>>(new Set());
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

      // Fetch store items, purchasable memory match packs, coloring books, and user's purchases in parallel
      const [storeItemsResult, memoryPacksResult, coloringBooksResult, userPacksResult, userColoringBooksResult] = await Promise.all([
        supabase
          .from("store_items")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("memory_match_packs")
          .select("id, name, description, preview_image_url, price_coins, is_active, is_purchasable")
          .eq("is_active", true)
          .eq("is_purchasable", true),
        supabase
          .from("coloring_books")
          .select("id, title, description, cover_image_url, coin_price, is_free, is_active, display_order")
          .eq("is_active", true)
          .eq("is_free", false)
          .gt("coin_price", 0),
        user ? supabase
          .from("user_memory_match_packs")
          .select("pack_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_coloring_books")
          .select("book_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] })
      ]);

      if (storeItemsResult.error) throw storeItemsResult.error;
      
      // Store purchased pack IDs (memory packs and coloring books)
      const purchasedIds = new Set<string>([
        ...(userPacksResult.data || []).map((p: { pack_id: string }) => `memory_pack_${p.pack_id}`),
        ...(userColoringBooksResult.data || []).map((p: { book_id: string }) => `coloring_book_${p.book_id}`)
      ]);
      setPurchasedPackIds(purchasedIds);
      
      // Convert memory match packs to store item format
      const memoryPackItems: StoreItem[] = (memoryPacksResult.data || []).map((pack, index) => ({
        id: `memory_pack_${pack.id}`,
        name: `Memory Match: ${pack.name}`,
        description: pack.description || `Unlock the ${pack.name} theme for Memory Match game`,
        price: pack.price_coins || 0,
        category: "games",
        image_url: pack.preview_image_url,
        display_order: 1000 + index,
      }));

      // Convert coloring books to store item format
      const coloringBookItems: StoreItem[] = (coloringBooksResult.data || []).map((book, index) => ({
        id: `coloring_book_${book.id}`,
        name: `Coloring Book: ${book.title}`,
        description: book.description || `Unlock the ${book.title} coloring book`,
        price: book.coin_price,
        category: "games",
        image_url: book.cover_image_url,
        display_order: 2000 + (book.display_order || index),
      }));

      // Combine and set items
      setItems([...(storeItemsResult.data || []), ...memoryPackItems, ...coloringBookItems]);
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
                purchasedPackIds={purchasedPackIds}
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
