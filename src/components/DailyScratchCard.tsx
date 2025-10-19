import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Coins } from "lucide-react";
import kawaiiBat from "@/assets/stickers/halloween/04-happy-bat.png";
import { ScratchCardDialog } from "./ScratchCardDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const DailyScratchCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [card, setCard] = useState<any>(null);
  const [bonusCard, setBonusCard] = useState<any>(null);
  const [sampleSticker, setSampleSticker] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string>("");
  const [coinBalance, setCoinBalance] = useState<number>(0);

  // Helper function to get current date in MST (UTC-7)
  const getMSTDate = () => {
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    return mstTime;
  };

  useEffect(() => {
    console.log('🎯 COMPONENT: DailyScratchCard mounting');
    console.log('🎯 COMPONENT: location.key =', location.key);
    
    checkDailyCard();

    // Set up realtime subscription with proper user ID
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ REALTIME: No user found, skipping subscription');
        return;
      }

      console.log('🔔 REALTIME: Setting up subscription for user:', user.id);
      
      const channel = supabase
        .channel('daily_scratch_cards_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'daily_scratch_cards',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('✅ REALTIME: Card changed, refreshing...', payload);
          checkDailyCard();
        })
        .subscribe((status) => {
          console.log('🔔 REALTIME: Subscription status:', status);
        });

      return () => {
        console.log('🔔 REALTIME: Cleaning up subscription');
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtime();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [location.key]); // Refetch whenever navigation occurs

  const checkDailyCard = async () => {
    console.log('📋 CHECK_DAILY_CARD: Starting...');
    
    try {
      console.log('📋 CHECK: Getting current user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('📋 CHECK: User ID:', user?.id);
      
      if (!user) {
        console.log('❌ CHECK: No user found');
        setLoading(false);
        return;
      }

      console.log('📋 CHECK: Calculating MST date...');
      const mstDate = getMSTDate();
      const today = mstDate.toISOString().split('T')[0];
      console.log('📋 CHECK: MST Date:', today, '| Full MST:', mstDate.toISOString());

      // Batch all initial queries together for faster loading
      console.log('📋 CHECK: Fetching all data in parallel...');
      const [
        { data: settings },
        { data: profile },
        { data: activeCollections, error: collectionError },
        { data: existingCard, error: cardError },
        { data: existingBonusCards }
      ] = await Promise.all([
        supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'stickers_enabled')
          .single(),
        supabase
          .from('profiles')
          .select('coins')
          .eq('id', user.id)
          .single(),
        supabase
          .from('sticker_collections')
          .select('id, visible_to_roles')
          .eq('is_active', true),
        supabase
          .from('daily_scratch_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', false)
          .maybeSingle(),
        supabase
          .from('daily_scratch_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', true)
          .eq('is_scratched', false)
          .order('purchase_number', { ascending: true })
      ]);

      console.log('📋 CHECK: Parallel fetch complete');

      if (!settings || settings.setting_value === false) {
        console.log('❌ CHECK: Stickers disabled in settings');
        setLoading(false);
        return;
      }
      
      console.log('📋 CHECK: Coin balance:', profile?.coins);
      setCoinBalance(profile?.coins || 0);

      console.log('📋 CHECK: Active collections result:', { 
        count: activeCollections?.length || 0, 
        collections: activeCollections,
        error: collectionError 
      });

      if (collectionError || !activeCollections || activeCollections.length === 0) {
        console.log('❌ CHECK: No accessible sticker collections');
        setLoading(false);
        return;
      }

      console.log('📋 CHECK: Free card result:', {
        exists: !!existingCard,
        isScratched: existingCard?.is_scratched,
        card: existingCard,
        error: cardError
      });

      console.log('📋 CHECK: Bonus cards result:', {
        count: existingBonusCards?.length || 0,
        cards: existingBonusCards
      });

      let cardToUse = existingCard;

      if (!cardToUse) {
        console.log('📋 CHECK: No free card found, generating new one...');
        const { data: newCard, error: genError } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        console.log('📋 CHECK: Generate card result:', { newCard, error: genError });

        if (genError) {
          console.error('❌ CHECK: Error generating card:', genError);
          setError('No active sticker collection found. Please contact an admin.');
          setLoading(false);
          return;
        }

        if (newCard) {
          const { data: fetchedCard } = await supabase
            .from('daily_scratch_cards')
            .select('*')
            .eq('id', newCard)
            .maybeSingle();
          console.log('📋 CHECK: Fetched newly generated card:', fetchedCard);
          cardToUse = fetchedCard;
        }
      }

      if (!cardToUse) {
        console.log('❌ CHECK: No scratch card available after generation');
        setLoading(false);
        return;
      }

      const shouldShowBonusCard = cardToUse.is_scratched && existingBonusCards && existingBonusCards.length > 0;
      console.log('📋 CHECK: Display logic:', {
        freeCardScratched: cardToUse.is_scratched,
        hasBonusCards: existingBonusCards?.length > 0,
        shouldShowBonusCard,
        activeCard: shouldShowBonusCard ? existingBonusCards[0] : cardToUse
      });

      console.log('📋 CHECK: Setting card state...');
      setCard(cardToUse);
      setBonusCard(existingBonusCards?.[0] || null);

      // Fetch preview sticker asynchronously (don't block rendering)
      console.log('📋 CHECK: Fetching preview sticker in background...');
      if (cardToUse) {
        // Don't await - let this happen in the background
        (async () => {
          const [
            { data: collection },
            { data: fallbackStickers }
          ] = await Promise.all([
            supabase
              .from('sticker_collections')
              .select('preview_sticker_id')
              .eq('id', cardToUse.collection_id)
              .single(),
            supabase
              .from('stickers')
              .select('image_url')
              .eq('collection_id', cardToUse.collection_id)
              .eq('is_active', true)
              .limit(1)
          ]);
          
          console.log('📋 CHECK: Collection preview sticker ID:', collection?.preview_sticker_id);
          
          let stickerImageUrl = null;
          
          if (collection?.preview_sticker_id) {
            const { data: previewSticker } = await supabase
              .from('stickers')
              .select('image_url')
              .eq('id', collection.preview_sticker_id)
              .single();
            
            stickerImageUrl = previewSticker?.image_url;
            console.log('📋 CHECK: Preview sticker URL:', stickerImageUrl);
          }
          
          if (!stickerImageUrl && fallbackStickers && fallbackStickers.length > 0) {
            stickerImageUrl = fallbackStickers[0].image_url;
            console.log('📋 CHECK: Fallback sticker URL:', stickerImageUrl);
          }
          
          if (stickerImageUrl) {
            setSampleSticker(stickerImageUrl);
          }
        })();
      }
    } catch (error) {
      console.error('❌ CHECK_DAILY_CARD: Error:', error);
    } finally {
      console.log('📋 CHECK_DAILY_CARD: Complete');
      setLoading(false);
    }
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
        description: "Bonus scratch card purchased! 🎉"
      });

      // Force immediate refresh with a small delay to ensure DB has committed
      setTimeout(() => {
        checkDailyCard();
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

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-muted rounded-lg">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  // Determine which card to show - prioritize unscratched cards
  const shouldShowBonusCard = card.is_scratched && bonusCard && !bonusCard.is_scratched;
  const activeCard = shouldShowBonusCard ? bonusCard : card;
  const isActiveCardScratched = activeCard.is_scratched;
  const isBonus = shouldShowBonusCard;
  const isExpired = new Date(activeCard.expires_at) < new Date();

  return (
    <div className="space-y-2">
      {/* Single sticker button - shows either daily or bonus card */}
      <button
        onClick={() => {
          if (!isActiveCardScratched && !isExpired) {
            if (isBonus) {
              setShowBonusDialog(true);
            } else {
              setShowDialog(true);
            }
          } else {
            navigate('/sticker-album');
          }
        }}
        className="relative transition-all hover:scale-110 active:scale-95"
        style={{ 
          filter: isActiveCardScratched || isExpired ? 'grayscale(100%)' : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
          background: 'transparent'
        }}
      >
        {/* Use preview sticker or fallback to kawaii bat */}
        <div className="relative w-20 h-20" style={{ background: 'transparent' }}>
          <img
            src={sampleSticker || kawaiiBat}
            alt={isBonus ? "Bonus sticker" : "Daily sticker"}
            className="w-full h-full object-contain"
            style={{ background: 'transparent' }}
          />
          
          {/* Status indicator */}
          {isActiveCardScratched ? (
            <div className="absolute -bottom-1 -right-1 bg-muted text-muted-foreground rounded-full p-1 shadow-lg border-2 border-background">
              <Check className="w-3 h-3" />
            </div>
          ) : !isExpired && (
            <div className={`absolute -bottom-1 -right-1 rounded-full p-1 shadow-lg animate-bounce border-2 border-background ${
              isBonus ? 'bg-yellow-500 text-white' : 'bg-primary text-primary-foreground'
            }`}>
              <Sparkles className="w-3 h-3" />
            </div>
          )}
        </div>
      </button>

      {/* Explanation text */}
      <div className="text-xs text-center text-muted-foreground max-w-[120px]">
        {!card.is_scratched && <span>Scratch daily!</span>}
        {card.is_scratched && bonusCard && !bonusCard.is_scratched && <span>Scratch bonus!</span>}
      </div>

      {/* Free card dialog */}
      <ScratchCardDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        cardId={card.id}
        onScratched={checkDailyCard}
      />

      {/* Bonus card dialog */}
      {bonusCard && (
        <ScratchCardDialog
          open={showBonusDialog}
          onOpenChange={setShowBonusDialog}
          cardId={bonusCard.id}
          onScratched={checkDailyCard}
        />
      )}
    </div>
  );
};