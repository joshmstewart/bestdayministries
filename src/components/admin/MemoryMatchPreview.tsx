import { useState, useEffect } from "react";
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

  // Filter to only images with valid URLs
  const validImages = images.filter(img => img.image_url);
  const pairCount = Math.min(6, Math.floor(validImages.length)); // Use up to 6 pairs for preview

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

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(cardId)) return;
    if (cards[cardId].isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    setCards(cards.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped;

      if (cards[first].imageUrl === cards[second].imageUrl) {
        setCards(cards.map(card =>
          card.id === first || card.id === second
            ? { ...card, isMatched: true }
            : card
        ));
        setMatchedPairs(matchedPairs + 1);
        setFlippedCards([]);

        if (matchedPairs + 1 === pairCount) {
          setGameCompleted(true);
        }
      } else {
        setTimeout(() => {
          setCards(cards.map(card =>
            card.id === first || card.id === second
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

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
                  onClick={() => handleCardClick(card.id)}
                  className={`aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all transform hover:scale-105 overflow-hidden border-2 ${
                    card.isFlipped || card.isMatched
                      ? 'bg-gradient-warm border-primary'
                      : 'bg-secondary hover:bg-secondary/80 border-border'
                  } ${card.isMatched ? 'opacity-50 cursor-default' : ''}`}
                  disabled={card.isMatched || flippedCards.includes(card.id)}
                  aria-label={`Card ${card.id + 1}${card.isFlipped || card.isMatched ? `: ${card.imageName}` : ''}`}
                >
                  {(card.isFlipped || card.isMatched) ? (
                    <img 
                      src={card.imageUrl} 
                      alt={card.imageName}
                      className="w-full h-full object-cover"
                    />
                  ) : cardBackUrl ? (
                    <img 
                      src={cardBackUrl} 
                      alt="Card back"
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
