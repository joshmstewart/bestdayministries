import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Eye, EyeOff, Lightbulb, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface GuessResult {
  guess: string;
  result: ("correct" | "present" | "absent")[];
}

interface DailyFivePopupProps {
  onComplete?: () => void;
}

export function DailyFivePopup({ onComplete }: DailyFivePopupProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentGuess, setCurrentGuess] = useState("");
  const [guessResults, setGuessResults] = useState<GuessResult[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [correctWord, setCorrectWord] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [themeEmoji, setThemeEmoji] = useState<string | null>(null);
  const [themeHint, setThemeHint] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [letterHints, setLetterHints] = useState<{ position: number; letter: string }[]>([]);
  const [noWordAvailable, setNoWordAvailable] = useState(false);
  const [showThemeHint, setShowThemeHint] = useState(false);
  const [maxGuesses, setMaxGuesses] = useState(6);
  const [roundEnded, setRoundEnded] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  // Build keyboard status from guesses
  const keyboardStatus = useCallback(() => {
    const status: Record<string, "correct" | "present" | "absent"> = {};
    
    for (const { guess, result } of guessResults) {
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const currentStatus = status[letter];
        const newStatus = result[i];
        
        if (newStatus === "correct") {
          status[letter] = "correct";
        } else if (newStatus === "present" && currentStatus !== "correct") {
          status[letter] = "present";
        } else if (!currentStatus) {
          status[letter] = "absent";
        }
      }
    }
    
    return status;
  }, [guessResults]);

  // Load game state
  const loadGameState = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-wordle-state", {});
      
      if (error) throw error;
      
      if (!data.hasWord) {
        setNoWordAvailable(true);
        // Try to generate
        await supabase.functions.invoke("generate-wordle-word");
        const { data: newData } = await supabase.functions.invoke("get-wordle-state", {});
        if (newData?.hasWord) {
          setNoWordAvailable(false);
          setTheme(newData.theme);
          setThemeEmoji(newData.themeEmoji);
          setThemeHint(newData.themeHint);
          setGuessResults(newData.guessResults || []);
          setHintsUsed(newData.hintsUsed || 0);
          setGameOver(newData.gameOver);
          setWon(newData.won);
          setCorrectWord(newData.word);
          setCoinsEarned(newData.coinsEarned || 0);
          setMaxGuesses(newData.maxGuesses || 6);
          setRoundEnded(newData.roundEnded || false);
          setCanContinue(newData.canContinue || false);
        }
      } else {
        setNoWordAvailable(false);
        setTheme(data.theme);
        setThemeEmoji(data.themeEmoji);
        setThemeHint(data.themeHint);
        setGuessResults(data.guessResults || []);
        setHintsUsed(data.hintsUsed || 0);
        setGameOver(data.gameOver);
        setWon(data.won);
        setCorrectWord(data.word);
        setCoinsEarned(data.coinsEarned || 0);
        setMaxGuesses(data.maxGuesses || 6);
        setRoundEnded(data.roundEnded || false);
        setCanContinue(data.canContinue || false);
      }
    } catch (error) {
      console.error("Error loading game state:", error);
      toast.error("Failed to load game");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Handle keyboard input
  const handleKeyPress = useCallback((key: string) => {
    if (gameOver || submitting || roundEnded) return;
    
    if (key === "ENTER") {
      handleSubmitGuess();
    } else if (key === "BACKSPACE") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  }, [gameOver, submitting, currentGuess, roundEnded]);

  const handleSubmitGuess = async () => {
    if (currentGuess.length !== 5) {
      toast.error("Word must be 5 letters");
      return;
    }
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wordle-guess", {
        body: { guess: currentGuess }
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGuessResults(prev => [...prev, { guess: currentGuess, result: data.result }]);
      setCurrentGuess("");
      
      if (data.gameOver) {
        setGameOver(true);
        setWon(data.won);
        setCorrectWord(data.word);
        setCoinsEarned(data.coinsEarned || 0);
        
        if (data.won) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } else if (data.roundEnded && data.canContinue) {
        setRoundEnded(true);
        setCanContinue(true);
        setMaxGuesses(data.maxGuesses);
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      toast.error("Failed to submit guess");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseHint = async () => {
    if (hintsUsed >= 3) {
      toast.error("No hints remaining");
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("wordle-guess", {
        body: { useHint: true }
      });
      
      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setLetterHints(prev => [...prev, { position: data.hintPosition, letter: data.hintLetter }]);
      setHintsUsed(prev => prev + 1);
      toast.success(`Position ${data.hintPosition + 1} is "${data.hintLetter}"`);
    } catch (error) {
      console.error("Error getting hint:", error);
      toast.error("Failed to get hint");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-4 space-y-3">
        {/* Theme skeleton */}
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        {/* Grid skeleton */}
        <div className="flex flex-col gap-1">
          {[...Array(3)].map((_, row) => (
            <div key={row} className="flex gap-1 justify-center">
              {[...Array(5)].map((_, col) => (
                <div key={col} className="w-10 h-10 bg-muted animate-pulse rounded border-2 border-border" />
              ))}
            </div>
          ))}
        </div>
        {/* Keyboard skeleton */}
        <div className="flex flex-col gap-1 items-center mt-2">
          {[10, 9, 7].map((count, row) => (
            <div key={row} className="flex gap-0.5">
              {[...Array(count)].map((_, key) => (
                <div key={key} className="w-7 h-9 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (noWordAvailable) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">Today's word is being generated...</p>
        <Button onClick={() => loadGameState()}>Retry</Button>
      </div>
    );
  }

  // Compact grid rendering
  const renderGrid = () => {
    const rows = [];
    const totalRows = Math.min(maxGuesses, 6); // Show max 6 rows in popup
    
    // Completed guesses
    for (const { guess, result } of guessResults.slice(-5)) { // Show last 5 guesses
      rows.push(
        <div key={`guess-${rows.length}`} className="flex gap-1 justify-center">
          {guess.split("").map((letter, i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-10 flex items-center justify-center text-lg font-bold rounded border-2",
                result[i] === "correct" && "bg-green-500 border-green-500 text-white",
                result[i] === "present" && "bg-yellow-500 border-yellow-500 text-white",
                result[i] === "absent" && "bg-muted border-muted text-muted-foreground"
              )}
            >
              {letter}
            </div>
          ))}
        </div>
      );
    }
    
    // Current guess row (if game not over)
    if (!gameOver && !roundEnded && rows.length < totalRows) {
      const currentRow = currentGuess.padEnd(5, " ").split("");
      rows.push(
        <div key="current" className="flex gap-1 justify-center">
          {currentRow.map((letter, i) => {
            const hint = letterHints.find(h => h.position === i);
            const showHint = hint && letter === " ";
            
            return (
              <div
                key={i}
                className={cn(
                  "w-10 h-10 flex items-center justify-center text-lg font-bold rounded border-2",
                  letter !== " " && "border-primary",
                  letter === " " && !showHint && "border-border",
                  showHint && "border-green-500/50 bg-green-500/10"
                )}
              >
                {letter !== " " ? letter : showHint ? (
                  <span className="text-green-600/50 text-sm">{hint.letter}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }
    
    return <div className="flex flex-col gap-1 mb-4">{rows}</div>;
  };

  // Compact keyboard
  const renderKeyboard = () => {
    const KEYBOARD_ROWS = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M"]
    ];
    const status = keyboardStatus();
    
    return (
      <div className="flex flex-col gap-1 items-center">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-0.5">
            {row.map((key) => {
              const keyStatus = status[key];
              return (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  disabled={gameOver || submitting || roundEnded}
                  className={cn(
                    "w-7 h-9 flex items-center justify-center text-xs font-semibold rounded transition-all",
                    "hover:opacity-80 active:scale-95 disabled:opacity-50",
                    !keyStatus && "bg-muted text-foreground",
                    keyStatus === "correct" && "bg-green-500 text-white",
                    keyStatus === "present" && "bg-yellow-500 text-white",
                    keyStatus === "absent" && "bg-zinc-700 text-zinc-400"
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
        <div className="flex gap-1 mt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleKeyPress("BACKSPACE")}
            disabled={gameOver || submitting || roundEnded || currentGuess.length === 0}
            className="h-8 px-3 text-xs"
          >
            Delete
          </Button>
          <Button
            size="sm"
            onClick={() => handleKeyPress("ENTER")}
            disabled={gameOver || submitting || roundEnded || currentGuess.length !== 5}
            className="h-8 px-4 text-xs"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enter"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      {/* Theme */}
      {theme && (
        <div className="text-center mb-3">
          <p className="text-sm font-medium">
            {themeEmoji} Theme: <span className="text-primary">{theme}</span>
          </p>
          {themeHint && (
            <div className="flex items-center justify-center gap-1 mt-1">
              {showThemeHint ? (
                <>
                  <p className="text-xs text-muted-foreground">{themeHint}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setShowThemeHint(false)}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThemeHint(true)}
                  className="text-muted-foreground h-5 text-xs px-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Clue
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Letter hints display */}
      {letterHints.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mb-2">
          {letterHints.map((hint, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-green-500/20 text-green-700 rounded text-xs font-mono">
              #{hint.position + 1}: {hint.letter}
            </span>
          ))}
        </div>
      )}

      {/* Game grid */}
      {renderGrid()}

      {/* Game over message */}
      {gameOver && (
        <div className={cn(
          "text-center mb-4 p-3 rounded-lg",
          won ? "bg-green-500/20" : "bg-red-500/20"
        )}>
          <p className="font-bold text-lg">
            {won ? "🎉 You got it!" : "😔 Better luck next time!"}
          </p>
          <p className="text-sm text-muted-foreground">
            The word was: <span className="font-mono font-bold">{correctWord}</span>
          </p>
          {coinsEarned > 0 && (
            <p className="text-sm text-yellow-600">+{coinsEarned} coins earned!</p>
          )}
        </div>
      )}

      {/* Keyboard or actions */}
      {!gameOver ? (
        <>
          {/* Hint button */}
          {!roundEnded && (
            <div className="mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseHint}
                disabled={hintsUsed >= 3}
                className="text-xs h-7"
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                Reveal Letter ({3 - hintsUsed})
              </Button>
            </div>
          )}
          {renderKeyboard()}
        </>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <Button
            variant="outline"
            onClick={() => {
              onComplete?.();
              navigate("/games/daily-five?tab=leaderboard");
            }}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Leaderboard & Stats
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="text-xs text-muted-foreground mt-3">
        {guessResults.length}/{maxGuesses} guesses
      </div>
    </div>
  );
}
