import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const rarityColors = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
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
  const [todayCardCount, setTodayCardCount] = useState<number>(0);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection) {
      fetchStickers();
      // Update rarity percentages when collection changes
      const collection = collections.find(c => c.id === selectedCollection);
      if (collection) {
        setRarityPercentages(collection.rarity_percentages || {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1
        });
      }
    }
  }, [selectedCollection, collections]);

  const fetchCollections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('sticker_collections')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (!error && data && data.length > 0) {
      setCollections(data);
      setSelectedCollection(data[0].id);
      // Set rarity percentages from the first collection
      setRarityPercentages(data[0].rarity_percentages || {
        common: 50,
        uncommon: 30,
        rare: 15,
        epic: 4,
        legendary: 1
      });
    }
  };

  const fetchStickers = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get coin balance and today's card count
    const { data: profile } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', user.id)
      .single();
    
    setCoinBalance(profile?.coin_balance || 0);

    const today = new Date().toISOString().split('T')[0];
    const { data: cards } = await supabase
      .from('daily_scratch_cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today);
    
    setTodayCardCount(cards?.length || 0);

    // Fetch all stickers in collection
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers')
      .select('*')
      .eq('collection_id', selectedCollection)
      .eq('is_active', true)
      .order('sticker_number');

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

    setAllStickers(stickers || []);
    
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
      const { data, error } = await supabase.functions.invoke('purchase-bonus-card');
      
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
        description: "Bonus scratch card purchased! Go to the community page to scratch it. 🎉"
      });

      // Refresh to update card count
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

  const obtainedCount = Array.from(userStickers.keys()).length;
  const totalCount = allStickers.length;
  const progress = totalCount > 0 ? (obtainedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sticker Collection</CardTitle>
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

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by Rarity:</span>
            <Select value={filterRarity} onValueChange={setFilterRarity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rarity Drop Rates */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Drop Rate Information:</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-500"></div>
                <span className="text-muted-foreground">Common: {rarityPercentages.common}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-muted-foreground">Uncommon: {rarityPercentages.uncommon}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-muted-foreground">Rare: {rarityPercentages.rare}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-muted-foreground">Epic: {rarityPercentages.epic}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500"></div>
                <span className="text-muted-foreground">Legendary: {rarityPercentages.legendary}%</span>
              </div>
            </div>
          </div>

          {/* Buy Bonus Card Button */}
          {todayCardCount > 0 && todayCardCount < 2 && (
            <div className="pt-4 border-t">
              <Button
                onClick={purchaseBonusCard}
                disabled={purchasing || coinBalance < 50}
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
                    <Coins className="w-4 h-4 mr-2" />
                    Buy Another Card Today (50 coins)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {coinBalance < 50 
                  ? `Need ${50 - coinBalance} more coins` 
                  : `You have ${coinBalance} coins • ${2 - todayCardCount} cards left today`
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

          return (
            <Card 
              key={sticker.id} 
              className={`relative overflow-hidden ${obtained ? 'border-primary' : 'border-dashed opacity-60'}`}
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
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium truncate">
                      #{sticker.sticker_number}
                    </span>
                    <Badge 
                      className={`text-xs ${rarityColors[sticker.rarity as keyof typeof rarityColors]}`}
                    >
                      {sticker.rarity.charAt(0).toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {obtained ? sticker.name : "???"}
                  </p>
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
    </div>
  );
};