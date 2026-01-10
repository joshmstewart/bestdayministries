import { cn } from "@/lib/utils";
import { Delete, CornerDownLeft } from "lucide-react";

interface WordleEasyKeyboardProps {
  availableLetters: string[];
  onKeyPress: (key: string) => void;
  keyboardStatus: Record<string, "correct" | "present" | "absent">;
  disabled?: boolean;
  currentGuess: string;
}

export function WordleEasyKeyboard({ 
  availableLetters, 
  onKeyPress, 
  keyboardStatus, 
  disabled,
  currentGuess 
}: WordleEasyKeyboardProps) {
  // Count how many of each letter is available vs used in current guess
  const getLetterAvailability = (letter: string) => {
    const availableCount = availableLetters.filter(l => l === letter).length;
    const usedCount = currentGuess.split('').filter(l => l === letter).length;
    return availableCount - usedCount;
  };

  // Get unique letters while preserving the scrambled order for display
  const uniqueLetters = [...new Set(availableLetters)];

  return (
    <div className="flex flex-col gap-3 items-center">
      {/* Available letters display */}
      <div className="text-sm text-muted-foreground mb-2">
        Arrange these letters:
      </div>
      
      {/* Letter tiles */}
      <div className="flex gap-2 flex-wrap justify-center">
        {availableLetters.map((letter, index) => {
          const status = keyboardStatus[letter];
          const timesAvailable = availableLetters.slice(0, index + 1).filter(l => l === letter).length;
          const usedCount = currentGuess.split('').filter(l => l === letter).length;
          const isUsed = usedCount >= timesAvailable;
          
          return (
            <button
              key={`${letter}-${index}`}
              onClick={() => !isUsed && onKeyPress(letter)}
              disabled={disabled || isUsed}
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center font-bold text-lg rounded-lg transition-all",
                "border-2",
                isUsed && "opacity-30 scale-90",
                !isUsed && "hover:scale-105 active:scale-95",
                !status && "bg-muted text-foreground border-muted-foreground/30",
                status === "correct" && "bg-green-500 text-white border-green-600",
                status === "present" && "bg-yellow-500 text-white border-yellow-600",
                status === "absent" && "bg-zinc-700 text-zinc-400 border-zinc-600"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onKeyPress("BACKSPACE")}
          disabled={disabled || currentGuess.length === 0}
          className={cn(
            "flex items-center justify-center gap-2 px-4 h-12 font-semibold rounded-lg transition-all",
            "bg-muted text-foreground hover:opacity-80 active:scale-95",
            "disabled:opacity-50"
          )}
        >
          <Delete className="h-5 w-5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
        
        <button
          onClick={() => onKeyPress("ENTER")}
          disabled={disabled || currentGuess.length !== 5}
          className={cn(
            "flex items-center justify-center gap-2 px-6 h-12 font-semibold rounded-lg transition-all",
            "bg-primary text-primary-foreground hover:opacity-80 active:scale-95",
            "disabled:opacity-50"
          )}
        >
          <CornerDownLeft className="h-5 w-5" />
          <span>Enter</span>
        </button>
      </div>
    </div>
  );
}
