import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Pack3D } from "./Pack3D";

interface PackOpeningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  onScratched: () => void;
}

const rarityColors = {
  common: "from-gray-400 to-gray-600",
  uncommon: "from-green-400 to-green-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-600",
};

export const PackOpeningDialog = ({ open, onOpenChange, cardId, onScratched }: PackOpeningDialogProps) => {
  const { toast } = useToast();
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealedSticker, setRevealedSticker] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [collectionName, setCollectionName] = useState<string>("Sticker Pack");
  const [packImageUrl, setPackImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setOpened(false);
      setRevealedSticker(null);
      setShowConfetti(false);
      setOpening(false);
      loadCollectionInfo();
    }
  }, [open, cardId]);

  const loadCollectionInfo = async () => {
    if (!cardId) return;
    
    setLoading(true);
    try {
      // Get card details to find collection_id
      const { data: card, error: cardError } = await supabase
        .from('daily_scratch_cards')
        .select('collection_id')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      // Get collection details
      const { data: collection, error: collectionError } = await supabase
        .from('sticker_collections')
        .select('name, preview_sticker_id')
        .eq('id', card.collection_id)
        .single();

      if (collectionError) throw collectionError;

      setCollectionName(collection.name);

      // If there's a preview sticker, fetch its image
      if (collection.preview_sticker_id) {
        const { data: sticker } = await supabase
          .from('stickers')
          .select('image_url')
          .eq('id', collection.preview_sticker_id)
          .single();
        
        if (sticker?.image_url) {
          setPackImageUrl(sticker.image_url);
        }
      }
    } catch (error: any) {
      console.error('Error loading collection info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!cardId || opening || opened) return;

    console.log('Opening pack...');
    setOpening(true);
    // Animation happens in Pack3D component
  };

  const handleOpenComplete = () => {
    handleReveal();
  };

  const handleReveal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scratch-daily-card', {
        body: { card_id: cardId },
      });

      if (error) throw error;

      console.log('Card revealed:', data);
      
      // Quick transition to revealed state
      setTimeout(() => {
        setRevealedSticker(data.sticker);
        setOpened(true);
        setShowConfetti(true);
        setOpening(false);

        // Trigger confetti
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#87CEEB']
        });

        // Stop confetti after 3 seconds
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);

        toast({
          title: "Sticker Revealed!",
          description: `You got a ${data.sticker.rarity} sticker!`,
        });
      }, 100);
    } catch (error: any) {
      console.error('Error revealing card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reveal card",
        variant: "destructive",
      });
      setOpening(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && onScratched) {
      onScratched();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {opened ? "Sticker Revealed!" : "Open Your Pack!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {opened 
              ? "Congratulations on your new sticker!" 
              : "Tap the pack to reveal your sticker"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : !opened ? (
            <div 
              className="cursor-pointer w-full"
              onClick={handleOpen}
            >
              <Pack3D 
                isOpening={opening}
                onOpenComplete={handleOpenComplete}
                packImageUrl={packImageUrl}
                collectionName={collectionName}
              />
              <p className="text-center text-lg font-semibold mt-4">{collectionName}</p>
              <p className="text-center text-sm text-muted-foreground">Click the pack to open!</p>
            </div>
          ) : (
            <div className="animate-scale-in">
              {/* Revealed sticker card */}
              <div 
                className={`relative w-64 h-80 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br ${
                  rarityColors[revealedSticker?.rarity as keyof typeof rarityColors] || rarityColors.common
                }`}
              >
                {/* Card shine overlay */}
                <div 
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                    backgroundSize: '200% 200%',
                    animation: 'shine 3s ease-in-out infinite',
                  }}
                />

                <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-white">
                  {revealedSticker?.image_url && (
                    <img 
                      src={revealedSticker.image_url} 
                      alt={revealedSticker.name}
                      className="w-40 h-40 object-contain mb-4 drop-shadow-2xl"
                    />
                  )}
                  <h3 className="text-2xl font-bold text-center mb-2 drop-shadow-lg">
                    {revealedSticker?.name}
                  </h3>
                  <p className="text-center text-sm mb-2 drop-shadow">
                    {revealedSticker?.description}
                  </p>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wide">
                    {revealedSticker?.rarity}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {opened && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleClose(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
