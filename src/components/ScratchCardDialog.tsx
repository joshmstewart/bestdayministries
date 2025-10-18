import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Coins } from "lucide-react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ScratchCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  onScratched: () => void;
}

const rarityColors = {
  common: "bg-gray-500",
  uncommon: "bg-green-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
};

export const ScratchCardDialog = ({ open, onOpenChange, cardId, onScratched }: ScratchCardDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealedSticker, setRevealedSticker] = useState<any>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [todayCardCount, setTodayCardCount] = useState<number>(0);

  useEffect(() => {
    if (open && canvasRef.current) {
      initializeCanvas();
    }
  }, [open]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Draw scratch-off coating
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add "Scratch Here" text
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Scratch Here!', canvas.width / 2, canvas.height / 2);
  };

  const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (scratched || loading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    // Scale coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x * scaleX, y * scaleY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Check if enough is scratched
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const percentScratched = (transparent / (canvas.width * canvas.height)) * 100;

    if (percentScratched > 50 && !scratched) {
      handleReveal();
    }
  };

  const handleReveal = async () => {
    setScratched(true);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('scratch-daily-card', {
        body: { card_id: cardId },
      });

      if (error) throw error;

      setRevealedSticker(data.sticker);
      setIsDuplicate(data.isDuplicate);
      setQuantity(data.quantity);
      setIsComplete(data.isComplete);

      // Get user's coin balance and today's card count
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coin_balance')
          .eq('id', user.id)
          .single();
        
        setCoinBalance(profile?.coin_balance || 0);

        const today = new Date().toISOString().split('T')[0];
        const { data: cards } = await supabase
          .from('daily_scratch_cards')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today);
        
        setTodayCardCount(cards?.length || 0);
      }

      // Trigger confetti
      confetti({
        particleCount: data.sticker.rarity === 'legendary' ? 200 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: data.sticker.rarity === 'legendary' 
          ? ['#FFD700', '#FFA500', '#FF6B6B']
          : undefined,
      });

      if (data.isComplete) {
        toast({
          title: "Collection Complete! 🎉",
          description: "You've collected all stickers in this collection!",
        });
      }

      onScratched();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const purchaseBonusCard = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-bonus-card');
      
      if (error) throw error;
      
      if (data.error) {
        toast({
          title: "Cannot Purchase",
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Bonus scratch card purchased! Close this dialog to scratch it. 🎉"
      });

      // Refresh parent to show new card
      onScratched();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error purchasing bonus card:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase bonus card",
        variant: "destructive"
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {!revealedSticker ? (
            <>
              <h2 className="text-2xl font-bold">Scratch to Reveal!</h2>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Scratch once per day to collect stickers and complete your collection! Each sticker has a different rarity level.
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="border-4 border-primary rounded-lg cursor-pointer"
                  onMouseDown={() => setIsScratching(true)}
                  onMouseUp={() => setIsScratching(false)}
                  onMouseMove={(e) => isScratching && scratch(e)}
                  onTouchStart={() => setIsScratching(true)}
                  onTouchEnd={() => setIsScratching(false)}
                  onTouchMove={(e) => scratch(e)}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-center">
                Drag your mouse or finger across the card to scratch it off!
              </p>
            </>
          ) : (
            <>
              <div className="animate-scale-in">
                <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold text-center mb-2">
                  {isDuplicate ? "You got another one!" : "New Sticker!"}
                </h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Badge className={rarityColors[revealedSticker.rarity as keyof typeof rarityColors]}>
                    {revealedSticker.rarity.toUpperCase()}
                  </Badge>
                  {isDuplicate && (
                    <Badge variant="secondary">
                      x{quantity}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="relative">
                <img
                  src={revealedSticker.image_url}
                  alt={revealedSticker.name}
                  className="w-64 h-64 object-contain animate-fade-in"
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">{revealedSticker.name}</h3>
                {revealedSticker.description && (
                  <p className="text-muted-foreground">{revealedSticker.description}</p>
                )}
              </div>

              {isComplete && (
                <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 text-center animate-fade-in">
                  <p className="font-bold text-lg">🎉 Collection Complete! 🎉</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've earned the completion badge!
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                {todayCardCount < 2 && (
                  <Button 
                    variant="outline" 
                    onClick={purchaseBonusCard}
                    disabled={purchasing || coinBalance < 50}
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Buying...
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4 mr-2" />
                        Buy Another (50 coins)
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant={todayCardCount < 2 ? "outline" : "default"}
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/sticker-album');
                  }}
                >
                  View Collection
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};