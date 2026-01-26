import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeTrialTimerProps {
  durationSeconds: number;
  isActive: boolean;
  onTimeUp: () => void;
}

export function TimeTrialTimer({ durationSeconds, isActive, onTimeUp }: TimeTrialTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);

  useEffect(() => {
    setRemainingSeconds(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const isLowTime = remainingSeconds <= 10;
  const isCritical = remainingSeconds <= 5;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-lg px-4 py-2 font-mono transition-colors",
        isLowTime && "border-orange-500 text-orange-500",
        isCritical && "border-red-500 text-red-500 animate-pulse bg-red-500/10"
      )}
    >
      <Timer className={cn("h-4 w-4 mr-2", isCritical && "animate-bounce")} />
      {formatTime(remainingSeconds)}
      {isLowTime && <AlertTriangle className="h-4 w-4 ml-2" />}
    </Badge>
  );
}
