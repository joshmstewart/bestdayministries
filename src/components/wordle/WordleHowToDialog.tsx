import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface WordleHowToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    title: "Welcome to Wordle! 🎮",
    content: (
      <div className="space-y-3">
        <p>Guess the secret 5-letter word in 6 tries!</p>
        <p className="text-muted-foreground text-sm">
          Each day has a new themed word. Check the theme at the top for a clue!
        </p>
      </div>
    ),
  },
  {
    title: "How to Play 📝",
    content: (
      <div className="space-y-3">
        <p>Type any 5-letter word and press Enter to guess.</p>
        <p className="text-muted-foreground text-sm">
          Use your keyboard or tap the on-screen keys. The word must be a valid English word.
        </p>
      </div>
    ),
  },
  {
    title: "Color Clues 🎨",
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-green-500 flex items-center justify-center text-white font-bold">A</div>
          <span className="text-sm">Green = Correct letter, correct spot</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-yellow-500 flex items-center justify-center text-white font-bold">B</div>
          <span className="text-sm">Yellow = Correct letter, wrong spot</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground font-bold">C</div>
          <span className="text-sm">Gray = Letter not in word</span>
        </div>
      </div>
    ),
  },
  {
    title: "Hints & Scoring 💡",
    content: (
      <div className="space-y-3">
        <p>You have 3 hints per game. Each hint reveals one letter's position.</p>
        <p className="text-muted-foreground text-sm">
          Earn coins for winning! Fewer guesses and hints = more coins. Check the leaderboard to see how you rank!
        </p>
      </div>
    ),
  },
  {
    title: "Daily Challenge ⏰",
    content: (
      <div className="space-y-3">
        <p>The word resets every day at midnight (MST timezone).</p>
        <p className="text-muted-foreground text-sm">
          Come back daily to keep your streak going and climb the leaderboard. Good luck! 🍀
        </p>
      </div>
    ),
  },
];

const LOCALSTORAGE_KEY = "wordle_howto_seen";

export function WordleHowToDialog({ open, onOpenChange }: WordleHowToDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to first step when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark as seen and close
      localStorage.setItem(LOCALSTORAGE_KEY, "true");
      onOpenChange(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "true");
    onOpenChange(false);
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {step.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 min-h-[120px]">
          {step.content}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "Got it!" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage how-to visibility
export function useWordleHowTo() {
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    // Check if user has seen the how-to before
    const hasSeen = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!hasSeen) {
      // Small delay to let page render first
      const timer = setTimeout(() => setShowHowTo(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return { showHowTo, setShowHowTo };
}
