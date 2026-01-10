import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Trophy, Frown, Share2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface WordleResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  won: boolean;
  word: string;
  guessCount: number;
  coinsEarned: number;
  hintsUsed: number;
  onPlayOtherDays?: () => void;
}

export function WordleResultDialog({
  open,
  onOpenChange,
  won,
  word,
  guessCount,
  coinsEarned,
  hintsUsed,
  onPlayOtherDays
}: WordleResultDialogProps) {
  const handleShare = async () => {
    const shareText = won
      ? `🎮 Daily Five - ${guessCount}/6\n${hintsUsed > 0 ? `(${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used)` : 'No hints!'}\n\n🎉 I solved it!`
      : `🎮 Daily Five - X/6\n\n😅 Better luck next time!`;
    
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Copied to clipboard!");
      }
    } catch (error) {
      // User cancelled share
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {won ? (
              <span className="flex items-center justify-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                You Won!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Frown className="h-8 w-8 text-muted-foreground" />
                Game Over
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Word reveal */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">The word was:</p>
            <div className="flex justify-center gap-1.5">
              {word.split("").map((letter, i) => (
                <div
                  key={i}
                  className="w-12 h-12 flex items-center justify-center text-xl font-bold rounded-lg bg-green-500 text-white"
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{guessCount}</p>
              <p className="text-xs text-muted-foreground">Guesses</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{hintsUsed}</p>
              <p className="text-xs text-muted-foreground">Hints Used</p>
            </div>
            <div>
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                <Coins className="h-5 w-5 text-yellow-500" />
                {coinsEarned}
              </p>
              <p className="text-xs text-muted-foreground">Coins Earned</p>
            </div>
          </div>

          {/* Message */}
          {won && (
            <p className="text-center text-muted-foreground">
              {guessCount === 1 && "🤯 Incredible! First try!"}
              {guessCount === 2 && "🎉 Amazing! So quick!"}
              {guessCount === 3 && "🌟 Great job!"}
              {guessCount === 4 && "👏 Well done!"}
              {guessCount === 5 && "😅 Phew, close one!"}
              {guessCount === 6 && "😮‍💨 Just made it!"}
            </p>
          )}

          {!won && (
            <p className="text-center text-muted-foreground">
              Don't worry, come back tomorrow for a new word!
            </p>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
            {onPlayOtherDays && (
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={() => {
                  onOpenChange(false);
                  onPlayOtherDays();
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Play Other Days
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
