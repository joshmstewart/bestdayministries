import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { CoinIcon } from "@/components/CoinIcon";
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
  const sparkleCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const [sparkles, setSparkles] = useState<Array<{x: number, y: number, life: number}>>([]);
  const [revealing, setRevealing] = useState(false);
  const sparkleAnimationRef = useRef<number | null>(null);
  const [bonusPacksEnabled, setBonusPacksEnabled] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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
      setSparkles([]);
      setRevealing(false);
      
      // Initialize canvas after a short delay to ensure it's mounted
      setTimeout(() => {
        if (canvasRef.current) {
          initializeCanvas();
        }
        if (sparkleCanvasRef.current) {
          sparkleCanvasRef.current.width = 300;
          sparkleCanvasRef.current.height = 300;
        }
      }, 100);
      
      loadBaseCost();
      loadBonusPacksSetting();
      loadUserRole();
    }
  }, [open]);

  // Animate sparkles
  useEffect(() => {
    if (sparkles.length === 0 && !revealing) {
      if (sparkleAnimationRef.current) {
        cancelAnimationFrame(sparkleAnimationRef.current);
        sparkleAnimationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const canvas = sparkleCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 300, 300);

      // Draw sparkles
      setSparkles(prev => {
        const updated = prev
          .map(s => ({ ...s, life: s.life - 1 }))
          .filter(s => s.life > 0);

        updated.forEach(sparkle => {
          // Validate sparkle coordinates and life
          if (
            !isFinite(sparkle.x) || 
            !isFinite(sparkle.y) || 
            !isFinite(sparkle.life) ||
            sparkle.x < 0 || sparkle.x > 300 ||
            sparkle.y < 0 || sparkle.y > 300 ||
            sparkle.life <= 0
          ) {
            return; // Skip invalid sparkles
          }

          const alpha = Math.max(0, Math.min(1, sparkle.life / 30));
          const size = Math.max(1, 3 + (1 - alpha) * 5); // Ensure positive size
          
          try {
            // White glow
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sparkle.x, sparkle.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Gold star shape
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              const angle = (i * Math.PI) / 2;
              const x1 = sparkle.x + Math.cos(angle) * size;
              const y1 = sparkle.y + Math.sin(angle) * size;
              const x2 = sparkle.x + Math.cos(angle) * (size * 2.5);
              const y2 = sparkle.y + Math.sin(angle) * (size * 2.5);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          } catch (err) {
            // Skip this sparkle if drawing fails
            console.warn('Failed to draw sparkle:', err);
          }
        });

        return updated;
      });

      sparkleAnimationRef.current = requestAnimationFrame(animate);
    };

    if (!sparkleAnimationRef.current) {
      animate();
    }

    return () => {
      if (sparkleAnimationRef.current) {
        cancelAnimationFrame(sparkleAnimationRef.current);
        sparkleAnimationRef.current = null;
      }
    };
  }, [sparkles, revealing]);

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

    // Smaller canvas size
    canvas.width = 300;
    canvas.height = 300;

    // Create radial metallic gradient for realistic scratch-off surface
    const gradient = ctx.createRadialGradient(
      150, 150, 0,
      150, 150, 150
    );
    gradient.addColorStop(0, '#e8e8e8');
    gradient.addColorStop(0.5, '#d0d0d0');
    gradient.addColorStop(1, '#b0b0b0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 300);

    // Add subtle noise texture
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 300;
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
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch Here!', 150, 150);
    
    // Add highlight on text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('Scratch Here!', 149, 149);
    
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

    // Scale coordinates to canvas size (300x300)
    const scaleX = 300 / rect.width;
    const scaleY = 300 / rect.height;
    
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    // Add sparkles where scratching - using batch update for better performance
    setSparkles(prev => {
      const newSparkles = [];
      const numSparkles = 5; // More sparkles
      for (let i = 0; i < numSparkles; i++) {
        const sparkleX = scaledX + (Math.random() - 0.5) * 30;
        const sparkleY = scaledY + (Math.random() - 0.5) * 30;
        newSparkles.push({ x: sparkleX, y: sparkleY, life: 30 });
      }
      return [...prev, ...newSparkles];
    });

    ctx.globalCompositeOperation = 'destination-out';
    
    // Larger scratch radius for mobile
    const baseRadius = 25;
    const radiusVariation = Math.random() * 10;
    const radius = baseRadius + radiusVariation;
    
    // Draw multiple overlapping circles for rough texture
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;
      const circleRadius = radius * (0.8 + Math.random() * 0.4);
      
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(scaledX + offsetX, scaledY + offsetY, circleRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;

    // Check if enough is scratched every few scratches
    if (Math.random() < 0.3) { // Check 30% of the time for performance
      const imageData = ctx.getImageData(0, 0, 300, 300);
      const pixels = imageData.data;
      let transparent = 0;
      
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 128) transparent++; // Count semi-transparent too
      }

      const totalPixels = 300 * 300;
      const percentScratched = (transparent / totalPixels) * 100;

      console.log('Scratched:', percentScratched.toFixed(1) + '%');

      if (percentScratched > 50 && !scratched) {
        console.log('🎉 Scratch threshold reached:', percentScratched.toFixed(2) + '%');
        setRevealing(true);
        triggerBigSparkle();
      }
    }
  };

  const triggerBigSparkle = async () => {
    setRevealing(true);
    
    // Create big sparkle explosion
    const bigSparkles: Array<{x: number, y: number, life: number}> = [];
    for (let i = 0; i < 100; i++) {
      bigSparkles.push({
        x: Math.random() * 300,
        y: Math.random() * 300,
        life: 60
      });
    }
    setSparkles(bigSparkles);

    // Wait for sparkle animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Clear sparkles and reveal
    setSparkles([]);
    handleReveal();
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

      // Don't call onScratched here - wait for user to close dialog
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

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && onScratched) {
      onScratched();
    }
    onOpenChange(newOpen);
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

      // Close dialog and refresh parent to show new card
      handleClose(false);
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

  const loadBonusPacksSetting = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_packs_enabled')
      .maybeSingle();
    
    const isEnabled = data?.setting_value !== false;

    // Check role visibility
    const { data: rolesData } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'bonus_packs_visible_to_roles')
      .maybeSingle();
    
    const visibleRoles = rolesData?.setting_value as string[] || ["supporter", "bestie", "caregiver", "admin", "owner"];
    
    // Only enable if both the feature is on AND user has the right role
    const canSee = userRole && visibleRoles.includes(userRole);
    setBonusPacksEnabled(isEnabled && canSee);
  };

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (data?.role) {
      setUserRole(data.role);
    }
  };

  // Re-check bonus packs visibility when user role changes
  useEffect(() => {
    if (userRole) {
      loadBonusPacksSetting();
    }
  }, [userRole]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                    handleClose(false);
                    navigate('/sticker-album');
                  }}
                >
                  View Collection
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Scratch to collect stickers and complete your collection! Each sticker has a different rarity level.
              </p>
              <div className="relative inline-block w-full max-w-md mx-auto">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="w-full border-4 border-primary rounded-lg cursor-pointer touch-none"
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
                <canvas
                  ref={sparkleCanvasRef}
                  width={300}
                  height={300}
                  className="absolute top-0 left-0 w-full pointer-events-none border-4 border-transparent rounded-lg"
                />
                {(loading || revealing) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    {revealing ? (
                      <div className="text-white text-4xl font-bold animate-pulse">✨</div>
                    ) : (
                      <Loader2 className="w-12 h-12 animate-spin text-white" />
                    )}
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
                {bonusPacksEnabled && (
                  <>
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
                          <CoinIcon className="mr-2" size={20} />
                          Buy Another Sticker ({nextCost} coins)
                        </>
                      )}
                    </Button>
                    {coinBalance < nextCost && (
                      <p className="text-xs text-muted-foreground text-center">
                        Need {nextCost - coinBalance} more coins
                      </p>
                    )}
                  </>
                )}
                <Button 
                  onClick={() => {
                    handleClose(false);
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