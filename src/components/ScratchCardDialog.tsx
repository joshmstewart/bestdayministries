import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import joycoinImage from "@/assets/joycoin.png";
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
  const [bonusCardCount, setBonusCardCount] = useState<number>(0);
  const [nextCost, setNextCost] = useState<number>(0);
  const [baseCost, setBaseCost] = useState<number>(50);

  useEffect(() => {
    if (open) {
      // Reset all states when dialog opens
      setScratched(false);
      setLoading(false);
      setIsScratching(false);
      setRevealedSticker(null);
      setIsDuplicate(false);
      setQuantity(1);
      setIsComplete(false);
      
      // Initialize canvas after a short delay to ensure it's mounted
      setTimeout(() => {
        if (canvasRef.current) {
          initializeCanvas();
        }
      }, 100);
      
      loadBaseCost();
    }
  }, [open]);

  const loadBaseCost = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_card_base_cost')
      .maybeSingle();
    
    if (data?.setting_value) {
      setBaseCost(Number(data.setting_value));
    }
  };

  // Recalculate cost when base cost changes
  useEffect(() => {
    if (baseCost) {
      setNextCost(baseCost * Math.pow(2, bonusCardCount));
    }
  }, [baseCost, bonusCardCount]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    console.log('Initializing scratch card canvas...');

    // Set canvas size - keep it simple for mobile compatibility
    canvas.width = 400;
    canvas.height = 400;

    // Create radial metallic gradient for realistic scratch-off surface
    const gradient = ctx.createRadialGradient(
      200, 200, 0,
      200, 200, 200
    );
    gradient.addColorStop(0, '#e8e8e8');
    gradient.addColorStop(0.5, '#d0d0d0');
    gradient.addColorStop(1, '#b0b0b0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);

    // Add subtle noise texture (no grid)
    for (let i = 0; i < 1500; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 400;
      const opacity = Math.random() * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Add "Scratch Here" text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch Here!', 200, 200);
    
    // Add highlight on text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('Scratch Here!', 199, 199);
    
    console.log('Canvas initialized successfully');
  };

  const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (scratched) return;

    // Prevent default touch behavior (scrolling)
    if ('touches' in e) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Scale coordinates to canvas size
    const scaleX = 400 / rect.width;
    const scaleY = 400 / rect.height;
    
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    
    // Create realistic scratch with varying size
    const baseRadius = 25;
    const radiusVariation = Math.random() * 10;
    const radius = baseRadius + radiusVariation;
    
    // Draw multiple overlapping circles for rough texture
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;
      const circleRadius = radius * (0.8 + Math.random() * 0.4);
      
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(scaledX + offsetX, scaledY + offsetY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;

    // Check if enough is scratched (use actual canvas dimensions)
    const imageData = ctx.getImageData(0, 0, 400, 400);
    const pixels = imageData.data;
    let transparent = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const totalPixels = 400 * 400;
    const percentScratched = (transparent / totalPixels) * 100;

    if (percentScratched > 50 && !scratched) {
      console.log('Scratch threshold reached:', percentScratched.toFixed(2));
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

      // Get user's coin balance and bonus card count
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', user.id)
          .single();
        
        setCoinBalance(profile?.coins || 0);

        const today = new Date().toISOString().split('T')[0];
        const { data: bonusCards, count } = await supabase
          .from('daily_scratch_cards')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('date', today)
          .eq('is_bonus_card', true);
        
        const bonusCount = count || 0;
        setBonusCardCount(bonusCount);
        // Calculate next cost using base cost from settings
        setNextCost(baseCost * Math.pow(2, bonusCount));
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('purchase-bonus-card', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
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
        description: `Bonus scratch card purchased for ${data.cost} coins! Close this dialog to scratch it. 🎉`
      });

      // Update next cost if provided
      if (data.nextCost) {
        setNextCost(data.nextCost);
        setBonusCardCount(data.purchaseCount || 0);
      }

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
              <div className="flex items-center justify-between w-full">
                <h2 className="text-2xl font-bold">Scratch to Reveal!</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/sticker-album');
                  }}
                >
                  View Collection
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Scratch to collect stickers and complete your collection! Each sticker has a different rarity level.
              </p>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="border-4 border-primary rounded-lg cursor-pointer touch-none"
                  onMouseDown={() => setIsScratching(true)}
                  onMouseUp={() => setIsScratching(false)}
                  onMouseMove={(e) => isScratching && scratch(e)}
                  onTouchStart={(e) => {
                    setIsScratching(true);
                    scratch(e);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    scratch(e);
                  }}
                  onTouchEnd={() => setIsScratching(false)}
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

              <div className="flex flex-col gap-3 w-full">
                <Button 
                  variant="outline" 
                  onClick={purchaseBonusCard}
                  disabled={purchasing || coinBalance < nextCost}
                  className="w-full"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buying...
                    </>
                  ) : (
                    <>
                      <img src={joycoinImage} alt="JoyCoin" className="w-5 h-5 mr-2" />
                      Buy Another Sticker ({nextCost} coins)
                    </>
                  )}
                </Button>
                {coinBalance < nextCost && (
                  <p className="text-xs text-muted-foreground text-center">
                    Need {nextCost - coinBalance} more coins
                  </p>
                )}
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/sticker-album');
                  }}
                  className="w-full"
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