import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCoins } from '@/hooks/useCoins';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Lock, Check, ShoppingCart, Music } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CoinsDisplay } from '@/components/CoinsDisplay';

interface BeatPadSound {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  color: string;
  oscillator_type: string | null;
  frequency: number | null;
  decay: number | null;
  has_noise: boolean | null;
  price_coins: number;
  is_default: boolean | null;
}

interface BeatPadSoundShopProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase?: () => void;
}

export const BeatPadSoundShop: React.FC<BeatPadSoundShopProps> = ({
  open,
  onOpenChange,
  onPurchase,
}) => {
  const { user } = useAuth();
  const { coins, refetch: refetchCoins, deductCoins } = useCoins();
  const [sounds, setSounds] = useState<BeatPadSound[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    if (open) {
      fetchSounds();
    }
  }, [open, user]);

  const fetchSounds = async () => {
    setLoading(true);
    try {
      // Fetch all purchasable sounds (non-default, price > 0)
      const { data: soundsData, error: soundsError } = await supabase
        .from('beat_pad_sounds')
        .select('*')
        .eq('is_active', true)
        .eq('is_default', false)
        .gt('price_coins', 0)
        .order('display_order');

      if (soundsError) throw soundsError;
      setSounds(soundsData || []);

      // Fetch user's purchased sounds
      if (user) {
        const { data: purchasedData, error: purchasedError } = await supabase
          .from('user_beat_pad_sounds')
          .select('sound_id')
          .eq('user_id', user.id);

        if (purchasedError) throw purchasedError;
        setPurchasedIds(new Set(purchasedData?.map(p => p.sound_id) || []));
      }
    } catch (error) {
      console.error('Error fetching sounds:', error);
      toast.error('Failed to load sounds');
    } finally {
      setLoading(false);
    }
  };

  const getAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  };

  const previewSound = (sound: BeatPadSound) => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = (sound.oscillator_type || 'sine') as OscillatorType;
    osc.frequency.setValueAtTime(sound.frequency || 440, now);
    
    if ((sound.frequency || 440) < 100) {
      osc.frequency.exponentialRampToValueAtTime(30, now + (sound.decay || 0.2));
    }
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (sound.decay || 0.2));
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + (sound.decay || 0.2));
    
    if (sound.has_noise) {
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      
      noise.buffer = buffer;
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + (sound.decay || 0.1));
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noise.start(now);
      noise.stop(now + (sound.decay || 0.1));
    }
  };

  const handlePurchase = async (sound: BeatPadSound) => {
    if (!user) {
      toast.error('Sign in to purchase sounds!');
      return;
    }

    if (coins < sound.price_coins) {
      toast.error('Not enough coins!');
      return;
    }

    setPurchasing(sound.id);
    try {
      // Deduct coins
      const success = await deductCoins(sound.price_coins, `Purchased Beat Pad sound: ${sound.name}`, sound.id);
      if (!success) {
        throw new Error('Failed to deduct coins');
      }

      // Record purchase
      const { error: purchaseError } = await supabase
        .from('user_beat_pad_sounds')
        .insert({
          user_id: user.id,
          sound_id: sound.id,
        });

      if (purchaseError) throw purchaseError;

      // Update local state
      setPurchasedIds(prev => new Set([...prev, sound.id]));
      refetchCoins();
      onPurchase?.();
      
      toast.success(`Unlocked ${sound.name}! 🎵`);
    } catch (error) {
      console.error('Error purchasing sound:', error);
      toast.error('Failed to purchase sound');
    } finally {
      setPurchasing(null);
    }
  };

  // Group sounds by category based on frequency ranges
  const groupedSounds = sounds.reduce((acc, sound) => {
    let category = 'Synths';
    const freq = sound.frequency || 440;
    
    if (freq < 100) category = 'Bass';
    else if (freq < 300 && sound.has_noise) category = 'Drums';
    else if (freq > 500 && sound.has_noise) category = 'Cymbals';
    else if (freq > 400 && !sound.has_noise) category = 'Synths';
    else if (sound.has_noise) category = 'Percussion';
    else category = 'Melodic';
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(sound);
    return acc;
  }, {} as Record<string, BeatPadSound[]>);

  const purchasedCount = sounds.filter(s => purchasedIds.has(s.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Sound Shop
              </DialogTitle>
              <DialogDescription>
                Unlock new sounds for your beats ({purchasedCount}/{sounds.length} owned)
              </DialogDescription>
            </div>
            <CoinsDisplay />
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sounds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No sounds available for purchase
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedSounds).map(([category, categorySounds]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categorySounds.map((sound) => {
                      const isPurchased = purchasedIds.has(sound.id);
                      const canAfford = coins >= sound.price_coins;
                      
                      return (
                        <Card 
                          key={sound.id}
                          className={cn(
                            "transition-all",
                            isPurchased && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                                style={{ backgroundColor: sound.color }}
                              >
                                {sound.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium truncate">{sound.name}</h4>
                                  {isPurchased && (
                                    <Badge variant="secondary" className="shrink-0">
                                      <Check className="h-3 w-3 mr-1" />
                                      Owned
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {sound.oscillator_type} · {sound.frequency}Hz
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => previewSound(sound)}
                                    className="h-7 px-2"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    Preview
                                  </Button>
                                  {!isPurchased && (
                                    <Button
                                      size="sm"
                                      onClick={() => handlePurchase(sound)}
                                      disabled={!canAfford || purchasing === sound.id}
                                      className="h-7 px-2"
                                    >
                                      {purchasing === sound.id ? (
                                        <span className="animate-spin">⏳</span>
                                      ) : canAfford ? (
                                        <>
                                          <ShoppingCart className="h-3 w-3 mr-1" />
                                          {sound.price_coins} 🪙
                                        </>
                                      ) : (
                                        <>
                                          <Lock className="h-3 w-3 mr-1" />
                                          {sound.price_coins} 🪙
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BeatPadSoundShop;
