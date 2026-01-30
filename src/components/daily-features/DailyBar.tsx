import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, PenTool, BookOpen, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { QuickMoodPicker } from "./QuickMoodPicker";
import { DailyFortunePopup } from "./DailyFortunePopup";
import { DailyScratchCard } from "@/components/DailyScratchCard";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DailyBarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  emoji?: string;
  gradient: string;
  bgGradient: string;
}

const DAILY_ITEMS: DailyBarItem[] = [
  {
    id: "mood",
    icon: <span className="text-2xl">🌈</span>,
    label: "Mood",
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
  },
  {
    id: "daily-five",
    icon: <PenTool className="w-5 h-5" />,
    label: "Daily Five",
    emoji: "🎯",
    gradient: "from-teal-500 to-cyan-500",
    bgGradient: "from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20",
  },
  {
    id: "fortune",
    icon: <Sparkles className="w-5 h-5" />,
    label: "Fortune",
    emoji: "✨",
    gradient: "from-indigo-500 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20",
  },
  {
    id: "stickers",
    icon: <Package className="w-5 h-5" />,
    label: "Stickers",
    emoji: "🎁",
    gradient: "from-orange-500 to-yellow-500",
    bgGradient: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
  },
];

export function DailyBar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const handleItemClick = (itemId: string) => {
    if (itemId === "daily-five") {
      // Navigate to Daily Five game
      navigate("/games/daily-five");
    } else {
      setActivePopup(itemId);
    }
  };

  return (
    <div className="w-full">
      {/* Daily Bar Container */}
      <div className="bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 rounded-2xl p-3 border border-border/50">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground hidden sm:block">Daily:</span>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {DAILY_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl",
                  "bg-gradient-to-br transition-all duration-300",
                  item.bgGradient,
                  "hover:scale-110 hover:shadow-lg active:scale-95",
                  "border border-transparent hover:border-primary/20",
                  activePopup === item.id && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br shadow-md transition-transform",
                  item.gradient,
                  "text-white"
                )}>
                  {item.icon}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {item.label}
                </span>
                
                {/* Pulse indicator for items with activity */}
                {item.id === "stickers" && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mood Popup */}
      <Dialog open={activePopup === "mood"} onOpenChange={(open) => !open && setActivePopup(null)}>
        <DialogContent className="max-w-md" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🌈</span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                How are you feeling?
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Select your mood for today
            </DialogDescription>
          </DialogHeader>
          <QuickMoodPicker onComplete={() => setActivePopup(null)} />
        </DialogContent>
      </Dialog>

      {/* Fortune Popup */}
      <Dialog open={activePopup === "fortune"} onOpenChange={(open) => !open && setActivePopup(null)}>
        <DialogContent className="max-w-lg" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Daily Inspiration
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Today's inspirational message
            </DialogDescription>
          </DialogHeader>
          <DailyFortunePopup onClose={() => setActivePopup(null)} />
        </DialogContent>
      </Dialog>

      {/* Stickers Popup */}
      <Dialog open={activePopup === "stickers"} onOpenChange={(open) => !open && setActivePopup(null)}>
        <DialogContent className="max-w-sm" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <span className="bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
                Daily Sticker Pack
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Open your daily sticker pack
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <DailyScratchCard />
            <Button 
              variant="outline" 
              onClick={() => {
                setActivePopup(null);
                navigate("/sticker-album");
              }}
              className="mt-2"
            >
              View Full Album
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
