import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CoinIcon } from "@/components/CoinIcon";

interface AllWaysToEarnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EarnMethod {
  name: string;
  description: string;
  coins: string;
}

interface EarnCategory {
  title: string;
  emoji: string;
  items: EarnMethod[];
}

const earnCategories: EarnCategory[] = [
  {
    title: "Daily",
    emoji: "☀️",
    items: [
      { name: "Daily Login", description: "Log in each day", coins: "25" },
      { name: "Daily Sticker Pack", description: "Open your free pack each day", coins: "10-50" },
    ],
  },
  {
    title: "Games",
    emoji: "🎮",
    items: [
      { name: "Memory Match", description: "Complete games by difficulty", coins: "5-15" },
      { name: "Memory Match PB", description: "Beat your personal best time", coins: "50-100" },
      { name: "Cash Register", description: "Complete levels", coins: "10" },
      { name: "Wordle", description: "Win the daily word game", coins: "5-100" },
    ],
  },
  {
    title: "Coloring Book",
    emoji: "🎨",
    items: [
      { name: "Save Coloring", description: "Save your colored artwork", coins: "5" },
      { name: "Share Coloring", description: "Share to the gallery", coins: "10" },
    ],
  },
  {
    title: "Creativity",
    emoji: "✨",
    items: [
      { name: "Beat Pad", description: "Create and share beats", coins: "10" },
      { name: "Card Maker", description: "Create and share cards", coins: "10" },
      { name: "Drink Lab", description: "Create custom drinks", coins: "10" },
      { name: "Recipe Pal", description: "Complete recipes", coins: "15" },
    ],
  },
  {
    title: "Fitness",
    emoji: "💪",
    items: [
      { name: "Complete Workout", description: "Log a workout activity", coins: "15" },
      { name: "Weekly Goal", description: "Meet your weekly workout goal", coins: "50" },
    ],
  },
  {
    title: "Chores",
    emoji: "✅",
    items: [
      { name: "Complete Chore", description: "Finish a single chore", coins: "5" },
      { name: "All Daily Chores", description: "Complete all chores for the day", coins: "20" },
    ],
  },
  {
    title: "Community",
    emoji: "💬",
    items: [
      { name: "Create Post", description: "Share in discussions", coins: "15" },
      { name: "Add Comment", description: "Comment on posts", coins: "5" },
      { name: "Prayer Request", description: "Submit a prayer request", coins: "10" },
    ],
  },
];

export function AllWaysToEarnDialog({ open, onOpenChange }: AllWaysToEarnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <span className="text-2xl">✨</span>
            All Ways to Earn Coins
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 mt-4">
          {earnCategories.map((category) => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <span>{category.emoji}</span>
                {category.title}
              </h3>
              <div className="space-y-2">
                {category.items.map((method, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{method.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <span className="font-bold text-sm text-yellow-700 dark:text-yellow-400">{method.coins}</span>
                      <CoinIcon size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
