import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Coins } from "lucide-react";
import { PackOpeningDialog } from "./PackOpeningDialog";
import { CollectionSelectorDialog } from "./CollectionSelectorDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const DailyScratchCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [card, setCard] = useState<any>(null);
  const [bonusCard, setBonusCard] = useState<any>(null);
  const [sampleSticker, setSampleSticker] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [showBonusDialog, setShowBonusDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string>("");
  const [bonusPacksEnabled, setBonusPacksEnabled] = useState(true);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Helper function to get current date in MST (UTC-7)
  const getMSTDate = () => {
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utc + (mstOffset * 60000));
    return mstTime;
  };

  useEffect(() => {
    // Wait for auth to finish loading before checking card status
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setLoading(false);
      return;
    }
    
    checkDailyCard();
    loadBonusPacksSetting();

    // Set up realtime subscription with user ID from context
    const channel = supabase
      .channel('daily_scratch_cards_changes')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'daily_scratch_cards',
        filter: `user_id=eq.${user.id}`
      }, () => {
        setCard(null);
        setBonusCard(null);
        setSampleSticker("");
        setLoading(true);
        checkDailyCard();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'daily_scratch_cards',
        filter: `user_id=eq.${user.id}`
      }, () => {
        checkDailyCard();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_scratch_cards',
        filter: `user_id=eq.${user.id}`
      }, () => {
        checkDailyCard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, location.key, authLoading]); // Refetch whenever navigation occurs or user changes

  const checkDailyCard = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const mstDate = getMSTDate();
      const today = mstDate.toISOString().split('T')[0];

      // Batch all initial queries together for faster loading
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
          .select(`
            *,
            collection:sticker_collections!inner(
              id,
              name,
              preview_sticker_id,
              preview_sticker:stickers!preview_sticker_id(image_url)
            )
          `)
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

      if (!settings || settings.setting_value === false) {
        setLoading(false);
        return;
      }
      
      setCoinBalance(profile?.coins || 0);

      if (collectionError || !activeCollections || activeCollections.length === 0) {
        setLoading(false);
        return;
      }

      let cardToUse = existingCard;

      if (!cardToUse) {
        const { data: newCard, error: genError } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        if (genError) {
          console.error('Error generating card:', genError);
          setError('No active sticker collection found. Please contact an admin.');
          setLoading(false);
          return;
        }

        if (newCard) {
          const { data: fetchedCard } = await supabase
            .from('daily_scratch_cards')
            .select(`
              *,
              collection:sticker_collections!inner(
                id,
                name,
                preview_sticker_id,
                preview_sticker:stickers!preview_sticker_id(image_url)
              )
            `)
            .eq('id', newCard)
            .maybeSingle();
          cardToUse = fetchedCard;
        }
      }

      if (!cardToUse) {
        setLoading(false);
        return;
      }

      const shouldShowBonusCard = cardToUse.is_scratched && existingBonusCards && existingBonusCards.length > 0;

      setCard(cardToUse);
      setBonusCard(existingBonusCards?.[0] || null);

      // Always show the FEATURED collection's preview sticker (not the user's card collection)
      // This ensures the Community page shows the current featured set
      const { data: featuredCollection } = await supabase
        .from('sticker_collections')
        .select(`
          id,
          preview_sticker_id,
          preview_sticker:stickers!preview_sticker_id(image_url)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .single();
      
      if (featuredCollection?.preview_sticker?.image_url) {
        setSampleSticker(featuredCollection.preview_sticker.image_url);
      } else if (cardToUse?.collection?.preview_sticker?.image_url) {
        // Fallback to card's collection preview
        setSampleSticker(cardToUse.collection.preview_sticker.image_url);
      } else if (cardToUse?.collection_id) {
        // Last resort: fetch first sticker if no preview set
        const { data: firstSticker } = await supabase
          .from('stickers')
          .select('id, image_url')
          .eq('collection_id', cardToUse.collection_id)
          .eq('is_active', true)
          .order('display_order')
          .limit(1)
          .single();
        
        if (firstSticker?.image_url) {
          setSampleSticker(firstSticker.image_url);
        }
      }
    } catch (error) {
      console.error('Error checking daily card:', error);
    } finally {
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
        description: "Bonus pack purchased! 🎉"
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
    
    const visibleRoles = rolesData?.setting_value as string[] || ["supporter", "bestie", "caregiver", "admin", "owner"];
    
    // Only enable if both the feature is on AND user has the right role (from AuthContext)
    const canSee = role && visibleRoles.includes(role);
    setBonusPacksEnabled(isEnabled && !!canSee);
  };

  // Re-check bonus packs visibility when user role changes (from AuthContext)
  useEffect(() => {
    if (role) {
      loadBonusPacksSetting();
    }
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
          if (!isActiveCardScratched) {
            if (isBonus) {
              setShowBonusDialog(true);
            } else {
              // Open featured pack directly, but with option to change
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
        {/* Use preview sticker */}
        <div className="relative w-20 h-20" style={{ background: 'transparent' }}>
          <img
            src={sampleSticker || '/placeholder.svg'}
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
        {!card.is_scratched && <span>Open your daily pack!</span>}
        {card.is_scratched && bonusCard && !bonusCard.is_scratched && <span>Scratch bonus to collect more!</span>}
        {card.is_scratched && (!bonusCard || bonusCard.is_scratched) && <span>View your collection</span>}
      </div>

      {/* Daily pack dialog - opens featured collection with option to change */}
      {!card.is_scratched && (
        <PackOpeningDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          cardId={card.id}
          onOpened={checkDailyCard}
          onChangeCollection={() => {
            setShowDialog(false);
            setShowCollectionSelector(true);
          }}
        />
      )}

      {/* Bonus card dialog */}
      {bonusCard && (
        <PackOpeningDialog
          open={showBonusDialog}
          onOpenChange={setShowBonusDialog}
          cardId={bonusCard.id}
          onOpened={checkDailyCard}
          onChangeCollection={() => {
            setShowBonusDialog(false);
            setShowCollectionSelector(true);
          }}
        />
      )}

      {/* Collection selector dialog */}
      <CollectionSelectorDialog
        open={showCollectionSelector}
        onOpenChange={setShowCollectionSelector}
        onSelectCollection={(collectionId) => {
          setSelectedCollectionId(collectionId);
          setShowCollectionSelector(false);
        }}
        isDailyPack={!card.is_scratched}
      />

      {/* Selected collection pack dialog */}
      {selectedCollectionId && (
        <PackOpeningDialog
          open={!!selectedCollectionId}
          onOpenChange={(open) => !open && setSelectedCollectionId(null)}
          cardId={!activeCard.is_scratched ? activeCard.id : null}
          collectionId={selectedCollectionId}
          onOpened={() => {
            setSelectedCollectionId(null);
            checkDailyCard();
          }}
          onChangeCollection={() => {
            setSelectedCollectionId(null);
            setShowCollectionSelector(true);
          }}
        />
      )}
    </div>
  );
};