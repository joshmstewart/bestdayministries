import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import kawaiiBat from "@/assets/stickers/halloween/04-happy-bat.png";
import { ScratchCardDialog } from "./ScratchCardDialog";

export const DailyScratchCard = () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Check if card exists for today
      let { data: existingCard, error: cardError } = await supabase
        .from('daily_scratch_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      // If no card exists, generate one
      if (cardError && cardError.code === 'PGRST116') {
        const { data: newCard, error: genError } = await supabase
          .rpc('generate_daily_scratch_card', { _user_id: user.id });

        if (genError) {
          console.error('Error generating card:', genError);
          setError('No active sticker collection found. Please contact an admin.');
          return;
        }

        if (newCard) {
          // Fetch the newly created card
          const { data: fetchedCard } = await supabase
            .from('daily_scratch_cards')
            .select('*')
            .eq('id', newCard)
            .single();

          existingCard = fetchedCard;
        }
      }

      setCard(existingCard);

      // Get a random sample sticker from the active collection
      if (existingCard) {
        const { data: stickers } = await supabase
          .from('stickers')
          .select('image_url')
          .eq('collection_id', existingCard.collection_id)
          .eq('is_active', true)
          .limit(1);

        if (stickers && stickers.length > 0) {
          setSampleSticker(stickers[0].image_url);
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
    <>
      {/* Small sticker button */}
      <button
        onClick={() => !card.is_scratched && !isExpired && setShowDialog(true)}
        disabled={card.is_scratched || isExpired}
        className="relative transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 bg-transparent"
        style={{ 
          filter: card.is_scratched || isExpired ? 'grayscale(100%)' : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))'
        }}
      >
        {/* Use kawaii bat sticker with transparent background */}
        <div className="relative w-20 h-20 bg-transparent">
          <img
            src={kawaiiBat}
            alt="Daily sticker"
            className="w-full h-full object-contain bg-transparent"
            style={{ imageRendering: 'crisp-edges' }}
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

      <ScratchCardDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        cardId={card.id}
        onScratched={checkDailyCard}
      />
    </>
  );
};