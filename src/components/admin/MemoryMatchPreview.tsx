import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RotateCcw, Zap, Clock, Trophy, Play } from "lucide-react";

interface PreviewImage {
  name: string;
  image_url: string | null;
}

interface GameCard {
  id: number;
  imageUrl: string;
  imageName: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packName: string;
  images: PreviewImage[];
  cardBackUrl?: string | null;
  backgroundColor?: string | null;
  moduleColor?: string | null;
}

export const MemoryMatchPreview = ({
  open,
  onOpenChange,
  packName,
  images,
  cardBackUrl,
  backgroundColor,
  moduleColor,
}: MemoryMatchPreviewProps) => {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Refs for iOS touch handling and processing lock
  const isProcessingRef = useRef(false);
  const lastPointerUpAtRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Preload (keeps preview responsive like the main game)
  const preloadedImageUrlsRef = useRef<Set<string>>(new Set());
  const warmImage = useCallback((url: string | null | undefined) => {
    if (!url) return;
    if (preloadedImageUrlsRef.current.has(url)) return;
    preloadedImageUrlsRef.current.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }, []);

  // Filter to only images with valid URLs
  const validImages = images.filter(img => img.image_url);
  const pairCount = Math.min(6, Math.floor(validImages.length)); // Use up to 6 pairs for preview

  useEffect(() => {
    validImages.slice(0, 24).forEach((i) => warmImage(i.image_url));
    warmImage(cardBackUrl);
  }, [validImages, cardBackUrl, warmImage]);

  useEffect(() => {
    const uniqueUrls = Array.from(new Set(cards.map((c) => c.imageUrl)));
    uniqueUrls.forEach(warmImage);
  }, [cards, warmImage]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !gameCompleted) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, gameCompleted, startTime]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setGameStarted(false);
      setGameCompleted(false);
      setCards([]);
      setFlippedCards([]);
      setMoves(0);
      setMatchedPairs(0);
      setElapsedTime(0);
    }
  }, [open]);

  const initializeGame = () => {
    // Randomly select images from the available set
    const shuffledImages = [...validImages].sort(() => Math.random() - 0.5);
    const selectedImages = shuffledImages.slice(0, pairCount);
    const gameCards = [...selectedImages, ...selectedImages]
      .sort(() => Math.random() - 0.5)
      .map((img, index) => ({
        id: index,
        imageUrl: img.image_url!,
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
        return prevFlipped;
      }
      
      setCards(prevCards => {
        const clickedCard = prevCards.find(c => c.id === cardId);
        if (!clickedCard || clickedCard.isMatched) {
          return prevCards;
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
            // Match found
            setMatchedPairs(prev => {
              const newCount = prev + 1;
              if (newCount === pairCount) {
                setGameCompleted(true);
              }
              return newCount;
            });
            setTimeout(() => setFlippedCards([]), 0);
            return updatedCards.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isMatched: true, isFlipped: true }
                : card
            );
          } else {
            // No match - flip back after delay
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
      
      if (prevFlipped.length < 2 && !prevFlipped.includes(cardId)) {
        return [...prevFlipped, cardId];
      }
      return prevFlipped;
    });
  }, [pairCount]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bgColor = backgroundColor || '#F97316';
  const modColor = moduleColor || '#FFFFFF';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ 
          background: `radial-gradient(ellipse at center, ${bgColor}40 0%, transparent 70%), ${modColor}`,
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎮 Preview: {packName}
          </DialogTitle>
          <DialogDescription>
            Test how this pack plays in the Memory Match game
          </DialogDescription>
        </DialogHeader>

        {validImages.length < 2 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              This pack needs at least 2 images with generated icons to preview.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Currently has {validImages.length} valid image(s).
            </p>
          </div>
        ) : !gameStarted ? (
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl">🃏</div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Ready to Preview?</h3>
              <p className="text-muted-foreground">
                Using {pairCount} pairs from {validImages.length} available images
              </p>
            </div>
            {cardBackUrl && (
              <div className="flex justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Card Back:</p>
                  <img
                    src={cardBackUrl}
                    alt="Card back"
                    className="w-20 h-20 rounded-lg border-2 border-border object-cover"
                  />
                </div>
              </div>
            )}
            <Button onClick={initializeGame} size="lg">
              <Play className="h-5 w-5 mr-2" />
              Start Preview Game
            </Button>
          </div>
        ) : gameCompleted ? (
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl">🎉</div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Complete!</h3>
              <p className="text-muted-foreground">
                Finished in {moves} moves and {formatTime(elapsedTime)}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={initializeGame}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex gap-4 justify-center">
              <Badge variant="secondary" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Moves: {moves}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatTime(elapsedTime)}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                {matchedPairs}/{pairCount}
              </Badge>
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-4 gap-3">
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
                  className={`aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all transform hover:scale-105 overflow-hidden border-2 touch-manipulation select-none ${
                    card.isFlipped || card.isMatched
                      ? 'bg-gradient-warm border-primary'
                      : 'bg-secondary hover:bg-secondary/80 border-border'
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
                      className="w-full h-full object-cover"
                    />
                  ) : cardBackUrl ? (
                    <img 
                      src={cardBackUrl} 
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

            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={initializeGame}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
