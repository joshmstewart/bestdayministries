import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Lightbulb, RefreshCw, Eye, EyeOff, Gamepad2, Trophy, RotateCcw, Loader2, HelpCircle, Calendar } from "lucide-react";
import { WordleHowToDialog, useWordleHowTo } from "@/components/wordle/WordleHowToDialog";
import { toast } from "sonner";
import { showErrorToastWithCopy, showErrorToast } from "@/lib/errorToast";
import { WordleGrid } from "@/components/wordle/WordleGrid";
import { WordleKeyboard } from "@/components/wordle/WordleKeyboard";
import { WordleEasyKeyboard } from "@/components/wordle/WordleEasyKeyboard";
import { WordleEasyModeToggle } from "@/components/wordle/WordleEasyModeToggle";
import { WordleResultDialog } from "@/components/wordle/WordleResultDialog";
import { WordleStats } from "@/components/wordle/WordleStats";
import { WordleLeaderboard } from "@/components/wordle/WordleLeaderboard";
import { WordleDatePicker } from "@/components/wordle/WordleDatePicker";
import confetti from "canvas-confetti";

interface GuessResult {
  guess: string;
  result: ("correct" | "present" | "absent")[];
}

export default function WordleGame() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const { showHowTo, setShowHowTo } = useWordleHowTo();
  const activeTab = searchParams.get("tab") || "play";
  
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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [maxGuesses, setMaxGuesses] = useState(6);
  const [extraRoundsUsed, setExtraRoundsUsed] = useState(0);
  const [roundEnded, setRoundEnded] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isToday, setIsToday] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Easy mode state
  const [easyMode, setEasyMode] = useState(false);
  const [scrambledLetters, setScrambledLetters] = useState<string[] | null>(null);
  const [isBestie, setIsBestie] = useState(false);
  const [easyModePreference, setEasyModePreference] = useState<boolean | null>(null);
  const [savingEasyMode, setSavingEasyMode] = useState(false);

  // Ref for date picker to scroll to it
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Reset game function (admin only)
  const resetWordleGame = async (scope: 'self' | 'admins' | 'all') => {
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-wordle-game', {
        body: { scope }
      });

      if (error) throw error;

      toast.success(data.message || "Game reset successfully");
      setResetDialogOpen(false);
      
      // Reset local state
      setGuessResults([]);
      setCurrentGuess("");
      setGameOver(false);
      setWon(false);
      setCorrectWord(null);
      setHintsUsed(0);
      setLetterHints([]);
      setShowResult(false);
      setCoinsEarned(0);
      setMaxGuesses(6);
      setExtraRoundsUsed(0);
      setRoundEnded(false);
      setCanContinue(false);
      
      // Reload game state
      await loadGameState();
    } catch (error: any) {
      console.error('Error resetting game:', error);
      showErrorToastWithCopy("Failed to reset game", error);
    } finally {
      setResetting(false);
    }
  };

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
  const loadGameState = useCallback(async (dateOverride?: string) => {
    if (!user) return;
    
    const targetDate = dateOverride !== undefined ? dateOverride : selectedDate;
    
    setGameLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-wordle-state", {
        body: targetDate ? { date: targetDate } : {}
      });
      
      if (error) throw error;
      
      if (!data.hasWord) {
        setNoWordAvailable(true);
        // Only try to generate for today
        if (data.isToday !== false) {
          await supabase.functions.invoke("generate-wordle-word");
          // Reload state
          const { data: newData } = await supabase.functions.invoke("get-wordle-state", {
            body: targetDate ? { date: targetDate } : {}
          });
          if (newData?.hasWord) {
            setNoWordAvailable(false);
            setSelectedDate(newData.date);
            setIsToday(newData.isToday);
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
            setExtraRoundsUsed(newData.extraRoundsUsed || 0);
            setRoundEnded(newData.roundEnded || false);
            setCanContinue(newData.canContinue || false);
            // Easy mode state
            setEasyMode(newData.easyMode || false);
            setScrambledLetters(newData.scrambledLetters || null);
            setIsBestie(newData.isBestie || false);
            setEasyModePreference(newData.easyModePreference ?? null);
          }
        }
      } else {
        setNoWordAvailable(false);
        setSelectedDate(data.date);
        setIsToday(data.isToday);
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
        setExtraRoundsUsed(data.extraRoundsUsed || 0);
        setRoundEnded(data.roundEnded || false);
        setCanContinue(data.canContinue || false);
        // Easy mode state
        setEasyMode(data.easyMode || false);
        setScrambledLetters(data.scrambledLetters || null);
        setIsBestie(data.isBestie || false);
        setEasyModePreference(data.easyModePreference ?? null);
        
        if (data.gameOver) {
          setShowResult(true);
        }
      }
    } catch (error) {
      console.error("Error loading game state:", error);
      showErrorToastWithCopy("Failed to load game", error);
    } finally {
      setGameLoading(false);
    }
  }, [user, selectedDate]);

  // Handle date selection
  const handleDateSelect = (date: string) => {
    // Reset game state before loading new date
    setGuessResults([]);
    setCurrentGuess("");
    setGameOver(false);
    setWon(false);
    setCorrectWord(null);
    setHintsUsed(0);
    setLetterHints([]);
    setShowResult(false);
    setCoinsEarned(0);
    setMaxGuesses(6);
    setExtraRoundsUsed(0);
    setRoundEnded(false);
    setCanContinue(false);
    setShowThemeHint(false);
    
    loadGameState(date);
  };

  // Initial load - only runs once when auth is ready
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (!authLoading && isAuthenticated && !initialLoadRef.current) {
      initialLoadRef.current = true;
      loadGameState();
    }
  }, [authLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle easy mode toggle
  const handleEasyModeToggle = async (enabled: boolean) => {
    setSavingEasyMode(true);
    try {
      // Save preference to profile
      const { error } = await supabase
        .from("profiles")
        .update({ wordle_easy_mode_enabled: enabled })
        .eq("id", user?.id);
      
      if (error) throw error;
      
      setEasyModePreference(enabled);
      
      // Reload game state with new mode
      const { data, error: stateError } = await supabase.functions.invoke("get-wordle-state", {
        body: { date: selectedDate, easyMode: enabled }
      });
      
      if (stateError) throw stateError;
      
      if (data?.hasWord) {
        setEasyMode(data.easyMode || false);
        setScrambledLetters(data.scrambledLetters || null);
      }
      
      toast.success(enabled ? "Letter Mode enabled" : "Letter Mode disabled");
    } catch (error) {
      console.error("Error toggling easy mode:", error);
      showErrorToastWithCopy("Failed to save preference", error);
    } finally {
      setSavingEasyMode(false);
    }
  };

  // Handle keyboard input
  const handleKeyPress = useCallback((key: string) => {
    if (gameOver || submitting || roundEnded) return;
    
    if (key === "ENTER") {
      handleSubmitGuess();
    } else if (key === "BACKSPACE") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      // In easy mode, validate that the letter is available
      if (easyMode && scrambledLetters) {
        const usedCounts: Record<string, number> = {};
        for (const l of currentGuess) {
          usedCounts[l] = (usedCounts[l] || 0) + 1;
        }
        const availableCount = scrambledLetters.filter(l => l === key).length;
        const usedCount = usedCounts[key] || 0;
        if (usedCount >= availableCount) {
          return; // Letter not available
        }
      }
      setCurrentGuess(prev => prev + key);
    }
  }, [gameOver, submitting, currentGuess, easyMode, scrambledLetters]);

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
      showErrorToast("Word must be 5 letters");
      return;
    }
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("wordle-guess", {
        body: { guess: currentGuess, date: selectedDate }
      });
      
      if (error) throw error;
      
      if (data.error) {
        showErrorToast(data.error);
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
        
        // Trigger stats refresh
        setStatsRefreshKey(prev => prev + 1);
        
        if (data.won) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        setTimeout(() => setShowResult(true), 500);
      } else if (data.roundEnded && data.canContinue) {
        // Round ended but can continue
        setRoundEnded(true);
        setCanContinue(true);
        setMaxGuesses(data.maxGuesses);
        setExtraRoundsUsed(data.extraRoundsUsed);
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      showErrorToastWithCopy("Failed to submit guess", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    setContinuing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wordle-continue");
      
      if (error) throw error;
      
      if (data.error) {
        showErrorToast(data.error);
        return;
      }

      // Update state with new max guesses
      setMaxGuesses(data.maxGuesses);
      setExtraRoundsUsed(data.extraRoundsUsed);
      setRoundEnded(false);
      setCanContinue(false);
      
      toast.success(`Got 5 more guesses! (${data.remainingExtraRounds} continue${data.remainingExtraRounds === 1 ? '' : 's'} left)`);
    } catch (error) {
      console.error("Error continuing game:", error);
      showErrorToastWithCopy("Failed to continue game", error);
    } finally {
      setContinuing(false);
    }
  };

  const handleUseHint = async () => {
    if (hintsUsed >= 3) {
      showErrorToast("No hints remaining");
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("wordle-guess", {
        body: { useHint: true, date: selectedDate }
      });
      
      if (error) throw error;
      
      if (data.error) {
        showErrorToast(data.error);
        return;
      }

      setLetterHints(prev => [...prev, { position: data.hintPosition, letter: data.hintLetter }]);
      setHintsUsed(prev => prev + 1);
      toast.success(`Hint: Position ${data.hintPosition + 1} is "${data.hintLetter}"`);
    } catch (error) {
      console.error("Error getting hint:", error);
      showErrorToastWithCopy("Failed to get hint", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 pt-24 pb-8 px-4">
          <div className="container max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">Please sign in to play Daily Five</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24 pb-8 px-4">
        <div className="container max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate("/community")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold">Daily Five</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHowTo(true)}
                title="How to Play"
                className="text-muted-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                  title="Reset Game (Admin)"
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setSearchParams({ tab: value })}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="play" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Play
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="play" className="mt-4">
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
                  <Button onClick={() => loadGameState()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </Card>
              ) : (
                <>
                  {/* User stats */}
                  <WordleStats refreshKey={statsRefreshKey} />
                  
                  {/* Past game notice */}
                  {!isToday && (
                    <div className="text-center mb-4 px-4 py-2 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        📅 Playing a past puzzle — counts for stats, not streak
                      </p>
                    </div>
                  )}
                  
                  {/* Theme with inline clue toggle */}
                  {theme && (
                    <div className="text-center mb-4">
                      <p className="text-sm font-medium">
                        {themeEmoji} {isToday ? "Today's" : "This Day's"} Theme: <span className="text-primary">{theme}</span>
                      </p>
                      {themeHint && (
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {showThemeHint ? (
                            <>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Clue:</span> {themeHint}
                              </p>
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
                              className="text-muted-foreground h-6 text-xs px-2"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Show Clue
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Date picker and Letter Reveal button */}
                  <div className="flex justify-center items-center gap-3 mb-4">
                    <WordleDatePicker 
                      selectedDate={selectedDate} 
                      onDateSelect={handleDateSelect}
                      externalOpen={showDatePicker}
                      onExternalOpenChange={setShowDatePicker}
                    />
                    {!gameOver && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUseHint}
                        disabled={hintsUsed >= 3}
                        title="Reveals a letter position"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Reveal Letter ({3 - hintsUsed})
                      </Button>
                    )}
                  </div>

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
                    maxGuesses={maxGuesses}
                    roundEnded={roundEnded}
                  />

                  {/* Continue button when round ended but can continue */}
                  {roundEnded && canContinue && (
                    <div className="flex flex-col items-center gap-3 my-6 p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-center text-muted-foreground">
                        Out of guesses! Want to keep trying?
                      </p>
                      <Button 
                        onClick={handleContinue}
                        disabled={continuing}
                        className="gap-2"
                      >
                        {continuing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Continue (+5 guesses)
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {2 - extraRoundsUsed} continue{2 - extraRoundsUsed === 1 ? '' : 's'} remaining
                      </p>
                    </div>
                  )}

                  {/* Easy mode toggle - only show to Besties */}
                  {!gameOver && isBestie && (
                    <div className="mb-4">
                      <WordleEasyModeToggle
                        enabled={easyMode}
                        onToggle={handleEasyModeToggle}
                        isBestie={isBestie}
                        disabled={savingEasyMode || guessResults.length > 0}
                      />
                      {guessResults.length > 0 && !gameOver && (
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          Mode locked after first guess
                        </p>
                      )}
                    </div>
                  )}

                  {/* Keyboard - Easy mode or regular */}
                  {easyMode && scrambledLetters ? (
                    <WordleEasyKeyboard
                      availableLetters={scrambledLetters}
                      onKeyPress={handleKeyPress}
                      keyboardStatus={keyboardStatus()}
                      disabled={gameOver || submitting || roundEnded}
                      currentGuess={currentGuess}
                    />
                  ) : (
                    <WordleKeyboard
                      onKeyPress={handleKeyPress}
                      keyboardStatus={keyboardStatus()}
                      disabled={gameOver || submitting || roundEnded}
                    />
                  )}

                  {/* Play Other Days button */}
                  <div className="flex justify-center mt-6" ref={datePickerRef}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        datePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Small delay then trigger the date picker
                        setTimeout(() => setShowDatePicker(prev => !prev), 100);
                      }}
                      className="gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Play Previous Days
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-4">
              <WordleLeaderboard />
            </TabsContent>
          </Tabs>

          {/* Result dialog */}
          <WordleResultDialog
            open={showResult}
            onOpenChange={setShowResult}
            won={won}
            word={correctWord || ""}
            guessCount={guessResults.length}
            coinsEarned={coinsEarned}
            hintsUsed={hintsUsed}
            onPlayOtherDays={() => {
              datePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => setShowDatePicker(true), 300);
            }}
          />

          {/* How to Play Dialog */}
          <WordleHowToDialog open={showHowTo} onOpenChange={setShowHowTo} />

          {/* Reset Game Dialog (Admin only) */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Daily Five Game</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Choose who should have their today's game reset:
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => resetWordleGame('self')}
                    disabled={resetting}
                  >
                    {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <div className="space-y-1">
                      <div className="font-semibold">Only Me</div>
                      <div className="text-xs text-muted-foreground">
                        Reset only your game. You'll be able to play again today.
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4"
                    onClick={() => resetWordleGame('admins')}
                    disabled={resetting}
                  >
                    {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <div className="space-y-1">
                      <div className="font-semibold">All Admins & Owners</div>
                      <div className="text-xs text-muted-foreground">
                        Reset game for all admin and owner accounts. Useful for testing.
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-4 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      if (confirm('⚠️ This will reset the game for ALL USERS. Everyone will be able to play again today. Are you sure?')) {
                        resetWordleGame('all');
                      }
                    }}
                    disabled={resetting}
                  >
                    {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <div className="space-y-1">
                      <div className="font-semibold">All Users</div>
                      <div className="text-xs">
                        ⚠️ Reset game for everyone in the system. Use with caution!
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
