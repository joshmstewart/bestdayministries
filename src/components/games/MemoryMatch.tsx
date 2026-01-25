import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Clock, Zap, Star, RotateCcw, Home, Package, Check, Gamepad2, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { CoinIcon } from "@/components/CoinIcon";
import { PriceRibbon } from "@/components/ui/price-ribbon";
import { PackCarousel } from "@/components/games/PackCarousel";
import { GameCelebrationDisplay } from "@/components/games/GameCelebrationDisplay";
import { useCelebrationImagePreloader } from "@/hooks/useCelebrationImagePreloader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Default coffee shop theme images
import croissantImg from "@/assets/games/memory-match/croissant.png";
import coffeeBeansImg from "@/assets/games/memory-match/coffee-beans.png";
import muffinImg from "@/assets/games/memory-match/muffin.png";
import donutImg from "@/assets/games/memory-match/donut.png";
import frenchPressImg from "@/assets/games/memory-match/french-press.png";
import cookieImg from "@/assets/games/memory-match/cookie.png";
import milkPitcherImg from "@/assets/games/memory-match/milk-pitcher.png";
import coffeeGrinderImg from "@/assets/games/memory-match/coffee-grinder.png";
import cinnamonSticksImg from "@/assets/games/memory-match/cinnamon-sticks.png";
import sugarBowlImg from "@/assets/games/memory-match/sugar-bowl.png";

type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

interface GameCard {
  id: number;
  imageUrl: string;
  imageName: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface ImagePack {
  id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  is_default: boolean;
  is_purchasable: boolean;
  price_coins: number;
  images: { name: string; image_url: string }[];
  background_color: string | null;
  module_color: string | null;
  card_back_url: string | null;
}

// Default bundled images (always available)
const DEFAULT_IMAGES = [
  { name: "French Press", image_url: frenchPressImg },
  { name: "Croissant", image_url: croissantImg },
  { name: "Coffee Beans", image_url: coffeeBeansImg },
  { name: "Muffin", image_url: muffinImg },
  { name: "Donut", image_url: donutImg },
  { name: "Cookie", image_url: cookieImg },
  { name: "Milk Pitcher", image_url: milkPitcherImg },
  { name: "Coffee Grinder", image_url: coffeeGrinderImg },
  { name: "Cinnamon Sticks", image_url: cinnamonSticksImg },
  { name: "Sugar Bowl", image_url: sugarBowlImg },
];

const DEFAULT_DIFFICULTY_CONFIG = {
  easy: { pairs: 6, coins: 10, label: 'Easy', color: 'bg-green-500' },
  medium: { pairs: 8, coins: 20, label: 'Medium', color: 'bg-yellow-500' },
  hard: { pairs: 10, coins: 40, label: 'Hard', color: 'bg-red-500' },
  extreme: { pairs: 16, coins: 80, label: 'Extreme', color: 'bg-purple-600' },
};

interface MemoryMatchProps {
  onBackgroundColorChange?: (color: string) => void;
  onGameStartedChange?: (started: boolean) => void;
}

export interface MemoryMatchRef {
  resetToSelection: () => void;
}

export const MemoryMatch = forwardRef<MemoryMatchRef, MemoryMatchProps>(({ onBackgroundColorChange, onGameStartedChange }, ref) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasHardMode, setHasHardMode] = useState(false);
  const [hasExtremeMode, setHasExtremeMode] = useState(false);
  const [bestScores, setBestScores] = useState<Record<Difficulty, { moves: number; time: number } | null>>({
    easy: null,
    medium: null,
    hard: null,
    extreme: null,
  });
  const [completionCount, setCompletionCount] = useState(0);
  const [pbRewards, setPbRewards] = useState<Record<Difficulty, number>>({
    easy: 50,
    medium: 75,
    hard: 100,
    extreme: 150,
  });
  
  // Image pack state
  const [availablePacks, setAvailablePacks] = useState<ImagePack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [currentImages, setCurrentImages] = useState(DEFAULT_IMAGES);
  const [currentCardBackUrl, setCurrentCardBackUrl] = useState<string | null>(null);
  const [cardBackLoaded, setCardBackLoaded] = useState(false);
  const [currentColors, setCurrentColors] = useState<{ background: string; module: string }>({
    background: '#F97316',
    module: '#FFFFFF',
  });
  
  const [coinRewards, setCoinRewards] = useState<Record<Difficulty, number>>({
    easy: DEFAULT_DIFFICULTY_CONFIG.easy.coins,
    medium: DEFAULT_DIFFICULTY_CONFIG.medium.coins,
    hard: DEFAULT_DIFFICULTY_CONFIG.hard.coins,
    extreme: DEFAULT_DIFFICULTY_CONFIG.extreme.coins,
  });
  const [changePackDialogOpen, setChangePackDialogOpen] = useState(false);

  // Preload celebration images as soon as component mounts (before game completion)
  useCelebrationImagePreloader(currentUserId);

  const preloadedImageUrlsRef = useRef<Set<string>>(new Set());
  const warmImage = useCallback((url: string | null | undefined) => {
    if (!url) return;
    if (preloadedImageUrlsRef.current.has(url)) return;
    preloadedImageUrlsRef.current.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }, []);

  // Refs for iOS touch handling and processing lock
  const isProcessingRef = useRef(false);
  const lastPointerUpAtRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Create dynamic difficulty config with database coins
  const DIFFICULTY_CONFIG = {
    easy: { ...DEFAULT_DIFFICULTY_CONFIG.easy, coins: coinRewards.easy },
    medium: { ...DEFAULT_DIFFICULTY_CONFIG.medium, coins: coinRewards.medium },
    hard: { ...DEFAULT_DIFFICULTY_CONFIG.hard, coins: coinRewards.hard },
    extreme: { ...DEFAULT_DIFFICULTY_CONFIG.extreme, coins: coinRewards.extreme },
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
    checkHardModeUnlock();
    loadBestScores();
    loadImagePacks();
    loadCoinRewards();
  }, []);

  // Notify parent when gameStarted changes
  useEffect(() => {
    onGameStartedChange?.(gameStarted);
  }, [gameStarted, onGameStartedChange]);

  // Reset game to pack/difficulty selection screen
  const resetToSelection = useCallback(() => {
    setGameStarted(false);
    setGameCompleted(false);
    setCards([]);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setElapsedTime(0);
  }, []);

  // Expose reset function via ref
  useImperativeHandle(ref, () => ({
    resetToSelection,
  }), [resetToSelection]);

  // Update current images and colors when pack selection changes
  useEffect(() => {
    let newBackgroundColor = '#F97316';
    let newCardBackUrl: string | null = null;
    
    if (selectedPackId) {
      const pack = availablePacks.find(p => p.id === selectedPackId);
      if (pack && pack.images.length > 0) {
        setCurrentImages(pack.images);
        newBackgroundColor = pack.background_color || '#F97316';
        setCurrentColors({
          background: newBackgroundColor,
          module: pack.module_color || '#FFFFFF',
        });
        newCardBackUrl = pack.card_back_url;
      }
    } else {
      // Use the default pack from the database if available
      const defaultPack = availablePacks.find(p => p.is_default && p.images.length > 0);
      if (defaultPack) {
        setCurrentImages(defaultPack.images);
        newBackgroundColor = defaultPack.background_color || '#F97316';
        setCurrentColors({
          background: newBackgroundColor,
          module: defaultPack.module_color || '#FFFFFF',
        });
        newCardBackUrl = defaultPack.card_back_url;
      } else {
        setCurrentImages(DEFAULT_IMAGES);
        setCurrentColors({
          background: '#F97316',
          module: '#FFFFFF',
        });
        newCardBackUrl = null;
      }
    }
    
    // Preload card back image before showing it
    setCardBackLoaded(false);
    if (newCardBackUrl) {
      const img = new Image();
      img.onload = () => {
        setCurrentCardBackUrl(newCardBackUrl);
        setCardBackLoaded(true);
      };
      img.onerror = () => {
        setCurrentCardBackUrl(null);
        setCardBackLoaded(true);
      };
      img.src = newCardBackUrl;
    } else {
      setCurrentCardBackUrl(null);
      setCardBackLoaded(true);
    }
    
    // Notify parent of background color change
    onBackgroundColorChange?.(newBackgroundColor);
  }, [selectedPackId, availablePacks, onBackgroundColorChange]);

  // Warm pack assets as soon as we know them (helps before the user starts a game)
  useEffect(() => {
    // Limit to keep it lightweight even if a pack has many images
    const urlsToWarm = currentImages.slice(0, 30).map((i) => i.image_url);
    urlsToWarm.forEach(warmImage);
    // Card back is separately preloaded before being displayed, but warming also helps
    warmImage(currentCardBackUrl);
  }, [currentImages, currentCardBackUrl, warmImage]);

  // Warm ONLY the images used in the current game ASAP after dealing the cards
  useEffect(() => {
    if (!gameStarted) return;
    const uniqueUrls = Array.from(new Set(cards.map((c) => c.imageUrl)));
    uniqueUrls.forEach(warmImage);
  }, [cards, gameStarted, warmImage]);

  const loadImagePacks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Load all active packs with their images
    const { data: packs } = await supabase
      .from('memory_match_packs')
      .select('id, name, description, preview_image_url, is_default, is_purchasable, price_coins, background_color, module_color, card_back_url')
      .eq('is_active', true)
      .order('display_order');

    if (packs) {
      // Load images for each pack
      const packsWithImages: ImagePack[] = await Promise.all(
        packs.map(async (pack) => {
          const { data: images } = await supabase
            .from('memory_match_images')
            .select('name, image_url')
            .eq('pack_id', pack.id)
            .order('display_order');
          
          return {
            ...pack,
            images: images || [],
          };
        })
      );
      
      setAvailablePacks(packsWithImages);
    }

    // Load user's owned packs
    if (user) {
      const { data: owned } = await supabase
        .from('user_memory_match_packs')
        .select('pack_id')
        .eq('user_id', user.id);
      
      if (owned) {
        setOwnedPackIds(owned.map(o => o.pack_id));
      }
    }
  };

  const loadCoinRewards = async () => {
    const { data } = await supabase
      .from('coin_rewards_settings')
      .select('reward_key, coins_amount, is_active')
      .in('reward_key', [
        'memory_match_easy', 'memory_match_medium', 'memory_match_hard', 'memory_match_extreme',
        'memory_match_pb_easy', 'memory_match_pb_medium', 'memory_match_pb_hard', 'memory_match_pb_extreme'
      ]);
    
    if (data) {
      const rewards: Record<Difficulty, number> = {
        easy: DEFAULT_DIFFICULTY_CONFIG.easy.coins,
        medium: DEFAULT_DIFFICULTY_CONFIG.medium.coins,
        hard: DEFAULT_DIFFICULTY_CONFIG.hard.coins,
        extreme: DEFAULT_DIFFICULTY_CONFIG.extreme.coins,
      };
      const pbRewardsData: Record<Difficulty, number> = {
        easy: 50,
        medium: 75,
        hard: 100,
        extreme: 150,
      };
      
      data.forEach(reward => {
        if (reward.is_active) {
          if (reward.reward_key === 'memory_match_easy') rewards.easy = reward.coins_amount;
          if (reward.reward_key === 'memory_match_medium') rewards.medium = reward.coins_amount;
          if (reward.reward_key === 'memory_match_hard') rewards.hard = reward.coins_amount;
          if (reward.reward_key === 'memory_match_extreme') rewards.extreme = reward.coins_amount;
          if (reward.reward_key === 'memory_match_pb_easy') pbRewardsData.easy = reward.coins_amount;
          if (reward.reward_key === 'memory_match_pb_medium') pbRewardsData.medium = reward.coins_amount;
          if (reward.reward_key === 'memory_match_pb_hard') pbRewardsData.hard = reward.coins_amount;
          if (reward.reward_key === 'memory_match_pb_extreme') pbRewardsData.extreme = reward.coins_amount;
        }
      });
      
      setCoinRewards(rewards);
      setPbRewards(pbRewardsData);
    }
  };

  const checkHardModeUnlock = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_store_purchases')
      .select('store_item_id')
      .eq('user_id', user.id);

    // Check Hard Mode
    const hardModeItem = await supabase
      .from('store_items')
      .select('id')
      .eq('name', 'Memory Match - Hard Mode')
      .single();

    if (hardModeItem.data && data?.some(p => p.store_item_id === hardModeItem.data.id)) {
      setHasHardMode(true);
    }

    // Check Extreme Mode
    const extremeModeItem = await supabase
      .from('store_items')
      .select('id')
      .eq('name', 'Memory Match - Extreme Mode')
      .single();

    if (extremeModeItem.data && data?.some(p => p.store_item_id === extremeModeItem.data.id)) {
      setHasExtremeMode(true);
    }
  };

  const loadBestScores = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('game_sessions')
      .select('difficulty, moves_count, time_seconds')
      .eq('user_id', user.id)
      .eq('game_type', 'memory_match')
      .order('time_seconds', { ascending: true });

    if (data) {
      // Set total completion count
      setCompletionCount(data.length);
      
      const scores: Record<Difficulty, { moves: number; time: number } | null> = {
        easy: null,
        medium: null,
        hard: null,
        extreme: null,
      };

      // Track best time per difficulty (primary metric for PB)
      data.forEach(session => {
        const diff = session.difficulty as Difficulty;
        if (!scores[diff] || session.time_seconds < scores[diff]!.time) {
          scores[diff] = {
            moves: session.moves_count,
            time: session.time_seconds,
          };
        }
      });

      setBestScores(scores);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted, startTime]);

  const initializeGame = (selectedDifficulty?: Difficulty) => {
    const diff = selectedDifficulty || difficulty;
    if (selectedDifficulty) {
      setDifficulty(selectedDifficulty);
    }
    const pairCount = DIFFICULTY_CONFIG[diff].pairs;
    // Randomly select images from the available set
    const shuffledImages = [...currentImages].sort(() => Math.random() - 0.5);
    const selectedImages = shuffledImages.slice(0, pairCount);

    // Start loading the exact face images for this round before the first flip
    selectedImages.forEach((img) => warmImage(img.image_url));
    warmImage(currentCardBackUrl);

    const gameCards = [...selectedImages, ...selectedImages]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({
        id: index,
        imageUrl: img.image_url,
        imageName: img.name,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(gameCards);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setGameStarted(true);
    setGameCompleted(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const handleCardClick = useCallback((cardId: number) => {
    // Block if we're still processing a previous non-match
    if (isProcessingRef.current) return;
    
    setFlippedCards(prevFlipped => {
      if (prevFlipped.length === 2 || prevFlipped.includes(cardId)) {
        return prevFlipped; // No change
      }
      
      setCards(prevCards => {
        const clickedCard = prevCards.find(c => c.id === cardId);
        if (!clickedCard || clickedCard.isMatched) {
          return prevCards; // No change
        }
        
        const newFlipped = [...prevFlipped, cardId];
        const updatedCards = prevCards.map(card =>
          card.id === cardId ? { ...card, isFlipped: true } : card
        );
        
        if (newFlipped.length === 2) {
          setMoves(prev => prev + 1);
          const [firstId, secondId] = newFlipped;
          const firstCard = prevCards.find(c => c.id === firstId);
          const secondCard = prevCards.find(c => c.id === secondId);
          
          if (firstCard && secondCard && firstCard.imageUrl === secondCard.imageUrl) {
            // Match found - update cards to matched state
            setMatchedPairs(prev => {
              const newCount = prev + 1;
              if (newCount === DIFFICULTY_CONFIG[difficulty].pairs) {
                completeGame();
              }
              return newCount;
            });
            // Clear flipped after this render
            setTimeout(() => setFlippedCards([]), 0);
            return updatedCards.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isMatched: true, isFlipped: true }
                : card
            );
          } else {
            // No match - lock processing, flip back after delay
            isProcessingRef.current = true;
            setTimeout(() => {
              setCards(pc => pc.map(card =>
                card.id === firstId || card.id === secondId
                  ? { ...card, isFlipped: false }
                  : card
              ));
              setFlippedCards([]);
              isProcessingRef.current = false;
            }, 600);
          }
        }
        
        return updatedCards;
      });
      
      // Return new flipped state
      if (prevFlipped.length < 2 && !prevFlipped.includes(cardId)) {
        return [...prevFlipped, cardId];
      }
      return prevFlipped;
    });
  }, [difficulty, DIFFICULTY_CONFIG]);

  // Pointer event handlers for iOS/Safari compatibility
  const handleCardPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleCardPointerUp = useCallback((cardId: number, e: React.PointerEvent) => {
    e.stopPropagation();
    
    // Check if this was a scroll vs tap (10px threshold)
    if (pointerStartRef.current) {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 10 || dy > 10) {
        pointerStartRef.current = null;
        return; // Was scrolling, not tapping
      }
    }
    
    pointerStartRef.current = null;
    lastPointerUpAtRef.current = Date.now();
    handleCardClick(cardId);
  }, [handleCardClick]);

  const completeGame = async () => {
    setGameCompleted(true);
    const finalTime = Math.floor((Date.now() - startTime) / 1000);
    let coinsEarned = DIFFICULTY_CONFIG[difficulty].coins;
    const score = Math.max(1000 - (moves * 10) - finalTime, 100);
    
    // Check for personal best (beat previous best time)
    const previousBest = bestScores[difficulty];
    const isNewPersonalBest = !previousBest || finalTime < previousBest.time;
    const isFirstCompletion = !previousBest;
    
    // Award PB bonus (only if beating a previous record, not first completion)
    let pbBonus = 0;
    if (isNewPersonalBest && !isFirstCompletion) {
      pbBonus = pbRewards[difficulty];
      coinsEarned += pbBonus;
    }

    // Bigger confetti for personal best!
    confetti({
      particleCount: isNewPersonalBest && !isFirstCompletion ? 200 : 100,
      spread: isNewPersonalBest && !isFirstCompletion ? 100 : 70,
      origin: { y: 0.6 }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save game session
    await supabase
      .from('game_sessions')
      .insert({
        user_id: user.id,
        game_type: 'memory_match',
        difficulty,
        score,
        moves_count: moves + 1,
        time_seconds: finalTime,
        coins_earned: coinsEarned,
      });

    // Award coins
    const { data: profile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', user.id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ coins: (profile.coins || 0) + coinsEarned })
        .eq('id', user.id);

      // Log base game reward
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: DIFFICULTY_CONFIG[difficulty].coins,
          transaction_type: 'game_reward',
          description: `Memory Match ${DIFFICULTY_CONFIG[difficulty].label} completed`,
        });
      
      // Log PB bonus separately if earned
      if (pbBonus > 0) {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: pbBonus,
            transaction_type: 'game_reward',
            description: `🏆 Memory Match ${DIFFICULTY_CONFIG[difficulty].label} - New Personal Best!`,
          });
      }
    }

    // Show appropriate toast
    if (isNewPersonalBest && !isFirstCompletion) {
      toast({
        title: "🏆 NEW PERSONAL BEST!",
        description: `You beat your record by ${previousBest.time - finalTime}s! +${pbBonus} bonus coins! Total: ${coinsEarned} coins`,
      });
    } else {
      toast({
        title: "🎉 Awesome Job!",
        description: `You earned ${coinsEarned} coins! Time: ${formatTime(finalTime)}${previousBest ? ` (Best: ${formatTime(previousBest.time)})` : ''}`,
      });
    }

    loadBestScores();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canUsePack = (pack: ImagePack) => {
    // Pack is usable if: it's the default, user owns it, OR it's not purchasable (free)
    return pack.is_default || !pack.is_purchasable || ownedPackIds.includes(pack.id);
  };

  if (!gameStarted) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card style={{ backgroundColor: currentColors.module }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Star className="h-8 w-8 text-primary" />
              Memory Match Game
            </CardTitle>
            <CardDescription className="text-lg">
              Find matching pairs and earn coins! Choose your difficulty:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Pack Selection - Horizontal Carousel */}
            {availablePacks.length > 0 && (
              <PackCarousel
                packs={availablePacks.filter(p => p.images.length >= 10)}
                selectedPackId={selectedPackId}
                onSelectPack={setSelectedPackId}
                canUsePack={canUsePack}
                onPackPurchased={loadImagePacks}
              />
            )}

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Choose Difficulty
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['easy', 'medium', 'hard', 'extreme'] as Difficulty[]).map((diff) => {
                const config = DIFFICULTY_CONFIG[diff];
                const isLocked = (diff === 'hard' && !hasHardMode) || (diff === 'extreme' && !hasExtremeMode);
                const best = bestScores[diff];

                return (
                  <Card
                    key={diff}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      difficulty === diff ? 'ring-2 ring-primary' : ''
                    } ${isLocked ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (!isLocked) {
                        initializeGame(diff);
                      }
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{config.label}</span>
                        {isLocked && <span className="text-sm">🔒 Locked</span>}
                      </CardTitle>
                      <CardDescription>
                        {config.pairs} pairs • {config.coins} coins
                        {best && (
                          <span className="block text-primary font-medium">
                            Beat {formatTime(best.time)} for +{pbRewards[diff]} bonus!
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {best && (
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">Your Best:</p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{formatTime(best.time)}</span>
                          </p>
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <Trophy className="h-4 w-4 text-primary" />
                            {best.moves} moves
                          </p>
                        </div>
                      )}
                      {isLocked && diff === 'hard' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Unlock Hard Mode in the store for 100 coins!
                        </p>
                      )}
                      {isLocked && diff === 'extreme' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Unlock Extreme Mode in the store for 250 coins!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2 sm:space-y-6">
      <Card className="shadow-lg" style={{ backgroundColor: currentColors.module }}>
        <CardHeader className="px-2 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Memory Match - {DIFFICULTY_CONFIG[difficulty].label}
            </CardTitle>
          </div>
          <div className="flex gap-2 sm:gap-4 text-sm">
            <Badge variant="secondary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              Moves: {moves}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {formatTime(elapsedTime)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-1.5 pb-2 sm:px-6 sm:pb-6">
          {gameCompleted ? (
            <div className="text-center space-y-4 py-4">
              <GameCelebrationDisplay userId={currentUserId} fallbackEmoji="🎉" />
              <div>
                <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                <p className="text-muted-foreground">
                  You completed the game in {moves} moves and {formatTime(elapsedTime)}!
                </p>
                <p className="text-lg font-semibold text-primary mt-2">
                  +{DIFFICULTY_CONFIG[difficulty].coins} coins earned!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total completions: {completionCount}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={() => initializeGame()}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={() => setChangePackDialogOpen(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Change Pack
                </Button>
              </div>

              {/* Change Pack Dialog */}
              <Dialog open={changePackDialogOpen} onOpenChange={setChangePackDialogOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Choose Your Pack
                    </DialogTitle>
                    <DialogDescription>
                      Select a pack and click Play Again to start a new game
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {availablePacks
                      .filter(p => p.images.length >= 10)
                      .sort((a, b) => {
                        const aCanUse = canUsePack(a);
                        const bCanUse = canUsePack(b);
                        if (aCanUse && !bCanUse) return -1;
                        if (!aCanUse && bCanUse) return 1;
                        return 0;
                      })
                      .map((pack) => {
                        const canUse = canUsePack(pack);
                        const isSelected = pack.is_default ? selectedPackId === null : selectedPackId === pack.id;
                        const previewImage = pack.preview_image_url || pack.images[0]?.image_url;
                        
                        return (
                          <div
                            key={pack.id}
                            onClick={() => {
                              if (canUse) {
                                setSelectedPackId(pack.is_default ? null : pack.id);
                              } else if (pack.is_purchasable) {
                                navigate('/store');
                                setChangePackDialogOpen(false);
                              }
                            }}
                            className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                              isSelected 
                                ? 'border-primary ring-2 ring-primary/50 scale-105' 
                                : canUse 
                                  ? 'border-border hover:border-primary/50'
                                  : 'border-border hover:border-yellow-500/50'
                            }`}
                          >
                            {!canUse && pack.is_purchasable && (
                              <PriceRibbon price={pack.price_coins} position="top-right" size="sm" />
                            )}
                            
                            <div className="aspect-square bg-muted">
                              {previewImage ? (
                                <img 
                                  src={previewImage} 
                                  alt={pack.name}
                                  className={`w-full h-full object-cover ${!canUse ? 'grayscale-[30%]' : ''}`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-white truncate">
                                  {pack.name}
                                </span>
                                {!canUse && <span className="text-xs">🔒</span>}
                              </div>
                            </div>
                            
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5 z-20">
                                <Check className="w-2.5 h-2.5 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => {
                      setChangePackDialogOpen(false);
                      initializeGame();
                    }}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Play Again
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className={`grid gap-1 sm:gap-3 ${
              difficulty === 'easy' ? 'grid-cols-3 sm:grid-cols-4' :
              difficulty === 'medium' ? 'grid-cols-4' :
              difficulty === 'hard' ? 'grid-cols-4 sm:grid-cols-5' :
              'grid-cols-4 sm:grid-cols-8'
            }`}>
              {cards.map((card) => (
                <button
                  key={card.id}
                  onPointerDown={handleCardPointerDown}
                  onPointerUp={(e) => handleCardPointerUp(card.id, e)}
                  onClick={() => {
                    // Fallback for non-pointer devices, prevent double-trigger
                    if (Date.now() - lastPointerUpAtRef.current < 500) return;
                    handleCardClick(card.id);
                  }}
                  className={`game-card aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all transform hover:scale-105 overflow-hidden touch-manipulation select-none ${
                    card.isFlipped || card.isMatched
                      ? 'bg-gradient-warm'
                      : 'bg-secondary hover:bg-secondary/80'
                  } ${card.isMatched ? 'opacity-50 cursor-default' : ''}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  disabled={card.isMatched || flippedCards.includes(card.id)}
                  aria-label={`Card ${card.id + 1}${card.isFlipped || card.isMatched ? `: ${card.imageName}` : ''}`}
                >
                  {(card.isFlipped || card.isMatched) ? (
                    <img 
                      src={card.imageUrl} 
                      alt={card.imageName}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-contain p-2"
                    />
                  ) : currentCardBackUrl && cardBackLoaded ? (
                    <img 
                      src={currentCardBackUrl}
                      alt="Card back"
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-muted-foreground">?</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

MemoryMatch.displayName = 'MemoryMatch';
