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
      <div className="relative group">
        <Button
          onClick={() => !card.is_scratched && !isExpired && setShowDialog(true)}
          disabled={card.is_scratched || isExpired}
          className="relative h-auto p-0 overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          style={{
            width: "280px",
            height: "320px",
            background: card.is_scratched 
              ? "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)",
          }}
        >
          {/* Sticker-shaped background */}
          <div className="absolute inset-0 flex items-center justify-center">
            {sampleSticker && !card.is_scratched && (
              <img
                src={sampleSticker}
                alt="Sample sticker"
                className="w-40 h-40 object-contain opacity-30 animate-pulse"
              />
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-white">
            {card.is_scratched ? (
              <>
                <Check className="w-16 h-16 mb-4" />
                <div className="text-2xl font-bold text-center">Scratched!</div>
                <div className="text-sm mt-2 opacity-80">Come back tomorrow</div>
              </>
            ) : isExpired ? (
              <>
                <div className="text-2xl font-bold text-center">Expired</div>
                <div className="text-sm mt-2 opacity-80">Come back tomorrow</div>
              </>
            ) : (
              <>
                <Sparkles className="w-16 h-16 mb-4 animate-pulse" />
                <div className="text-3xl font-bold text-center mb-2">Today's Sticker!</div>
                <div className="text-sm opacity-90">Scratch to reveal</div>
                
                {/* Animated peel corner effect */}
                <div className="absolute top-2 right-2 w-12 h-12">
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                  <div className="absolute inset-2 bg-white/40 rounded-full" />
                </div>
              </>
            )}
          </div>

          {/* Shine effect */}
          {!card.is_scratched && !isExpired && (
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </Button>
      </div>

      <ScratchCardDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        cardId={card.id}
        onScratched={checkDailyCard}
      />
    </>
  );
};