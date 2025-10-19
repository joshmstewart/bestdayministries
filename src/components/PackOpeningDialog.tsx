import { useState, useEffect, useRef } from "react";
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

const rarityConfettiConfig = {
  common: { particleCount: 50, spread: 60, bursts: 1 },
  uncommon: { particleCount: 100, spread: 80, bursts: 2 },
  rare: { particleCount: 150, spread: 100, bursts: 3 },
  epic: { particleCount: 200, spread: 120, bursts: 4 },
  legendary: { particleCount: 300, spread: 140, bursts: 5 },
};

export const PackOpeningDialog = ({ open, onOpenChange, cardId, onScratched }: PackOpeningDialogProps) => {
  const { toast } = useToast();
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealedSticker, setRevealedSticker] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [collectionName, setCollectionName] = useState<string>("Sticker Pack");
  const [packStickers, setPackStickers] = useState<any[]>([]);
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
  }, [open]);


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
        .select('name')
        .eq('id', card.collection_id)
        .single();

      if (collectionError) throw collectionError;

      setCollectionName(collection.name || "Sticker Pack");

      // Get 4 random stickers from the collection to display on pack
      const { data: stickers } = await supabase
        .from('stickers')
        .select('id, name, image_url, rarity')
        .eq('collection_id', card.collection_id)
        .limit(4);

      if (stickers && stickers.length > 0) {
        // Shuffle and take up to 4 stickers
        const shuffled = stickers.sort(() => Math.random() - 0.5);
        setPackStickers(shuffled.slice(0, 4));
      }
    } catch (error) {
      console.error('Error loading collection info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (opening || opened) return;
    
    setOpening(true);
    
    // Animate tear effect
    const startTime = Date.now();
    const duration = 800; // 800ms tear animation
    
    const animateTear = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setTearProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animateTear);
      } else {
        handleReveal();
      }
    };
    
    requestAnimationFrame(animateTear);
  };

  const handleReveal = async () => {
    try {
      // Check if card is already scratched
      const { data: cardCheck } = await supabase
        .from('daily_scratch_cards')
        .select('scratched_at')
        .eq('id', cardId)
        .single();

      if (cardCheck?.scratched_at) {
        toast({
          title: "Already Opened",
          description: "This pack has already been opened today.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('scratch-card', {
        body: { cardId }
      });

      if (error) throw error;

      if (data.success && data.sticker) {
        // Image URL is already a full URL from the edge function
        setRevealedSticker({
          ...data.sticker,
          image_url: data.sticker.image_url
        });
        
        setOpened(true);
        setShowConfetti(true);
        
        // Get rarity-specific config
        const rarity = data.sticker.rarity as keyof typeof rarityConfettiConfig;
        const config = rarityConfettiConfig[rarity] || rarityConfettiConfig.common;
        
        // Trigger confetti multiple times based on rarity
        for (let i = 0; i < config.bursts; i++) {
          setTimeout(() => {
            confetti({
              particleCount: config.particleCount,
              spread: config.spread,
              origin: { y: 0.6 },
              colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#9370DB']
            });
          }, i * 300);
        }
      } else {
        throw new Error(data.message || 'Failed to reveal sticker');
      }
    } catch (error: any) {
      console.error('Error revealing sticker:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reveal your sticker",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-primary/10 to-primary/5">
          <DialogHeader>
            <DialogTitle className="text-center">Loading Pack...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-primary/10 to-primary/5">
        <DialogHeader>
          <DialogTitle className="text-center">
            {opened ? "You Got:" : "Open Your Pack"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {opened ? "Added to your collection!" : "Tap to open your pack!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {!opened ? (
            <div 
              onClick={handleOpen}
              className="relative cursor-pointer transform transition-all duration-300 hover:scale-105 w-full max-w-[280px] aspect-[2/3]"
              style={{
                perspective: "1000px",
                filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.6))"
              }}
            >
              <div 
                className="relative w-full h-full rounded-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, 
                    hsl(var(--primary)) 0%,
                    hsl(var(--primary) / 0.9) 30%,
                    hsl(var(--primary) / 0.8) 70%,
                    hsl(var(--primary) / 0.7) 100%)`,
                  transform: opening ? `scaleY(${1 - tearProgress * 0.3}) rotateY(${tearProgress * 10}deg)` : "scaleY(1) rotateY(0deg)",
                  clipPath: opening 
                    ? `polygon(0 ${tearProgress * 30}%, 100% ${tearProgress * 30}%, 100% ${100 - tearProgress * 30}%, 0 ${100 - tearProgress * 30}%)`
                    : "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                  transition: opening ? "none" : "all 0.3s ease",
                  boxShadow: `
                    inset 0 2px 4px rgba(255,255,255,0.2),
                    inset 0 -2px 4px rgba(0,0,0,0.2),
                    0 8px 32px rgba(0,0,0,0.4)
                  `
                }}
              >
                {/* Metallic foil overlay */}
                <div 
                  className="absolute inset-0 opacity-40 mix-blend-overlay"
                  style={{
                    background: `
                      repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 2px,
                        rgba(255,255,255,0.03) 2px,
                        rgba(255,255,255,0.03) 4px
                      ),
                      radial-gradient(circle at 30% 40%, rgba(255,215,0,0.4) 0%, transparent 50%),
                      radial-gradient(circle at 70% 60%, rgba(147,112,219,0.3) 0%, transparent 50%),
                      radial-gradient(circle at 50% 80%, rgba(64,224,208,0.3) 0%, transparent 50%)
                    `,
                    animation: "holographic 4s ease-in-out infinite"
                  }}
                />

                {/* Prismatic shimmer */}
                <div 
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `linear-gradient(
                      110deg,
                      transparent 25%,
                      rgba(255,255,255,0.4) 35%,
                      rgba(255,255,255,0.8) 45%,
                      rgba(255,255,255,0.4) 55%,
                      transparent 65%
                    )`,
                    backgroundSize: "200% 100%",
                    animation: "shimmer 4s ease-in-out infinite"
                  }}
                />

                {/* Sticker collage - random positioning with transparent backgrounds */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {packStickers.length > 0 ? (
                    <div className="relative w-full h-full">
                       {packStickers.map((sticker, index) => {
                        // Position stickers to avoid covering title (bottom 20%) - max 15% title coverage
                        const configs = [
                          { top: '-8%', left: '-10%', size: 145, rotate: -20 },
                          { top: '15%', right: '-8%', size: 160, rotate: 15 },
                          { top: '35%', left: '8%', size: 150, rotate: -12 },
                          { top: '25%', right: '22%', size: 140, rotate: 10 }
                        ];
                        const config = configs[index] || configs[0];
                        
                        return (
                          <div
                            key={sticker.id}
                            className="absolute"
                            style={{
                              top: config.top,
                              left: config.left,
                              right: config.right,
                              width: `${config.size}px`,
                              height: `${config.size}px`,
                              transform: `rotate(${config.rotate}deg)`,
                              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
                              zIndex: 4 - index
                            }}
                          >
                            {/* Just the sticker image - transparent PNG */}
                            <img
                              src={sticker.image_url}
                              alt={sticker.name}
                              className="w-full h-full object-contain"
                              style={{
                                filter: "brightness(1.1) contrast(1.1)"
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Package className="w-24 h-24 text-white/80 drop-shadow-2xl" strokeWidth={1.5} />
                  )}
                </div>

                {/* Foil border accent */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    border: "3px solid transparent",
                    background: `
                      linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, 
                        rgba(255,215,0,0.6), 
                        rgba(255,255,255,0.4), 
                        rgba(147,112,219,0.6),
                        rgba(64,224,208,0.6)
                      ) border-box
                    `,
                    WebkitMask: "linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude"
                  }}
                />

                {/* Title banner */}
                <div 
                  className="absolute bottom-0 left-0 right-0 py-4 px-6"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.7), transparent)",
                    backdropFilter: "blur(4px)"
                  }}
                >
                  <h2 
                    className="text-3xl font-black tracking-wider text-center text-white uppercase"
                    style={{
                      textShadow: `
                        0 2px 4px rgba(0,0,0,1),
                        0 0 20px hsl(var(--primary)),
                        0 0 40px hsl(var(--primary) / 0.5)
                      `,
                      WebkitTextStroke: "1px rgba(0,0,0,0.5)",
                      letterSpacing: "0.1em"
                    }}
                  >
                    {collectionName}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <span className="text-sm text-white/90 font-semibold">TAP TO OPEN</span>
                    <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
                  </div>
                </div>

                {/* Tear sparkles */}
                {opening && (
                  <>
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-3 bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-90 blur-sm"
                      style={{
                        top: `${tearProgress * 30}%`,
                        animation: "sparkle 0.3s ease-in-out infinite"
                      }}
                    />
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-3 bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-90 blur-sm"
                      style={{
                        bottom: `${tearProgress * 30}%`,
                        animation: "sparkle 0.3s ease-in-out infinite"
                      }}
                    />
                  </>
                )}
              </div>

              {/* CSS animations */}
              <style>{`
                @keyframes holographic {
                  0%, 100% { 
                    opacity: 0.4;
                    transform: translateY(0) scale(1);
                  }
                  50% { 
                    opacity: 0.7;
                    transform: translateY(-2px) scale(1.02);
                  }
                }
                
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
                
                @keyframes sparkle {
                  0%, 100% { opacity: 0.7; }
                  50% { opacity: 1; }
                }
              `}</style>
            </div>
          ) : revealedSticker ? (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className={`relative rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br ${rarityColors[revealedSticker.rarity as keyof typeof rarityColors]} p-1`}>
                <img 
                  src={revealedSticker.image_url} 
                  alt={revealedSticker.name}
                  className="w-64 h-64 object-contain bg-white rounded-lg"
                />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">{revealedSticker.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {revealedSticker.rarity} • {revealedSticker.category}
                </p>
                {revealedSticker.description && (
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {revealedSticker.description}
                  </p>
                )}
              </div>

              <Button 
                variant="default"
                size="lg"
                onClick={() => {
                  onScratched();
                  onOpenChange(false);
                }}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
