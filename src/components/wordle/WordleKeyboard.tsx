import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";

interface WordleKeyboardProps {
  onKeyPress: (key: string) => void;
  keyboardStatus: Record<string, "correct" | "present" | "absent">;
  disabled?: boolean;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
];

export function WordleKeyboard({ onKeyPress, keyboardStatus, disabled }: WordleKeyboardProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:gap-1.5 items-center w-full px-1">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 sm:gap-1 w-full justify-center">
          {row.map((key) => {
            const status = keyboardStatus[key];
            const isSpecial = key === "ENTER" || key === "BACKSPACE";
            
            return (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                disabled={disabled}
                className={cn(
                  "flex items-center justify-center font-semibold rounded-md transition-all touch-manipulation",
                  "hover:opacity-80 active:scale-95 disabled:opacity-50",
                  isSpecial 
                    ? "px-3 sm:px-4 h-14 sm:h-14 text-sm sm:text-sm min-w-[52px] sm:min-w-[60px]" 
                    : "flex-1 max-w-[36px] sm:max-w-[40px] h-14 sm:h-14 text-base sm:text-base font-bold",
                  !status && "bg-muted text-foreground",
                  status === "correct" && "bg-green-500 text-white",
                  status === "present" && "bg-yellow-500 text-white",
                  status === "absent" && "bg-zinc-700 text-zinc-400"
                )}
              >
                {key === "BACKSPACE" ? <Delete className="h-5 w-5" /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
