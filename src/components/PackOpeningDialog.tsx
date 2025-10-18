import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Sparkles, Package } from "lucide-react";

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
  const [tearProgress, setTearProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setOpened(false);
      setRevealedSticker(null);
      setShowConfetti(false);
      setOpening(false);
      setTearProgress(0);
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
    
    // Animate tear progress
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setTearProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reveal after tear animation completes
        setTimeout(() => handleReveal(), 100);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const handleReveal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scratch-daily-card', {
        body: { card_id: cardId },
      });

      if (error) throw error;

      console.log('Card revealed:', data);
      
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
            <div className="w-full max-w-sm">
              <div
                className="relative cursor-pointer mx-auto"
                onClick={handleOpen}
                style={{
                  width: '280px',
                  height: '360px',
                  perspective: '1000px',
                }}
              >
                {/* Pack wrapper with holographic effect */}
                <div 
                  className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #667eea 100%)',
                    backgroundSize: '200% 200%',
                    animation: opening ? 'none' : 'shimmer 3s ease infinite',
                    transform: opening ? `scale(${1 + tearProgress * 0.1})` : 'scale(1)',
                    opacity: opening ? 1 - tearProgress : 1,
                  }}
                >
                  {/* Holographic overlay */}
                  <div 
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                    }}
                  />
                  
                  {/* Shine effect */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                      backgroundSize: '200% 200%',
                      animation: opening ? 'none' : 'shine 4s ease-in-out infinite',
                    }}
                  />

                  {/* Pack content */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-white">
                    {packImageUrl ? (
                      <img 
                        src={packImageUrl} 
                        alt={collectionName}
                        className="w-32 h-32 object-contain mb-4 drop-shadow-2xl"
                      />
                    ) : (
                      <Package className="h-20 w-20 mb-4 drop-shadow-lg" />
                    )}
                    <h3 className="text-2xl font-bold text-center mb-2 drop-shadow-lg">{collectionName}</h3>
                    <p className="text-center text-sm opacity-90 drop-shadow">Tap to open!</p>
                    {!opening && (
                      <Sparkles className="absolute top-4 right-4 h-8 w-8 animate-pulse" />
                    )}
                  </div>

                  {/* Tear effect overlay when opening */}
                  {opening && tearProgress > 0 && (
                    <>
                      {/* Top tear piece */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500"
                        style={{
                          clipPath: `polygon(0 0, 100% 0, 100% ${50 - tearProgress * 50}%, 0 ${50 - tearProgress * 50}%)`,
                          transform: `translateY(-${tearProgress * 100}px) rotateX(${tearProgress * 30}deg)`,
                          transformOrigin: 'bottom',
                        }}
                      />
                      
                      {/* Bottom tear piece */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500"
                        style={{
                          clipPath: `polygon(0 ${50 + tearProgress * 50}%, 100% ${50 + tearProgress * 50}%, 100% 100%, 0 100%)`,
                          transform: `translateY(${tearProgress * 100}px) rotateX(-${tearProgress * 30}deg)`,
                          transformOrigin: 'top',
                        }}
                      />

                      {/* Sparkles during opening */}
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-white rounded-full"
                          style={{
                            left: `${50 + (Math.random() - 0.5) * 60}%`,
                            top: `${50 + (Math.random() - 0.5) * 60}%`,
                            opacity: tearProgress,
                            transform: `scale(${tearProgress}) translate(${(Math.random() - 0.5) * 100}px, ${(Math.random() - 0.5) * 100}px)`,
                            transition: 'all 0.3s ease-out',
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-center text-lg font-semibold mt-6">{collectionName}</p>
              <p className="text-center text-sm text-muted-foreground mt-2">Click the pack to open!</p>
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

        {/* Custom animations */}
        <style>{`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
