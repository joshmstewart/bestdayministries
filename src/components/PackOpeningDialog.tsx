import { useState, useRef, useEffect } from "react";
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
  const [packRotation, setPackRotation] = useState({ x: 0, y: 0 });
  const [isFlipping, setIsFlipping] = useState(false);
  const packRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setOpened(false);
      setRevealedSticker(null);
      setShowConfetti(false);
      setIsFlipping(false);
    }
  }, [open]);

  const handleOpen = async () => {
    if (!cardId || opening || opened) return;

    console.log('Opening pack...');
    setOpening(true);
    setIsFlipping(true);

    // Simulate pack tear animation
    setTimeout(() => {
      handleReveal();
    }, 800);
  };

  const handleReveal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scratch-daily-card', {
        body: { card_id: cardId },
      });

      if (error) throw error;

      console.log('Card revealed:', data);
      
      // Wait for flip animation to complete
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
      }, 600);
    } catch (error: any) {
      console.error('Error revealing card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reveal card",
        variant: "destructive",
      });
      setOpening(false);
      setIsFlipping(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (opened || opening) return;

    const rect = packRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    setPackRotation({
      x: -(y / rect.height) * 20,
      y: (x / rect.width) * 20,
    });
  };

  const handleMouseLeave = () => {
    setPackRotation({ x: 0, y: 0 });
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
          {!opened ? (
            <div
              ref={packRef}
              className="relative perspective-1000 cursor-pointer"
              onClick={handleOpen}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${packRotation.x}deg) rotateY(${packRotation.y}deg)`,
                transition: opening ? 'transform 0.8s ease-out' : 'transform 0.1s ease-out',
              }}
            >
              {/* Pack wrapper with holographic effect */}
              <div 
                className={`relative w-64 h-80 rounded-xl overflow-hidden shadow-2xl ${
                  isFlipping ? 'animate-pack-flip' : ''
                }`}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #667eea 100%)',
                  backgroundSize: '200% 200%',
                  animation: opening ? 'none' : 'shimmer 3s ease infinite',
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
                  <Package className="h-20 w-20 mb-4 drop-shadow-lg" />
                  <h3 className="text-2xl font-bold text-center mb-2 drop-shadow-lg">Sticker Pack</h3>
                  <p className="text-center text-sm opacity-90 drop-shadow">Tap to open!</p>
                  {!opening && (
                    <Sparkles className="absolute top-4 right-4 h-8 w-8 animate-pulse" />
                  )}
                </div>

                {/* Tear effect when opening */}
                {opening && (
                  <div className="absolute inset-0 bg-black/50 animate-fade-out" />
                )}
              </div>
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

          @keyframes shine {
            0%, 100% { background-position: -200% -200%; }
            50% { background-position: 200% 200%; }
          }

          @keyframes pack-flip {
            0% { transform: rotateY(0deg) scale(1); }
            50% { transform: rotateY(180deg) scale(0.8); }
            100% { transform: rotateY(360deg) scale(1); }
          }

          .perspective-1000 {
            perspective: 1000px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
