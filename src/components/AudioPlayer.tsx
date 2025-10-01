import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  className?: string;
  variant?: "large" | "compact";
}

export default function AudioPlayer({ src, className, variant = "large" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    setHasInteracted(true);
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  if (variant === "compact" || hasInteracted) {
    return (
      <div className={cn("flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-lg", className)}>
        <audio ref={audioRef} src={src} />
        
        <Button
          onClick={togglePlay}
          size="icon"
          className="shrink-0 bg-primary hover:bg-primary/90"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Volume2 className="w-5 h-5 text-primary shrink-0" />
      </div>
    );
  }

  // Large initial view
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-2 border-primary/20 rounded-2xl", className)}>
      <audio ref={audioRef} src={src} />
      
      <div className="flex flex-col items-center gap-4">
        <Volume2 className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-lg font-semibold text-center">Listen to Audio</p>
      </div>

      <Button
        onClick={togglePlay}
        size="lg"
        className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90 hover:scale-110 transition-transform"
      >
        <Play className="w-10 h-10 ml-1" />
      </Button>

      <p className="text-sm text-muted-foreground">Click to play</p>
    </div>
  );
}
