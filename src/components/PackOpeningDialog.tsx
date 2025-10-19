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
  const [packImageUrl, setPackImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tearProgress, setTearProgress] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const idleOscillatorRef = useRef<OscillatorNode | null>(null);
  const idleGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (open) {
      setOpened(false);
      setRevealedSticker(null);
      setShowConfetti(false);
      setOpening(false);
      setTearProgress(0);
      loadCollectionInfo();
      
      // Create sparkly idle sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      playIdleSound(audioContext);
    }

    return () => {
      // Cleanup audio on unmount
      if (idleOscillatorRef.current) {
        idleOscillatorRef.current.stop();
        idleOscillatorRef.current = null;
      }
      if (idleGainRef.current) {
        idleGainRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [open]);

  const playIdleSound = (audioContext: AudioContext) => {
    // Create a sparkly, magical idle sound
    const playSparkle = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Random frequency for sparkle effect
      oscillator.frequency.value = 800 + Math.random() * 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };
    
    // Play sparkles at random intervals
    const sparkleInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        playSparkle();
      }
    }, 400);
    
    return sparkleInterval;
  };

  const playOpeningSound = () => {
    if (!audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    
    // Create a whoosh/tear sound
    const noise = audioContext.createBufferSource();
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.8, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    
    noise.start(audioContext.currentTime);
    noise.stop(audioContext.currentTime + 0.8);
  };

  const playCelebrationSound = (rarity: string) => {
    if (!audioContextRef.current) return;
    
    const audioContext = audioContextRef.current;
    const rarityConfig: { [key: string]: { notes: number[], duration: number } } = {
      common: { notes: [523.25, 659.25], duration: 0.3 },
      uncommon: { notes: [523.25, 659.25, 783.99], duration: 0.4 },
      rare: { notes: [523.25, 659.25, 783.99, 1046.50], duration: 0.5 },
      epic: { notes: [523.25, 659.25, 783.99, 1046.50, 1318.51], duration: 0.6 },
      legendary: { notes: [523.25, 659.25, 783.99, 1046.50, 1318.51, 1568], duration: 0.8 }
    };
    
    const config = rarityConfig[rarity] || rarityConfig.common;
    
    config.notes.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + config.duration);
      }, index * 100);
    });
  };

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

      setCollectionName(collection.name || "Sticker Pack");

      // Get preview sticker for pack image
      if (collection.preview_sticker_id) {
        const { data: previewSticker } = await supabase
          .from('stickers')
          .select('image_url')
          .eq('id', collection.preview_sticker_id)
          .single();

        if (previewSticker?.image_url) {
          // Image URL is already a full URL from storage
          setPackImageUrl(previewSticker.image_url);
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
    
    // Stop idle sound and play opening sound
    if (idleOscillatorRef.current) {
      idleOscillatorRef.current.stop();
      idleOscillatorRef.current = null;
    }
    
    playOpeningSound();
    
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
        
        // Play rarity-specific celebration sound
        playCelebrationSound(rarity);
        
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
        
        onScratched();
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
                perspective: "1000px"
              }}
            >
              <div 
                className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl"
                style={{
                  backgroundImage: `linear-gradient(135deg, 
                    hsl(var(--primary)) 0%,
                    hsl(var(--primary) / 0.8) 50%,
                    hsl(var(--primary) / 0.6) 100%)`,
                  backgroundSize: "cover",
                  transform: opening ? `scaleY(${1 - tearProgress * 0.3})` : "scaleY(1)",
                  clipPath: opening 
                    ? `polygon(0 ${tearProgress * 30}%, 100% ${tearProgress * 30}%, 100% ${100 - tearProgress * 30}%, 0 ${100 - tearProgress * 30}%)`
                    : "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                  transition: opening ? "none" : "all 0.3s ease"
                }}
              >
                {/* Holographic overlay */}
                <div 
                  className="absolute inset-0 opacity-30 mix-blend-overlay"
                  style={{
                    background: `
                      radial-gradient(circle at 20% 50%, transparent 20%, rgba(255,255,255,0.3) 21%, transparent 22%),
                      radial-gradient(circle at 80% 50%, transparent 20%, rgba(255,255,255,0.3) 21%, transparent 22%),
                      radial-gradient(circle at 50% 20%, transparent 20%, rgba(255,255,255,0.3) 21%, transparent 22%),
                      radial-gradient(circle at 50% 80%, transparent 20%, rgba(255,255,255,0.3) 21%, transparent 22%)
                    `,
                    animation: "holographic 3s ease-in-out infinite"
                  }}
                />

                {/* Shimmer effect */}
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)",
                    backgroundSize: "200% 200%",
                    animation: "shimmer 3s ease-in-out infinite"
                  }}
                />

                {/* Decorative corner borders */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/40 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/40 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/40 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/40 rounded-br-xl" />

                {/* Pack content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-white">
                  {packImageUrl ? (
                    <img 
                      src={packImageUrl} 
                      alt="Pack preview" 
                      className="w-32 h-32 object-contain mb-4 drop-shadow-2xl"
                    />
                  ) : (
                    <Package className="w-32 h-32 mb-4 drop-shadow-2xl" strokeWidth={1.5} />
                  )}
                  
                  <h2 
                    className="text-4xl font-black tracking-wider text-center mb-2 drop-shadow-2xl"
                    style={{
                      textShadow: `
                        2px 2px 4px rgba(0,0,0,0.8),
                        0 0 20px rgba(255,255,255,0.5),
                        0 0 30px rgba(255,255,255,0.3)
                      `,
                      WebkitTextStroke: "1px rgba(0,0,0,0.3)"
                    }}
                  >
                    {collectionName}
                  </h2>
                  
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>

                {/* Tear sparkles */}
                {opening && (
                  <>
                    <div 
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80"
                      style={{
                        top: `${tearProgress * 30}%`,
                        animation: "sparkle 0.3s ease-in-out infinite"
                      }}
                    />
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80"
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
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 0.6; }
                }
                
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
                
                @keyframes sparkle {
                  0%, 100% { opacity: 0.6; }
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
                onClick={() => onOpenChange(false)}
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
