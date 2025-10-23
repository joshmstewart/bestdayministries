import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Sparkles, Package, BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface PackOpeningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  onOpened: () => void;
}

const rarityColors = {
  common: "from-gray-400 to-gray-600",
  uncommon: "from-green-400 to-green-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-orange-600",
};

const rarityBadgeColors = {
  common: "bg-gray-500 text-white",
  uncommon: "bg-green-500 text-white",
  rare: "bg-blue-500 text-white",
  epic: "bg-purple-500 text-white",
  legendary: "bg-yellow-500 text-black",
};

const rarityConfettiConfig = {
  common: { particleCount: 50, spread: 60, bursts: 1 },
  uncommon: { particleCount: 100, spread: 80, bursts: 2 },
  rare: { particleCount: 150, spread: 100, bursts: 3 },
  epic: { particleCount: 200, spread: 120, bursts: 4 },
  legendary: { particleCount: 300, spread: 140, bursts: 5 },
};

export const PackOpeningDialog = ({ open, onOpenChange, cardId, onOpened }: PackOpeningDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { playSound, loading: soundsLoading, soundEffects } = useSoundEffects();
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [revealedStickers, setRevealedStickers] = useState<any[]>([]);
  const [currentStickerIndex, setCurrentStickerIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [collectionName, setCollectionName] = useState<string>("Sticker Pack");
  const [packStickers, setPackStickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tearProgress, setTearProgress] = useState(0);
  const [customPackImage, setCustomPackImage] = useState<string | null>(null);
  const [customPackAnimation, setCustomPackAnimation] = useState<string | null>(null);

  const handleDialogClose = (isOpen: boolean) => {
    // If closing the dialog and a pack was opened, trigger the callback
    // Small delay to ensure database update propagates and realtime picks it up
    if (!isOpen && opened) {
      setTimeout(() => {
        onOpened();
      }, 100);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open) {
      setOpened(false);
      setRevealedStickers([]);
      setCurrentStickerIndex(0);
      setShowSummary(false);
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

      // Get collection details including custom pack assets
      const { data: collection, error: collectionError } = await supabase
        .from('sticker_collections')
        .select('name, pack_image_url, pack_animation_url')
        .eq('id', card.collection_id)
        .single();

      if (collectionError) throw collectionError;

      setCollectionName(collection.name || "Sticker Pack");
      setCustomPackImage(collection.pack_image_url);
      setCustomPackAnimation(collection.pack_animation_url);

      // Only load stickers if no custom pack image
      if (!collection.pack_image_url) {
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

  const triggerCelebration = (rarity: string) => {
    // Play rarity-specific sound
    const raritySound = `sticker_reveal_${rarity}` as any;
    console.log('Trying to play rarity sound:', raritySound, 'Sound effects loaded:', !soundsLoading, 'Available:', !!soundEffects[raritySound]);
    playSound(raritySound);
    
    const config = rarityConfettiConfig[rarity as keyof typeof rarityConfettiConfig] || rarityConfettiConfig.common;
    
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

      if (error) {
        console.error('Scratch card function error:', error);
        throw error;
      }

      if (data.success) {
        // Play pack reveal sound
        console.log('Trying to play pack reveal sound. Sound effects loaded:', !soundsLoading, 'Available:', !!soundEffects['sticker_pack_reveal']);
        playSound('sticker_pack_reveal');
        
        // Support both single and multiple stickers
        const stickers = data.stickers || (data.sticker ? [data.sticker] : []);
        
        if (stickers.length > 0) {
          console.log(`${stickers.length} sticker(s) revealed successfully:`, stickers);
          setRevealedStickers(stickers);
          
          setOpened(true);
          setShowConfetti(true);
          
          // Delay rarity sound to let pack reveal sound play first
          setTimeout(() => {
            triggerCelebration(stickers[0].rarity);
          }, 500);
        } else {
          throw new Error('No stickers revealed');
        }
      } else {
        console.error('Scratch card failed:', data.message);
        throw new Error(data.message || 'Failed to reveal sticker');
      }
    } catch (error: any) {
      console.error('Error revealing sticker:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reveal your sticker. Please try again.",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
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
    <Dialog open={open} onOpenChange={handleDialogClose}>
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
            customPackImage ? (
              // Custom pack image - display as complete standalone pack
              <div 
                onClick={handleOpen}
                className="relative cursor-pointer transform transition-all duration-300 hover:scale-105 w-full max-w-[280px] aspect-[2/3]"
                style={{
                  filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.6))",
                  transform: opening ? `scale(${1 - tearProgress * 0.3})` : "scale(1)",
                  opacity: opening ? 1 - tearProgress : 1,
                  transition: opening ? "none" : "all 0.3s ease"
                }}
              >
                <img 
                  src={customPackImage} 
                  alt="Sticker Pack" 
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            ) : (
              // Generated pack with effects
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

                  {/* Sticker collage */}
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
            )
          ) : revealedStickers.length > 0 ? (
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
              {!showSummary ? (
                // Sequential reveal - one sticker at a time
                <>
                  <div 
                    onClick={() => {
                      if (currentStickerIndex < revealedStickers.length - 1) {
                        const nextIndex = currentStickerIndex + 1;
                        setCurrentStickerIndex(nextIndex);
                        // Trigger celebration for the next sticker
                        triggerCelebration(revealedStickers[nextIndex].rarity);
                      } else {
                        setShowSummary(true);
                      }
                    }}
                    className="cursor-pointer transform transition-all duration-300 hover:scale-105 flex flex-col items-center gap-4"
                  >
                    <img 
                      src={revealedStickers[currentStickerIndex].image_url} 
                      alt={revealedStickers[currentStickerIndex].name}
                      className="w-64 h-64 object-contain"
                      style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}
                    />
                    
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold">{revealedStickers[currentStickerIndex].name}</h3>
                      <div className="flex items-center justify-center gap-2">
                        <Badge className={rarityBadgeColors[revealedStickers[currentStickerIndex].rarity as keyof typeof rarityBadgeColors]}>
                          {revealedStickers[currentStickerIndex].rarity.charAt(0).toUpperCase() + revealedStickers[currentStickerIndex].rarity.slice(1)}
                        </Badge>
                        {revealedStickers[currentStickerIndex].category && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground capitalize">{revealedStickers[currentStickerIndex].category}</span>
                          </>
                        )}
                      </div>
                      {revealedStickers[currentStickerIndex].description && (
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {revealedStickers[currentStickerIndex].description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {currentStickerIndex < revealedStickers.length - 1 
                          ? `Tap for next sticker (${currentStickerIndex + 1} of ${revealedStickers.length})`
                          : `Tap to see summary`
                        }
                      </span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                </>
              ) : (
                // Summary view - all stickers
                <>
                  <h3 className="text-2xl font-bold">You got {revealedStickers.length} stickers!</h3>
                  <div className={cn(
                    "grid gap-4 w-full max-w-2xl",
                    revealedStickers.length === 1 && "grid-cols-1",
                    revealedStickers.length === 2 && "grid-cols-2",
                    revealedStickers.length >= 3 && "grid-cols-2 sm:grid-cols-3"
                  )}>
                    {revealedStickers.map((sticker, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-transparent">
                        <img 
                          src={sticker.image_url} 
                          alt={sticker.name}
                          className="w-32 h-32 object-contain"
                          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
                        />
                        <div className="text-center space-y-1">
                          <p className="font-semibold text-sm">{sticker.name}</p>
                          <Badge className={cn("text-xs", rarityBadgeColors[sticker.rarity as keyof typeof rarityBadgeColors])}>
                            {sticker.rarity.charAt(0).toUpperCase() + sticker.rarity.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <Button 
                      onClick={() => handleDialogClose(false)}
                      size="lg"
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        handleDialogClose(false);
                        navigate('/sticker-album');
                      }}
                      size="lg"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Collection
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
