import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
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
      {/* Floating sticker button in bottom-right corner */}
      <button
        onClick={() => !card.is_scratched && !isExpired && setShowDialog(true)}
        disabled={card.is_scratched || isExpired}
        className="fixed bottom-6 right-6 z-50 transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 group"
        style={{ 
          filter: card.is_scratched || isExpired ? 'grayscale(100%) opacity(0.5)' : 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))'
        }}
      >
        {sampleSticker && (
          <div className="relative">
            {/* Actual sticker image with transparent background */}
            <img
              src={sampleSticker}
              alt="Daily sticker"
              className="w-24 h-24 object-contain transition-transform"
            />
            
            {/* Pulsing ring indicator for unscratched cards */}
            {!card.is_scratched && !isExpired && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full bg-primary/20 animate-ping" />
              </div>
            )}
            
            {/* Status indicator */}
            {card.is_scratched ? (
              <div className="absolute -top-2 -right-2 bg-muted text-muted-foreground rounded-full p-1.5 shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            ) : !isExpired && (
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg animate-bounce">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
          </div>
        )}
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