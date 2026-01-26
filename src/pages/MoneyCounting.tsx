import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy, Store, ChevronDown } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { CashDrawer } from "@/components/money-counting/CashDrawer";
import { CustomerPayment } from "@/components/money-counting/CustomerPayment";
import { ChangeTracker } from "@/components/money-counting/ChangeTracker";
import { ReceiptDisplay } from "@/components/money-counting/ReceiptDisplay";
import { LevelComplete } from "@/components/money-counting/LevelComplete";
import { CashRegisterStats } from "@/components/cash-register/CashRegisterStats";
import { CashRegisterLeaderboard } from "@/components/cash-register/CashRegisterLeaderboard";
import { generateOrder, calculateOptimalChange, MenuItem } from "@/lib/moneyCountingUtils";
import { loadCustomCurrencyImages } from "@/lib/currencyImages";
import { supabase } from "@/integrations/supabase/client";
import { useCashRegisterStats } from "@/hooks/useCashRegisterStats";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Json } from "@/integrations/supabase/types";

// Fallback images for stores without DB images
import coffeeShopBg from "@/assets/games/stores/coffee-shop-pov.jpg";
import groceryBg from "@/assets/games/stores/grocery-store-pov.jpg";
import clothingBg from "@/assets/games/stores/clothing-store-pov.jpg";
import convenienceBg from "@/assets/games/stores/convenience-store-pov.jpg";
import bakeryBg from "@/assets/games/stores/bakery-pov.jpg";

interface StoreType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_default: boolean;
  menu_items: Json | null;
  receipt_address: string | null;
  receipt_tagline: string | null;
}

interface CustomerType {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

const FALLBACK_IMAGES: Record<string, string> = {
  "Coffee Shop": coffeeShopBg,
  "Grocery Store": groceryBg,
  "Clothing Store": clothingBg,
  "Convenience Store": convenienceBg,
  "Bakery": bakeryBg,
};

export interface OrderItem {
  name: string;
  price: number;
}

export interface GameState {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerPayment: number;
  changeNeeded: number;
  changeGiven: { [key: string]: number };
  drawerContents: { [key: string]: number };
  customerCash: { [key: string]: number };
  cashCollected: boolean;
  level: number;
  score: number;
  step: "receipt" | "payment" | "change"; // Sequential flow
}

const INITIAL_DRAWER: { [key: string]: number } = {
  "100": 2,
  "50": 2,
  "20": 5,
  "10": 5,
  "5": 10,
  "1": 20,
  "0.25": 40,
  "0.10": 50,
  "0.05": 40,
  "0.01": 100,
};

const TAX_RATE = 0.08; // 8% tax

export default function MoneyCounting() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerType | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [customCurrencyImages, setCustomCurrencyImages] = useState<{ [key: string]: string }>({});

  const [levelResult, setLevelResult] = useState<{
    success: boolean;
    piecesUsed: number;
    optimalPieces: number;
    optimalBreakdown: { [key: string]: number };
  } | null>(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("play");

  const { user } = useAuth();
  const { saveGameResult } = useCashRegisterStats();

  // Load stores and customers from database (including purchased pack items)
  useEffect(() => {
    const loadData = async () => {
      console.log("Loading cash register data...");
      
      // Get current user for pack purchases
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load base data and user's purchased packs/stores
      const [storesRes, customersRes, currencyImages, userPacksRes, userStoresRes, packItemsRes] = await Promise.all([
        supabase
          .from("cash_register_stores")
          .select("id, name, description, image_url, is_default, menu_items, is_pack_only, is_free, price_coins, receipt_address, receipt_tagline")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("cash_register_customers")
          .select("id, name, description, image_url, is_pack_only")
          .eq("is_active", true),
        loadCustomCurrencyImages(),
        user ? supabase
          .from("user_cash_register_packs")
          .select("pack_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase
          .from("user_cash_register_stores")
          .select("store_id")
          .eq("user_id", user.id) : Promise.resolve({ data: [] }),
        supabase.from("cash_register_pack_items").select("pack_id, store_id, customer_id"),
      ]);

      setCustomCurrencyImages(currencyImages);
      
      // Get purchased pack IDs and directly purchased store IDs
      const purchasedPackIds = new Set((userPacksRes.data || []).map(p => p.pack_id));
      const purchasedStoreIds = new Set((userStoresRes.data || []).map(s => s.store_id));
      
      // Get store/customer IDs from purchased packs
      const unlockedStoreIds = new Set<string>();
      const unlockedCustomerIds = new Set<string>();
      (packItemsRes.data || []).forEach(item => {
        if (purchasedPackIds.has(item.pack_id)) {
          if (item.store_id) unlockedStoreIds.add(item.store_id);
          if (item.customer_id) unlockedCustomerIds.add(item.customer_id);
        }
      });
      
      // Also add directly purchased stores to unlocked set
      purchasedStoreIds.forEach(id => unlockedStoreIds.add(id));

      if (storesRes.error) {
        console.error("Error loading stores:", storesRes.error);
      } else {
        // Filter stores: show if:
        // 1. Store is free (is_free = true), OR
        // 2. Store is NOT pack-only and price_coins = 0 (default stores), OR
        // 3. Store is unlocked (via pack or direct purchase)
        const availableStores = (storesRes.data || []).filter(s => 
          s.is_free || (!s.is_pack_only && (s.price_coins || 0) === 0) || unlockedStoreIds.has(s.id)
        );
        console.log("Loaded stores:", availableStores.length);
        setStores(availableStores);
        const defaultStore = availableStores.find((s) => s.is_default) || availableStores[0];
        if (defaultStore) setSelectedStore(defaultStore);
      }

      if (customersRes.error) {
        console.error("Error loading customers:", customersRes.error);
      } else {
        // Filter: show non-pack-only customers OR pack-only customers that are unlocked
        const availableCustomers = (customersRes.data || []).filter(c => 
          !c.is_pack_only || unlockedCustomerIds.has(c.id)
        );
        console.log("Loaded customers:", availableCustomers.length);
        setCustomers(availableCustomers);
      }
      
      setDataLoaded(true);
    };

    loadData();
  }, []);

  // Pick a different customer for each level (excludes current customer)
  const pickRandomCustomer = useCallback((customerList?: CustomerType[]) => {
    const list = customerList || customers;
    if (list.length === 0) return;
    
    // Filter out the current customer to ensure we get a different one each level
    const availableCustomers = currentCustomer 
      ? list.filter(c => c.id !== currentCustomer.id)
      : list;
    
    // If only one customer exists (or all filtered out), use the full list
    const pickFrom = availableCustomers.length > 0 ? availableCustomers : list;
    
    const randomIndex = Math.floor(Math.random() * pickFrom.length);
    const selectedCustomer = pickFrom[randomIndex];
    console.log("Picked customer:", selectedCustomer.name, "has image:", !!selectedCustomer.image_url);
    setCurrentCustomer(selectedCustomer);
  }, [customers, currentCustomer]);

  // Pick first customer once customers are loaded
  useEffect(() => {
    if (customers.length > 0 && !currentCustomer) {
      console.log("Customers loaded, picking random customer from", customers.length, "customers");
      pickRandomCustomer();
    }
  }, [customers, currentCustomer, pickRandomCustomer]);

  const getStoreBackground = () => {
    if (selectedStore?.image_url) {
      return selectedStore.image_url;
    }
    if (selectedStore?.name && FALLBACK_IMAGES[selectedStore.name]) {
      return FALLBACK_IMAGES[selectedStore.name];
    }
    return coffeeShopBg;
  };

  const startNewGame = useCallback(() => {
    // Get menu items from selected store
    const storeMenuItems = selectedStore?.menu_items as unknown as MenuItem[] | undefined;
    const order = generateOrder(1, storeMenuItems);
    const subtotal = order.reduce((sum, item) => sum + item.price, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    // Generate realistic customer payment (round up to convenient amount)
    const { payment, cash } = generateCustomerPayment(total);
    const changeNeeded = Math.round((payment - total) * 100) / 100;

    setGameState({
      items: order,
      subtotal,
      tax,
      total,
      customerPayment: payment,
      changeNeeded,
      changeGiven: {},
      drawerContents: { ...INITIAL_DRAWER },
      customerCash: cash,
      cashCollected: false,
      level: 1,
      score: 0,
      step: "receipt",
    });
    setShowComplete(false);
    setLevelResult(null);
    pickRandomCustomer();
  }, [pickRandomCustomer, selectedStore]);

  const startNextLevel = useCallback(() => {
    if (!gameState) return;
    
    const newLevel = gameState.level + 1;
    // Get menu items from selected store
    const storeMenuItems = selectedStore?.menu_items as unknown as MenuItem[] | undefined;
    const order = generateOrder(newLevel, storeMenuItems);
    const subtotal = order.reduce((sum, item) => sum + item.price, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    const { payment, cash } = generateCustomerPayment(total);
    const changeNeeded = Math.round((payment - total) * 100) / 100;

    setGameState({
      ...gameState,
      items: order,
      subtotal,
      tax,
      total,
      customerPayment: payment,
      changeNeeded,
      changeGiven: {},
      customerCash: cash,
      cashCollected: false,
      level: newLevel,
      step: "receipt",
    });
    setShowComplete(false);
    setLevelResult(null);
    pickRandomCustomer();
  }, [gameState, pickRandomCustomer, selectedStore]);

  const goToNextStep = useCallback(() => {
    if (!gameState) return;
    
    if (gameState.step === "receipt") {
      setGameState({ ...gameState, step: "payment" });
    } else if (gameState.step === "payment") {
      // Collect cash and move to change step
      const newDrawer = { ...gameState.drawerContents };
      Object.entries(gameState.customerCash).forEach(([denom, count]) => {
        newDrawer[denom] = (newDrawer[denom] || 0) + count;
      });
      setGameState({
        ...gameState,
        drawerContents: newDrawer,
        cashCollected: true,
        step: "change",
      });
      toast.success("Cash collected! Now make change.");
    }
  }, [gameState]);

  const generateCustomerPayment = (total: number): { payment: number; cash: { [key: string]: number } } => {
    const cash: { [key: string]: number } = {};
    let payment = 0;

    // Customer pays with realistic amounts
    if (total <= 5) {
      // Pay with a $5 or $10
      const bill = Math.random() > 0.5 ? 5 : 10;
      cash[bill.toString()] = 1;
      payment = bill;
    } else if (total <= 10) {
      // Pay with $10 or $20
      const bill = Math.random() > 0.5 ? 10 : 20;
      cash[bill.toString()] = 1;
      payment = bill;
    } else if (total <= 20) {
      // Pay with $20 or exact-ish
      if (Math.random() > 0.3) {
        cash["20"] = 1;
        payment = 20;
      } else {
        // Try to pay closer to exact
        const twenties = Math.floor(total / 20);
        const remainder = total - twenties * 20;
        if (twenties > 0) {
          cash["20"] = twenties;
          payment += twenties * 20;
        }
        if (remainder > 0) {
          const tens = Math.ceil(remainder / 10);
          cash["10"] = tens;
          payment += tens * 10;
        }
      }
    } else if (total <= 50) {
      // Mix of bills
      if (Math.random() > 0.5) {
        cash["50"] = 1;
        payment = 50;
      } else {
        const twenties = Math.ceil(total / 20);
        cash["20"] = twenties;
        payment = twenties * 20;
      }
    } else {
      // Larger amounts
      const hundreds = Math.floor(total / 100);
      const remainder = total - hundreds * 100;
      
      if (hundreds > 0) {
        cash["100"] = hundreds;
        payment += hundreds * 100;
      }
      
      if (remainder > 0) {
        if (remainder <= 20) {
          cash["20"] = 1;
          payment += 20;
        } else if (remainder <= 50) {
          cash["50"] = 1;
          payment += 50;
        } else {
          cash["100"] = (cash["100"] || 0) + 1;
          payment += 100;
        }
      }
    }

    // Sometimes add coins for near-exact payment
    if (Math.random() > 0.7 && payment - total > 0.50) {
      const cents = Math.round((total % 1) * 100);
      if (cents > 0 && cents <= 99) {
        // Add some coins to reduce change needed
        if (cents >= 25) {
          const quarters = Math.floor(cents / 25);
          cash["0.25"] = quarters;
          payment += quarters * 0.25;
        }
      }
    }

    return { payment: Math.round(payment * 100) / 100, cash };
  };

  const giveMoney = useCallback((denomination: string) => {
    if (!gameState || !gameState.cashCollected) return;
    
    const denomValue = parseFloat(denomination);
    const currentGiven = Object.entries(gameState.changeGiven).reduce(
      (sum, [d, count]) => sum + parseFloat(d) * count,
      0
    );
    
    // Check if giving this would exceed what's needed
    if (currentGiven + denomValue > gameState.changeNeeded + 0.001) {
      toast.error("That's too much change!");
      return;
    }

    const newChangeGiven = { ...gameState.changeGiven };
    newChangeGiven[denomination] = (newChangeGiven[denomination] || 0) + 1;

    const newTotalGiven = Object.entries(newChangeGiven).reduce(
      (sum, [d, count]) => sum + parseFloat(d) * count,
      0
    );

    setGameState({
      ...gameState,
      changeGiven: newChangeGiven,
    });

    // Check if we've given exact change
    if (Math.abs(newTotalGiven - gameState.changeNeeded) < 0.001) {
      completeLevel(newChangeGiven);
    }
  }, [gameState]);

  const returnMoney = useCallback((denomination: string) => {
    if (!gameState) return;
    
    if ((gameState.changeGiven[denomination] || 0) <= 0) return;

    const newDrawer = { ...gameState.drawerContents };
    newDrawer[denomination] = (newDrawer[denomination] || 0) + 1;

    const newChangeGiven = { ...gameState.changeGiven };
    newChangeGiven[denomination] = (newChangeGiven[denomination] || 0) - 1;
    if (newChangeGiven[denomination] === 0) {
      delete newChangeGiven[denomination];
    }

    setGameState({
      ...gameState,
      drawerContents: newDrawer,
      changeGiven: newChangeGiven,
    });
  }, [gameState]);

  const completeLevel = (changeGiven: { [key: string]: number }) => {
    if (!gameState) return;

    const piecesUsed = Object.values(changeGiven).reduce((sum, count) => sum + count, 0);
    const optimal = calculateOptimalChange(gameState.changeNeeded);
    const optimalPieces = Object.values(optimal).reduce((sum, count) => sum + count, 0);

    const result = {
      success: true,
      piecesUsed,
      optimalPieces,
      optimalBreakdown: optimal,
    };

    setLevelResult(result);
    setShowComplete(true);

    // Calculate score bonus for efficiency
    const efficiencyBonus = piecesUsed <= optimalPieces ? 50 : 0;
    const levelBonus = gameState.level * 10;
    const newScore = gameState.score + 100 + efficiencyBonus + levelBonus;

    setGameState({
      ...gameState,
      score: newScore,
    });

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    // Save stats when game ends (player completes a level)
    if (user) {
      saveGameResult(newScore, gameState.level);
      setStatsRefreshKey(prev => prev + 1);
    }
  };

  useEffect(() => {
    startNewGame();
  }, []);

  // Regenerate order when store changes (after initial load)
  useEffect(() => {
    if (!dataLoaded || !selectedStore || !gameState) return;
    
    // Regenerate order with new store's menu items
    const storeMenuItems = selectedStore.menu_items as unknown as MenuItem[] | undefined;
    const order = generateOrder(gameState.level, storeMenuItems);
    const subtotal = order.reduce((sum, item) => sum + item.price, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    
    // Regenerate customer payment for new total
    const { payment, cash } = generateCustomerPayment(total);
    const changeNeeded = Math.round((payment - total) * 100) / 100;

    setGameState(prev => prev ? {
      ...prev,
      items: order,
      subtotal,
      tax,
      total,
      customerPayment: payment,
      changeNeeded,
      changeGiven: {},
      customerCash: cash,
      cashCollected: false,
      step: "receipt",
    } : null);
    
    setShowComplete(false);
    setLevelResult(null);
  }, [selectedStore?.id]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UnifiedHeader />
      
      <main className="pt-20 pb-8 px-4 flex-1">
        <div className="container mx-auto max-w-6xl">
          <BackButton className="mb-4" />
          <div className="mb-4">
            <h1 className="text-2xl font-bold">💵 Cash Register</h1>
            <p className="text-muted-foreground text-sm">Make correct change for customers!</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="play">Play</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              </TabsList>
            </div>

            {/* Play Tab */}
            <TabsContent value="play" className="space-y-4">
              {/* Game Settings Bar - uses bg-soft-ribbon utility class */}
              <div className="flex items-center justify-between bg-soft-ribbon rounded-lg p-4 shadow-lg flex-wrap gap-4 border border-primary/30">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Store Selector */}
                  {stores.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Store className="h-4 w-4 mr-2" />
                          {selectedStore?.name || "Select Store"}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {stores.map((store) => (
                          <DropdownMenuItem
                            key={store.id}
                            onClick={() => setSelectedStore(store)}
                            className={selectedStore?.id === store.id ? "bg-accent" : ""}
                          >
                            {store.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    Level {gameState.level}
                  </Badge>
                  <Badge variant="default" className="text-lg px-3 py-1">
                    <Trophy className="h-4 w-4 mr-1" />
                    {gameState.score}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={startNewGame}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Game
                </Button>
              </div>

              {/* Main Game Area with Store Background */}
              <div 
                className="min-h-[calc(100vh-320px)] rounded-lg relative overflow-hidden bg-muted"
                style={{
                  backgroundImage: `url(${getStoreBackground()})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center center',
                }}
              >
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-black/30" />
                
                <div className="relative z-10 p-6">
        {showComplete && levelResult ? (
          <LevelComplete
            result={levelResult}
            level={gameState.level}
            score={gameState.score}
            onNextLevel={startNextLevel}
            onNewGame={startNewGame}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
            {/* Left Column - Interactive Modules */}
            <div className="space-y-6 bg-background/90 backdrop-blur-sm rounded-lg p-6 shadow-lg">
              {/* Step 1: Receipt */}
              {gameState.step === "receipt" && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Step 1: Review the Order
                    </Badge>
                  </div>
                  <ReceiptDisplay
                    items={gameState.items}
                    subtotal={gameState.subtotal}
                    tax={gameState.tax}
                    total={gameState.total}
                    storeName={selectedStore?.name}
                    storeAddress={selectedStore?.receipt_address}
                    storeTagline={selectedStore?.receipt_tagline}
                  />
                  <Button onClick={goToNextStep} size="lg" className="w-full">
                    Next: See Customer Payment →
                  </Button>
                </div>
              )}

              {/* Step 2: Customer Payment */}
              {gameState.step === "payment" && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Step 2: Collect Payment
                    </Badge>
                  </div>
                  <CustomerPayment
                    customerCash={gameState.customerCash}
                    totalPayment={gameState.customerPayment}
                    orderTotal={gameState.total}
                    cashCollected={gameState.cashCollected}
                    onCollect={goToNextStep}
                    customCurrencyImages={customCurrencyImages}
                  />
                </div>
              )}

              {/* Step 3: Make Change */}
              {gameState.step === "change" && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Step 3: Give Change
                    </Badge>
                  </div>
                  <ChangeTracker
                    changeNeeded={gameState.changeNeeded}
                    changeGiven={gameState.changeGiven}
                    cashCollected={gameState.cashCollected}
                    onReturnMoney={returnMoney}
                    customCurrencyImages={customCurrencyImages}
                  />
                  <CashDrawer
                    onSelectMoney={giveMoney}
                    disabled={!gameState.cashCollected}
                    customCurrencyImages={customCurrencyImages}
                  />
                </div>
              )}
            </div>

            {/* Right Column - Customer Display */}
            <div className="flex flex-col items-center justify-end min-h-[300px]">
              {currentCustomer && currentCustomer.image_url ? (
                <div className="text-center">
                  <img
                    src={currentCustomer.image_url}
                    alt={currentCustomer.name}
                    className="w-80 sm:w-96 lg:w-[28rem] xl:w-[32rem] max-h-[75vh] object-contain drop-shadow-2xl"
                    onError={(e) => {
                      console.error("Customer image failed to load:", currentCustomer.name);
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="mt-2 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                    <h3 className="text-lg font-medium text-foreground">{currentCustomer.name}</h3>
                  </div>
                </div>
              ) : currentCustomer ? (
                <div className="text-center">
                  <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] flex items-center justify-center">
                    <span className="text-9xl drop-shadow-lg">👤</span>
                  </div>
                  <div className="mt-2 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
                    <h3 className="text-lg font-medium text-foreground">{currentCustomer.name}</h3>
                  </div>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center">
                  <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] flex items-center justify-center">
                    <span className="text-6xl drop-shadow-lg animate-pulse">⏳</span>
                  </div>
                  <p className="mt-2 text-muted-foreground">Loading customers...</p>
                </div>
              ) : (
                <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] flex items-center justify-center">
                  <span className="text-9xl drop-shadow-lg">👤</span>
                </div>
              )}
            </div>
          </div>
        )}
              </div>
            </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-6">
              <CashRegisterStats refreshKey={statsRefreshKey} currentScore={gameState.score} />
              <CashRegisterLeaderboard />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
