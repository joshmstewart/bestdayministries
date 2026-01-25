import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { CoinsDisplay } from "@/components/CoinsDisplay";
import { StoreItemGrid } from "@/components/store/StoreItemGrid";
import { CoinTransactionLedger } from "@/components/store/CoinTransactionLedger";
import { AllWaysToEarnDialog } from "@/components/store/AllWaysToEarnDialog";
import { CoinIcon } from "@/components/CoinIcon";
import { useStorePurchases } from "@/hooks/useStorePurchases";
import { useCoins } from "@/hooks/useCoins";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
  pageCount?: number;
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
  const [hidePurchased, setHidePurchased] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [earnDialogOpen, setEarnDialogOpen] = useState(false);

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

      // Fetch store items, purchasable memory match packs, coloring books, cash register packs, joke categories, fitness avatars, location packs and user's purchases in parallel
      const [
        storeItemsResult, 
        memoryPacksResult, 
        coloringBooksResult, 
        cashRegisterPacksResult, 
        jokeCategoriesResult, 
        fitnessAvatarsResult,
        locationPacksResult,
        userPacksResult, 
        userColoringBooksResult, 
        userCashRegisterPacksResult, 
        userJokeCategoriesResult,
        userFitnessAvatarsResult,
        userLocationPacksResult
      ] = await Promise.all([
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
          .select("id, title, description, cover_image_url, coin_price, is_free, is_active, display_order, coloring_pages!inner(id)")
          .eq("is_active", true)
          .eq("is_free", false)
          .gt("coin_price", 0)
          .eq("coloring_pages.is_active", true),
        supabase
          .from("cash_register_packs")
          .select("id, name, description, image_url, price_coins, pack_type, display_order")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("joke_categories")
          .select("id, name, description, icon_url, coin_price, is_free, is_active, display_order")
          .eq("is_active", true)
          .eq("is_free", false)
          .gt("coin_price", 0),
        supabase
          .from("fitness_avatars")
          .select("id, name, description, preview_image_url, price_coins, is_free, is_active, display_order")
          .eq("is_active", true)
          .eq("is_free", false)
          .gt("price_coins", 0),
        supabase
          .from("workout_location_packs")
          .select("id, name, description, image_url, price_coins, is_free, is_active, display_order")
          .eq("is_active", true)
          .eq("is_free", false)
          .gt("price_coins", 0),
        user ? supabase
          .from("user_memory_match_packs")
          .select("pack_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_coloring_books")
          .select("book_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_cash_register_packs")
          .select("pack_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_joke_categories")
          .select("category_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_fitness_avatars")
          .select("avatar_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_workout_location_packs")
          .select("pack_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] })
      ]);

      if (storeItemsResult.error) throw storeItemsResult.error;
      
      // Store purchased pack IDs (memory packs, coloring books, cash register packs, joke categories, fitness avatars, and location packs)
      const purchasedIds = new Set<string>([
        ...(userPacksResult.data || []).map((p: { pack_id: string }) => `memory_pack_${p.pack_id}`),
        ...(userColoringBooksResult.data || []).map((p: { book_id: string }) => `coloring_book_${p.book_id}`),
        ...(userCashRegisterPacksResult.data || []).map((p: { pack_id: string }) => `cash_register_pack_${p.pack_id}`),
        ...(userJokeCategoriesResult.data || []).map((p: { category_id: string }) => `joke_category_${p.category_id}`),
        ...(userFitnessAvatarsResult.data || []).map((p: { avatar_id: string }) => `fitness_avatar_${p.avatar_id}`),
        ...(userLocationPacksResult.data || []).map((p: { pack_id: string }) => `location_pack_${p.pack_id}`)
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

      // Convert coloring books to store item format - aggregate by book id to count pages
      const bookPageCounts = new Map<string, number>();
      (coloringBooksResult.data || []).forEach((book: any) => {
        const pageCount = Array.isArray(book.coloring_pages) ? book.coloring_pages.length : 0;
        bookPageCounts.set(book.id, (bookPageCounts.get(book.id) || 0) + pageCount);
      });
      
      // Deduplicate books (since inner join creates multiple rows)
      const uniqueBooks = new Map<string, any>();
      (coloringBooksResult.data || []).forEach((book: any) => {
        if (!uniqueBooks.has(book.id)) {
          uniqueBooks.set(book.id, book);
        }
      });
      
      const coloringBookItems: StoreItem[] = Array.from(uniqueBooks.values()).map((book, index) => ({
        id: `coloring_book_${book.id}`,
        name: `Coloring Book: ${book.title}`,
        description: book.description || `Unlock the ${book.title} coloring book`,
        price: book.coin_price,
        category: "games",
        image_url: book.cover_image_url,
        display_order: 2000 + (book.display_order || index),
        pageCount: bookPageCounts.get(book.id) || 0,
      }));

      // Convert cash register packs to store item format
      const packTypeLabels: Record<string, string> = {
        customers: "Customers",
        stores: "Stores",
        mixed: "Content",
      };
      const cashRegisterPackItems: StoreItem[] = (cashRegisterPacksResult.data || []).map((pack, index) => ({
        id: `cash_register_pack_${pack.id}`,
        name: `Cash Register: ${pack.name}`,
        description: pack.description || `Unlock new ${packTypeLabels[pack.pack_type] || "content"} for the Cash Register game`,
        price: pack.price_coins,
        category: "games",
        image_url: pack.image_url,
        display_order: 3000 + (pack.display_order || index),
      }));

      // Convert joke categories to store item format
      const jokeCategoryItems: StoreItem[] = (jokeCategoriesResult.data || []).map((cat, index) => ({
        id: `joke_category_${cat.id}`,
        name: `Joke Pack: ${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}`,
        description: cat.description || `Unlock ${cat.name} jokes in the Daily Joke feature`,
        price: cat.coin_price,
        category: "games",
        image_url: cat.icon_url,
        display_order: 4000 + (cat.display_order || index),
      }));

      // Convert fitness avatars to store item format
      const fitnessAvatarItems: StoreItem[] = (fitnessAvatarsResult.data || []).map((avatar, index) => ({
        id: `fitness_avatar_${avatar.id}`,
        name: `Workout Avatar: ${avatar.name}`,
        description: avatar.description || `Unlock the ${avatar.name} avatar for your workout journey`,
        price: avatar.price_coins,
        category: "fitness",
        image_url: avatar.preview_image_url,
        display_order: 5000 + (avatar.display_order || index),
      }));

      // Convert location packs to store item format
      const locationPackItems: StoreItem[] = (locationPacksResult.data || []).map((pack, index) => ({
        id: `location_pack_${pack.id}`,
        name: `Workout Location: ${pack.name}`,
        description: pack.description || `Unlock the ${pack.name} location for your workouts`,
        price: pack.price_coins,
        category: "fitness",
        image_url: pack.image_url,
        display_order: 6000 + (pack.display_order || index),
      }));

      // Combine and set items
      setItems([
        ...(storeItemsResult.data || []), 
        ...memoryPackItems, 
        ...coloringBookItems, 
        ...cashRegisterPackItems, 
        ...jokeCategoryItems,
        ...fitnessAvatarItems,
        ...locationPackItems
      ]);
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
  
  // Apply category and purchased filters
  const filteredItems = roleFilteredItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const isPurchased = purchases.some(p => p.store_item_id === item.id) || purchasedPackIds.has(item.id);
    const matchesPurchased = !hidePurchased || !isPurchased;
    return matchesCategory && matchesPurchased;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <CoinsDisplay onClick={() => setLedgerOpen(true)} />
          </div>

          <CoinTransactionLedger
            open={ledgerOpen}
            onOpenChange={setLedgerOpen}
            currentBalance={coins}
          />

          {/* Large Coin Display */}
          <div className="flex justify-center">
            <div className="animate-slow-pulse">
              <CoinIcon size={100} className="drop-shadow-lg md:hidden" />
              <CoinIcon size={120} className="drop-shadow-lg hidden md:block" />
            </div>
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Coin Shop</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Spend your earned coins on exclusive items, badges, and more!
            </p>
          </div>

          {/* How It Works Section - Simplified */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
            <h2 className="text-xl font-bold text-center mb-4">💰 How Coins Work</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">✨</span> Earn Coins
                </h3>
                <p className="text-muted-foreground text-sm">
                  Play games, complete daily activities, share creations, and more to earn coins!
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEarnDialogOpen(true)}
                  className="w-full"
                >
                  See All Ways to Earn
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">🛒</span> Spend Coins
                </h3>
                <p className="text-muted-foreground text-sm">
                  Unlock game themes, coloring books, bonus sticker packs, workout avatars, and more!
                </p>
              </div>
            </div>
          </div>

          <AllWaysToEarnDialog open={earnDialogOpen} onOpenChange={setEarnDialogOpen} />

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center items-center">
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
              
              <div className="flex items-center space-x-2 ml-4">
                <Checkbox
                  id="hide-purchased"
                  checked={hidePurchased}
                  onCheckedChange={(checked) => setHidePurchased(checked === true)}
                />
                <label
                  htmlFor="hide-purchased"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Hide purchased
                </label>
              </div>
            </div>

            <StoreItemGrid
              items={filteredItems}
              onPurchase={purchaseItem}
              userCoins={coins}
              loading={loading}
              purchases={purchases}
              purchasedPackIds={purchasedPackIds}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Store;
