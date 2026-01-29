import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Clock, Sparkles, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CoinIcon } from "@/components/CoinIcon";
import { PackOpeningDialog } from "./PackOpeningDialog";
import { CollectionSelectorDialog } from "./CollectionSelectorDialog";
import { TextToSpeech } from "./TextToSpeech";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const rarityColors = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

const rarityNames = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary"
};

export const StickerAlbum = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [allStickers, setAllStickers] = useState<any[]>([]);
  const [userStickers, setUserStickers] = useState<Map<string, any>>(new Map());
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [rarityPercentages, setRarityPercentages] = useState<any>({
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1
  });
  const [purchasing, setPurchasing] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [availableCards, setAvailableCards] = useState<any[]>([]);
  const [bonusCardCount, setBonusCardCount] = useState<number>(0);
  const [bonusPacksEnabled, setBonusPacksEnabled] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [nextCost, setNextCost] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(50);
  const [timeUntilNext, setTimeUntilNext] = useState<string>("");
  const [showScratchDialog, setShowScratchDialog] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<any | null>(null);
  const [selectedPackCollectionId, setSelectedPackCollectionId] = useState<string | null>(null);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);

  // Helper function to get current time in MST (UTC-7)
  const getMSTDate = () => {
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    return mstTime;
  };

  const getMSTMidnight = () => {
    const mstNow = getMSTDate();
    // Get tomorrow at midnight MST
    const midnight = new Date(mstNow);
    midnight.setHours(24, 0, 0, 0); // Use setHours (local) not setUTCHours
    return midnight;
  };

  useEffect(() => {
    fetchCollections();
    loadBaseCost();
    loadBonusPacksSetting();
    loadUserRole();

    // Update countdown every second
    const interval = setInterval(() => {
      const now = getMSTDate();
      const midnight = getMSTMidnight();
      const diff = midnight.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilNext("Refresh to get your new card!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilNext(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadBaseCost = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_card_base_cost')
      .maybeSingle();
    
    if (data?.setting_value) {
      setBaseCost(Number(data.setting_value));
    }
  };

  const loadBonusPacksSetting = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_packs_enabled')
      .maybeSingle();
    
    const isEnabled = data?.setting_value !== false;

    // Check role visibility
    const { data: rolesData } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_packs_visible_to_roles')
      .maybeSingle();
    
    const visibleRoles = rolesData?.setting_value as string[] || ["admin", "owner"];
    
    // Only enable if both the feature is on AND user has the right role
    const canSee = userRole && visibleRoles.includes(userRole);
    setBonusPacksEnabled(isEnabled && canSee);
  };

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data?.role) {
      setUserRole(data.role);
    }
  };

  // Re-check bonus packs visibility when user role changes
  useEffect(() => {
    if (userRole) {
      loadBonusPacksSetting();
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedCollection) {
      fetchStickers();
      loadRarityPercentages();
    }
  }, [selectedCollection, collections]);

  const loadRarityPercentages = async () => {
    const collection = collections.find(c => c.id === selectedCollection);
    if (!collection) return;

    // If collection uses default rarity, fetch from app_settings
    if (collection.use_default_rarity) {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'default_rarity_percentages')
        .maybeSingle();
      
      if (data?.setting_value) {
        setRarityPercentages(data.setting_value as any);
      }
    } else {
      setRarityPercentages(collection.rarity_percentages || {
        common: 50,
        uncommon: 30,
        rare: 15,
        epic: 4,
        legendary: 1
      });
    }
  };

  // Recalculate cost when base cost changes
  useEffect(() => {
    if (baseCost) {
      setNextCost(baseCost * Math.pow(2, bonusCardCount));
    }
  }, [baseCost, bonusCardCount]);

  // Realtime subscription for new stickers
  useEffect(() => {
    if (!selectedCollection) return;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('user_stickers_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_stickers',
            filter: `collection_id=eq.${selectedCollection}`
          },
          () => {
            // Refresh stickers when any change occurs
            fetchStickers();
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any;
    setupRealtime().then(ch => { channel = ch; });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedCollection]);

  const fetchCollections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('sticker_collections')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }); // Latest first for pack display

    if (error) {
      console.error('Error fetching collections:', error);
    }

    if (!error && data && data.length > 0) {
      setCollections(data);
      
      // Prioritize featured collection, then fall back to first by display_order
      const featuredCollection = data.find(c => c.is_featured === true);
      const defaultCollection = featuredCollection || data[0];
      
      setSelectedCollection(defaultCollection.id);
      // Rarity percentages will be loaded in the useEffect
    }
  };

  const fetchStickers = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get coin balance and today's card count
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();
    
    setCoinBalance(profile?.coins || 0);

    // Calculate MST date (same as edge function)
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    const today = mstTime.toISOString().split('T')[0];
    
    // Get all cards for today (unopened ones) with collection info for pack images
    const { data: cards } = await supabase
      .from('daily_scratch_cards')
      .select(`
        *,
        collection:sticker_collections!inner(
          id,
          name,
          pack_image_url
        )
      `)
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('is_scratched', false)
      .order('is_bonus_card', { ascending: true });
    
    setAvailableCards(cards || []);

    // Count bonus cards purchased today
    const { count: bonusCount } = await supabase
      .from('daily_scratch_cards')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('is_bonus_card', true);
    
    const count = bonusCount || 0;
    setBonusCardCount(count);
    // Calculate next cost using base cost from settings
    setNextCost(baseCost * Math.pow(2, count));

    // Rarity order for sorting: Common → Uncommon → Rare → Epic → Legendary
    const rarityOrder: Record<string, number> = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5
    };

    // Fetch all stickers in collection
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', selectedCollection)
      .eq('is_active', true);
    
    // Sort by rarity order, then by sticker_number within same rarity
    const sortedStickers = (stickers || []).sort((a, b) => {
      const rarityDiff = (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
      if (rarityDiff !== 0) return rarityDiff;
      return (a.sticker_number || 0) - (b.sticker_number || 0);
    });

    if (stickersError) {
      console.error('Error fetching stickers:', stickersError);
      setLoading(false);
      return;
    }

    // Fetch user's obtained stickers
    const { data: obtained, error: obtainedError } = await supabase
      .from('user_stickers')
      .select('*, stickers(*)')
      .eq('user_id', user.id)
      .eq('collection_id', selectedCollection);

    if (obtainedError) {
      console.error('Error fetching user stickers:', obtainedError);
    }

    setAllStickers(sortedStickers);
    
    const userStickerMap = new Map();
    obtained?.forEach((item) => {
      userStickerMap.set(item.sticker_id, item);
    });
    setUserStickers(userStickerMap);

    setLoading(false);
  };

  const purchaseBonusCard = async () => {
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('purchase-bonus-card', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast({
          title: "Cannot Purchase",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success!",
        description: `Bonus pack purchased for ${data.cost} coins! 🎉`
      });

      // Refresh to show new card and update costs
      await fetchStickers();
    } catch (error: any) {
      console.error('Error purchasing bonus card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase bonus card",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  const filteredStickers = filterRarity === "all"
    ? allStickers
    : allStickers.filter(s => s.rarity === filterRarity);

  // Only count stickers that actually exist in this collection (prevents mismatched collection_id data)
  const allStickerIds = new Set(allStickers.map(s => s.id));
  const obtainedCount = Array.from(userStickers.keys()).filter(id => allStickerIds.has(id)).length;
  const totalCount = allStickers.length;
  const progress = totalCount > 0 ? (obtainedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleCardScratched = async () => {
    setShowScratchDialog(false);
    setSelectedCardId(null);
    await fetchStickers();
  };

  const handleBonusPurchase = async () => {
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('purchase-bonus-card', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast({
          title: "Cannot Purchase",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success!",
        description: `Bonus pack purchased for ${data.cost} coins! 🎉`
      });

      // Update bonus card count and cost directly to prevent recalculation
      setBonusCardCount(data.purchaseCount);
      setNextCost(data.nextCost);

      // Refresh to get the new card without recalculating cost
      if (!session?.user) return;

      // Get coin balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', session.user.id)
        .single();
      
      setCoinBalance(profile?.coins || 0);

      const today = new Date().toISOString().split('T')[0];
      
      // Get all cards for today (unopened ones) with collection info for pack images
      const { data: cards } = await supabase
        .from('daily_scratch_cards')
        .select(`
          *,
          collection:sticker_collections!inner(
            id,
            name,
            pack_image_url
          )
        `)
        .eq('user_id', session.user.id)
        .eq('date', today)
        .eq('is_scratched', false)
        .order('is_bonus_card', { ascending: true });
      
      setAvailableCards(cards || []);

      // Refresh stickers without touching bonus count/cost
      const { data: stickers } = await supabase
        .from('stickers')
        .select('*')
        .eq('collection_id', selectedCollection)
        .eq('is_active', true);

      // Apply rarity sorting (same as initial load)
      const rarityOrder: Record<string, number> = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5
      };

      const sortedStickers = (stickers || []).sort((a, b) => {
        const rarityDiff = (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
        if (rarityDiff !== 0) return rarityDiff;
        return (a.sticker_number || 0) - (b.sticker_number || 0);
      });

      const { data: obtained } = await supabase
        .from('user_stickers')
        .select('*, stickers(*)')
        .eq('user_id', session.user.id)
        .eq('collection_id', selectedCollection);

      setAllStickers(sortedStickers);
      
      const userStickerMap = new Map();
      obtained?.forEach((item) => {
        userStickerMap.set(item.sticker_id, item);
      });
      setUserStickers(userStickerMap);
      
      // Auto-open the new card after a short delay
      setTimeout(() => {
        if (data.cardId) {
          setSelectedCardId(data.cardId);
          setShowScratchDialog(true);
        }
      }, 500);
    } catch (error: any) {
      console.error('Error purchasing bonus card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase bonus card",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Available Packs - Show 3 latest collections */}
      {availableCards.length > 0 && collections.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Available Packs
            </CardTitle>
          </CardHeader>
        <CardContent>
            <div className="flex flex-wrap justify-center gap-4">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    // Use the next available card (don't require matching collection_id)
                    const cardToUse = availableCards[0];
                    if (cardToUse) {
                      setSelectedCardId(cardToUse.id);
                      setSelectedPackCollectionId(collection.id);
                      setShowScratchDialog(true);
                    }
                  }}
                  className="relative group transition-all focus:outline-none hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <div className="relative w-32 h-48 sm:w-40 sm:h-56">
                    {collection.pack_image_url ? (
                      <img
                        src={collection.pack_image_url}
                        alt={collection.name || 'Sticker Pack'}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-primary" />
                      </div>
                    )}
                    {/* Featured badge */}
                    {collection.is_featured && (
                      <div className="absolute top-1 right-1 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        ★
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Tap a pack to open it! ({availableCards.length} card{availableCards.length !== 1 ? 's' : ''} available)
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Sticker Collection</CardTitle>
              {timeUntilNext && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Next daily card: {timeUntilNext}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 whitespace-nowrap">
                    See rarities
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Drop Rate Information</p>
                      {collections.find(c => c.id === selectedCollection)?.use_default_rarity && (
                        <Badge variant="outline" className="text-xs">Using Defaults</Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-500"></div>
                        <span>Common</span>
                        <span className="ml-auto text-muted-foreground">{rarityPercentages.common}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Uncommon</span>
                        <span className="ml-auto text-muted-foreground">{rarityPercentages.uncommon}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500"></div>
                        <span>Rare</span>
                        <span className="ml-auto text-muted-foreground">{rarityPercentages.rare}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        <span>Epic</span>
                        <span className="ml-auto text-muted-foreground">{rarityPercentages.epic}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500"></div>
                        <span>Legendary</span>
                        <span className="ml-auto text-muted-foreground">{rarityPercentages.legendary}%</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Collection Progress</span>
              <span className="text-sm text-muted-foreground">
                {obtainedCount} / {totalCount}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Buy Bonus Card Button */}
          {bonusPacksEnabled && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleBonusPurchase}
                disabled={purchasing || coinBalance < nextCost}
                className="w-full"
                size="lg"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <CoinIcon className="mr-2" size={20} />
                    Buy Bonus Sticker ({nextCost} coins)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {coinBalance < nextCost 
                  ? `Need ${nextCost - coinBalance} more coins` 
                  : "Price doubles each time"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredStickers.map((sticker) => {
          const userSticker = userStickers.get(sticker.id);
          const obtained = !!userSticker;
          
          // Calculate actual drop rate: tier percentage / number of stickers in that tier
          const stickersInRarity = allStickers.filter(s => s.rarity === sticker.rarity).length;
          const tierPercentage = rarityPercentages[sticker.rarity] || 0;
          const actualDropRate = stickersInRarity > 0 
            ? (tierPercentage / stickersInRarity).toFixed(2)
            : 0;

          return (
            <Card 
              key={sticker.id}
              className={`relative overflow-hidden transition-all hover:scale-105 cursor-pointer group ${
                obtained ? 'border-primary' : 'border-dashed opacity-70'
              }`}
              onClick={() => setSelectedSticker({ ...sticker, obtained, userSticker, actualDropRate })}
            >
              <CardContent className="p-4">
                <div className="relative aspect-square mb-2">
                  {obtained ? (
                    <>
                      <img
                        src={sticker.image_url}
                        alt={sticker.name}
                        className="w-full h-full object-contain"
                      />
                      {userSticker.quantity > 1 && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-1 right-1"
                        >
                          x{userSticker.quantity}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded overflow-hidden relative">
                      {/* Show sticker silhouette with better visibility */}
                      <img
                        src={sticker.image_url}
                        alt="???"
                        className="w-full h-full object-contain opacity-20 grayscale"
                        style={{
                          filter: "brightness(0.5) contrast(1.5)"
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                        <Lock className="w-8 h-8 text-muted-foreground z-10" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info - always visible, enhanced text on hover */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium">
                      #{sticker.sticker_number}
                    </span>
                    <Badge 
                      className={`text-xs transition-all ${rarityColors[sticker.rarity as keyof typeof rarityColors]}`}
                    >
                      <span className="group-hover:hidden">
                        {sticker.rarity.charAt(0).toUpperCase()}
                      </span>
                      <span className="hidden group-hover:inline">
                        {rarityNames[sticker.rarity as keyof typeof rarityNames]}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-medium truncate">
                      {sticker.name}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {actualDropRate}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {obtainedCount === totalCount && totalCount > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6 text-center">
            <p className="text-xl font-bold mb-2">🎉 Collection Complete! 🎉</p>
            <p className="text-muted-foreground">
              You've collected all {totalCount} stickers in this collection!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pack Opening Dialog */}
      {selectedCardId && (
        <PackOpeningDialog
          open={showScratchDialog}
          onOpenChange={setShowScratchDialog}
          cardId={selectedCardId}
          collectionId={selectedPackCollectionId ?? undefined}
          onOpened={handleCardScratched}
          onChangeCollection={() => {
            setShowScratchDialog(false);
            setShowCollectionSelector(true);
          }}
        />
      )}
      
      {/* Collection Selector Dialog for Change Pack */}
      <CollectionSelectorDialog
        open={showCollectionSelector}
        onOpenChange={setShowCollectionSelector}
        onSelectCollection={(collectionId) => {
          setSelectedPackCollectionId(collectionId);
          setShowCollectionSelector(false);
          setShowScratchDialog(true);
        }}
      />

      {/* Sticker Detail Dialog */}
      <Dialog open={!!selectedSticker} onOpenChange={(open) => !open && setSelectedSticker(null)}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogHeader className="flex flex-row items-center gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span>#{selectedSticker?.sticker_number}</span>
                <span>{selectedSticker?.name}</span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Details for sticker {selectedSticker?.name}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedSticker && (
                <TextToSpeech 
                  text={`${selectedSticker.name}. ${rarityNames[selectedSticker.rarity as keyof typeof rarityNames]} rarity. ${selectedSticker.obtained ? `Collected${selectedSticker.userSticker?.quantity > 1 ? `, you have ${selectedSticker.userSticker.quantity}` : ''}` : 'Not yet collected'}. ${selectedSticker.description || ''}. Drop rate: ${selectedSticker.actualDropRate} percent.${selectedSticker.obtained && selectedSticker.userSticker?.first_obtained_at ? ` First obtained on ${new Date(selectedSticker.userSticker.first_obtained_at).toLocaleDateString()}.` : ''}`} 
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSticker(null)}
                className="hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          {selectedSticker && (
            <div className="space-y-4">
              {/* Large sticker image */}
              <div className="relative aspect-square bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
                {selectedSticker.obtained ? (
                  <img
                    src={selectedSticker.image_url}
                    alt={selectedSticker.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={selectedSticker.image_url}
                      alt="???"
                      className="w-full h-full object-contain p-4 opacity-20 grayscale"
                      style={{ filter: "brightness(0.5) contrast(1.5)" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-16 h-16 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                {/* Rarity & Status */}
                <div className="flex items-center justify-between">
                  <Badge className={`${rarityColors[selectedSticker.rarity as keyof typeof rarityColors]}`}>
                    {rarityNames[selectedSticker.rarity as keyof typeof rarityNames]}
                  </Badge>
                  {selectedSticker.obtained ? (
                    <Badge variant="default" className="bg-green-600">
                      Collected {selectedSticker.userSticker?.quantity > 1 ? `(x${selectedSticker.userSticker.quantity})` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not Collected</Badge>
                  )}
                </div>

                {/* Description */}
                {selectedSticker.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedSticker.description}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Drop Rate</p>
                    <p className="text-sm font-medium">{selectedSticker.actualDropRate}%</p>
                  </div>
                  {selectedSticker.obtained && selectedSticker.userSticker?.first_obtained_at && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">First Obtained</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedSticker.userSticker.first_obtained_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Collection selector dialog for viewing all packs */}
      <CollectionSelectorDialog
        open={showCollectionSelector}
        onOpenChange={setShowCollectionSelector}
        onSelectCollection={(collectionId) => {
          setSelectedPackCollectionId(collectionId);
          if (availableCards.length > 0) {
            setSelectedCardId(availableCards[0].id);
            setShowScratchDialog(true);
          }
          setShowCollectionSelector(false);
        }}
        isDailyPack={true}
      />
    </div>
  );
};