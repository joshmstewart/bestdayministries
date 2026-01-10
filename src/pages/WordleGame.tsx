import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lightbulb, RefreshCw, Coins, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { WordleGrid } from "@/components/wordle/WordleGrid";
import { WordleKeyboard } from "@/components/wordle/WordleKeyboard";
import { WordleResultDialog } from "@/components/wordle/WordleResultDialog";
import { WordleStats } from "@/components/wordle/WordleStats";
import confetti from "canvas-confetti";

interface GuessResult {
  guess: string;
  result: ("correct" | "present" | "absent")[];
}

export default function WordleGame() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [gameLoading, setGameLoading] = useState(true);
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
  const [showResult, setShowResult] = useState(false);
  const [letterHints, setLetterHints] = useState<{ position: number; letter: string }[]>([]);
  const [noWordAvailable, setNoWordAvailable] = useState(false);
  const [showThemeHint, setShowThemeHint] = useState(false);

  // Build keyboard status from guesses
  const keyboardStatus = useCallback(() => {
    const status: Record<string, "correct" | "present" | "absent"> = {};
    
    for (const { guess, result } of guessResults) {
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const currentStatus = status[letter];
        const newStatus = result[i];
        
        // Priority: correct > present > absent
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
    
    setGameLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-wordle-state");
      
      if (error) throw error;
      
      if (!data.hasWord) {
        setNoWordAvailable(true);
        // Try to generate a word
        await supabase.functions.invoke("generate-wordle-word");
        // Reload state
        const { data: newData } = await supabase.functions.invoke("get-wordle-state");
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
        }
      } else {
        setTheme(data.theme);
        setThemeEmoji(data.themeEmoji);
        setThemeHint(data.themeHint);
        setGuessResults(data.guessResults || []);
        setHintsUsed(data.hintsUsed || 0);
        setGameOver(data.gameOver);
        setWon(data.won);
        setCorrectWord(data.word);
        setCoinsEarned(data.coinsEarned || 0);
        
        if (data.gameOver) {
          setShowResult(true);
        }
      }
    } catch (error) {
      console.error("Error loading game state:", error);
      toast.error("Failed to load game");
    } finally {
      setGameLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadGameState();
    }
  }, [authLoading, isAuthenticated, loadGameState]);

  // Handle keyboard input
  const handleKeyPress = useCallback((key: string) => {
    if (gameOver || submitting) return;
    
    if (key === "ENTER") {
      handleSubmitGuess();
    } else if (key === "BACKSPACE") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  }, [gameOver, submitting, currentGuess]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

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

      // Add the new guess result
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
        
        setTimeout(() => setShowResult(true), 500);
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
      toast.success(`Hint: Position ${data.hintPosition + 1} is "${data.hintLetter}"`);
    } catch (error) {
      console.error("Error getting hint:", error);
      toast.error("Failed to get hint");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-24 pb-8 px-4">
        <div className="container max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to play Wordle</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-8 px-4">
      <div className="container max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/community")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold">Wordle</h1>
            {theme && (
              <p className="text-sm text-muted-foreground">
                {themeEmoji} Today's theme: {theme}
              </p>
            )}
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {gameLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : noWordAvailable ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No Word Available</h2>
            <p className="text-muted-foreground mb-6">
              Today's word is being generated. Please try again in a moment.
            </p>
            <Button onClick={loadGameState}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </Card>
        ) : (
          <>
            {/* User stats */}
            <WordleStats />
            {/* Theme hint - hidden by default */}
            {themeHint && (
              <Card className="p-3 mb-4 bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  {showThemeHint ? (
                    <>
                      <p className="text-sm text-center">
                        <span className="font-medium">Hint:</span> {themeHint}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
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
                      className="text-muted-foreground"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Show Theme Hint
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Hint button */}
            {!gameOver && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseHint}
                  disabled={hintsUsed >= 3}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Use Hint ({3 - hintsUsed} left)
                </Button>
              </div>
            )}

            {/* Letter hints display */}
            {letterHints.length > 0 && (
              <div className="flex justify-center gap-2 mb-4">
                {letterHints.map((hint, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-700 rounded text-sm font-mono">
                    Position {hint.position + 1}: {hint.letter}
                  </span>
                ))}
              </div>
            )}

            {/* Game grid */}
            <WordleGrid
              guessResults={guessResults}
              currentGuess={currentGuess}
              letterHints={letterHints}
            />

            {/* Keyboard */}
            <WordleKeyboard
              onKeyPress={handleKeyPress}
              keyboardStatus={keyboardStatus()}
              disabled={gameOver || submitting}
            />
          </>
        )}

        {/* Result dialog */}
        <WordleResultDialog
          open={showResult}
          onOpenChange={setShowResult}
          won={won}
          word={correctWord || ""}
          guessCount={guessResults.length}
          coinsEarned={coinsEarned}
          hintsUsed={hintsUsed}
        />
      </div>
    </main>
  );
}
