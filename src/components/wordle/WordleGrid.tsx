import { cn } from "@/lib/utils";

interface GuessResult {
  guess: string;
  result: ("correct" | "present" | "absent")[];
}

interface WordleGridProps {
  guessResults: GuessResult[];
  currentGuess: string;
  letterHints: { position: number; letter: string }[];
  maxGuesses: number;
  roundEnded?: boolean;
}

export function WordleGrid({ guessResults, currentGuess, letterHints, maxGuesses, roundEnded }: WordleGridProps) {
  const rows = [];
  const totalRows = maxGuesses;
  // Completed guesses
  for (const { guess, result } of guessResults) {
    rows.push(
      <div key={`guess-${rows.length}`} className="flex gap-1.5 justify-center">
        {guess.split("").map((letter, i) => (
          <div
            key={i}
            className={cn(
              "w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all duration-300",
              result[i] === "correct" && "bg-green-500 border-green-500 text-white",
              result[i] === "present" && "bg-yellow-500 border-yellow-500 text-white",
              result[i] === "absent" && "bg-muted border-muted text-muted-foreground"
            )}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {letter}
          </div>
        ))}
      </div>
    );
  }
  
  // Current guess row (if game not over and round not ended)
  if (guessResults.length < totalRows && !roundEnded) {
    const currentRow = currentGuess.padEnd(5, " ").split("");
    rows.push(
      <div key="current" className="flex gap-1.5 justify-center">
        {currentRow.map((letter, i) => {
          const hint = letterHints.find(h => h.position === i);
          const showHint = hint && letter === " ";
          
          return (
            <div
              key={i}
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all",
                letter !== " " && "border-primary scale-105",
                letter === " " && !showHint && "border-border",
                showHint && "border-green-500/50 bg-green-500/10"
              )}
            >
              {letter !== " " ? letter : showHint ? (
                <span className="text-green-600/50">{hint.letter}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }
  
  // Empty rows (only show remaining rows in current round, not if round ended)
  if (!roundEnded) {
    const startRow = guessResults.length + 1;
    for (let i = startRow; i < totalRows; i++) {
      rows.push(
        <div key={`empty-${i}`} className="flex gap-1.5 justify-center">
          {Array(5).fill(null).map((_, j) => {
            const hint = letterHints.find(h => h.position === j);
            
            return (
              <div
                key={j}
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-bold rounded-lg border-2",
                  hint ? "border-green-500/30 bg-green-500/5" : "border-border"
                )}
              >
                {hint && <span className="text-green-600/30">{hint.letter}</span>}
              </div>
            );
          })}
        </div>
      );
    }
  }
  
  return (
    <div className="flex flex-col gap-1.5 mb-6">
      {rows}
    </div>
  );
}
