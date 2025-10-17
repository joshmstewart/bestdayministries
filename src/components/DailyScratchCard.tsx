import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import kawaiiBat from "@/assets/stickers/halloween/04-happy-bat.png";
import { ScratchCardDialog } from "./ScratchCardDialog";
import { useNavigate } from "react-router-dom";

export const DailyScratchCard = () => {
  const navigate = useNavigate();
  const [card, setCard] = useState<any>(null);
  const [sampleSticker, setSampleSticker] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    checkDailyCard();
  }, []);

  const checkDailyCard = async () => {
    try {
      // Check if sticker feature is enabled globally
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'stickers_enabled')
        .single();

      if (!settings || settings.setting_value === false) {
        console.log('DailyScratchCard: Feature disabled globally');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      console.log('DailyScratchCard: Checking for accessible collections...');

      // Check if user has access to any active sticker collections
      // RLS policy will automatically filter based on visible_to_roles
      const { data: activeCollections, error: collectionError } = await supabase
        .from('sticker_collections')
        .select('id, visible_to_roles')
        .eq('is_active', true);

      console.log('DailyScratchCard: Active collections result:', { 
        count: activeCollections?.length || 0, 
        collections: activeCollections,
        error: collectionError 
      });

      // If no collections returned (either none exist or user doesn't have permission), don't show card
      if (collectionError || !activeCollections || activeCollections.length === 0) {
        console.log('DailyScratchCard: No accessible sticker collections - hiding feature');
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Check if card exists for today
      let { data: existingCard, error: cardError } = await supabase
        .from('daily_scratch_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      console.log('DailyScratchCard: Existing card check:', { existingCard, cardError });

      // If no card exists, generate one
      if (!existingCard) {
        const { data: newCard, error: genError } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        if (genError) {
          console.error('Error generating card:', genError);
          setError('No active sticker collection found. Please contact an admin.');
          setLoading(false);
          return;
        }

        if (newCard) {
          // Fetch the newly created card
          const { data: fetchedCard } = await supabase
            .from('daily_scratch_cards')
            .select('*')
            .eq('id', newCard)
            .maybeSingle();

          existingCard = fetchedCard;
        }
      }

      // If still no card after generation attempt, don't show the feature
      if (!existingCard) {
        console.log('No scratch card available for user');
        setLoading(false);
        return;
      }

      setCard(existingCard);

      // Get the preview sticker from the collection, or fallback to any active sticker
      if (existingCard) {
        // First try to get the preview sticker from the collection
        const { data: collection } = await supabase
          .from('sticker_collections')
          .select('preview_sticker_id')
          .eq('id', existingCard.collection_id)
          .single();
        
        let stickerImageUrl = null;
        
        if (collection?.preview_sticker_id) {
          const { data: previewSticker } = await supabase
            .from('stickers')
            .select('image_url')
            .eq('id', collection.preview_sticker_id)
            .single();
          
          stickerImageUrl = previewSticker?.image_url;
        }
        
        // Fallback to any active sticker if no preview is set
        if (!stickerImageUrl) {
          const { data: stickers } = await supabase
            .from('stickers')
            .select('image_url')
            .eq('collection_id', existingCard.collection_id)
            .eq('is_active', true)
            .limit(1);

          if (stickers && stickers.length > 0) {
            stickerImageUrl = stickers[0].image_url;
          }
        }
        
        if (stickerImageUrl) {
          setSampleSticker(stickerImageUrl);
        }
      }
    } catch (error) {
      console.error('Error checking daily card:', error);
    } finally {
      setLoading(false);
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

  const isExpired = new Date(card.expires_at) < new Date();

  return (
    <div className="space-y-2">
      {/* Small sticker button */}
      <button
        onClick={() => {
          if (!card.is_scratched && !isExpired) {
            setShowDialog(true);
          } else {
            navigate('/sticker-album');
          }
        }}
        className="relative transition-all hover:scale-110 active:scale-95"
        style={{ 
          filter: card.is_scratched || isExpired ? 'grayscale(100%)' : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
          background: 'transparent'
        }}
      >
        {/* Use preview sticker or fallback to kawaii bat */}
        <div className="relative w-20 h-20" style={{ background: 'transparent' }}>
          <img
            src={sampleSticker || kawaiiBat}
            alt="Daily sticker"
            className="w-full h-full object-contain"
            style={{ background: 'transparent' }}
          />
          
          {/* Status indicator */}
          {card.is_scratched ? (
            <div className="absolute -bottom-1 -right-1 bg-muted text-muted-foreground rounded-full p-1 shadow-lg border-2 border-background">
              <Check className="w-3 h-3" />
            </div>
          ) : !isExpired && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-lg animate-bounce border-2 border-background">
              <Sparkles className="w-3 h-3" />
            </div>
          )}
        </div>
      </button>

      {/* Explanation */}
      <div className="text-xs text-center text-muted-foreground max-w-[100px]">
        {card.is_scratched ? (
          <span>View your collection</span>
        ) : (
          <span>Scratch daily for a new sticker!</span>
        )}
      </div>

      <ScratchCardDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        cardId={card.id}
        onScratched={checkDailyCard}
      />
    </div>
  );
};