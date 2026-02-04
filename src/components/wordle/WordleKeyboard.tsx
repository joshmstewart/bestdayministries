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
    <div className="flex flex-col gap-1 items-center w-full">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-[5px] w-full justify-center px-1">
          {row.map((key) => {
            const status = keyboardStatus[key];
            const isSpecial = key === "ENTER" || key === "BACKSPACE";
            
            return (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                disabled={disabled}
              className={cn(
                "flex items-center justify-center font-bold rounded-md transition-all touch-manipulation select-none",
                "hover:opacity-80 active:scale-95 disabled:opacity-50",
                isSpecial 
                  ? "px-1.5 h-14 text-[10px] sm:text-xs min-w-[44px] sm:min-w-[52px]" 
                  : "flex-1 h-14 text-lg sm:text-xl",
                  key === "ENTER" && "bg-primary text-primary-foreground",
                  key !== "ENTER" && !status && "bg-muted text-foreground",
                  key !== "ENTER" && status === "correct" && "bg-green-500 text-white",
                  key !== "ENTER" && status === "present" && "bg-yellow-500 text-white",
                  key !== "ENTER" && status === "absent" && "bg-zinc-700 text-zinc-400"
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
