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

interface AppCategory {
  name: string;
  items: EarnMethod[];
}

interface ParentCategory {
  title: string;
  emoji: string;
  apps: AppCategory[];
}

const earnHierarchy: ParentCategory[] = [
  {
    title: "Daily",
    emoji: "☀️",
    apps: [
      {
        name: "Daily Rewards",
        items: [
          { name: "Daily Login", description: "Log in each day", coins: "25" },
          { name: "Daily Sticker Pack", description: "Open your free pack each day", coins: "10-50" },
        ],
      },
      {
        name: "Wordle",
        items: [
          { name: "Win Game", description: "Win the daily word game", coins: "5-100" },
        ],
      },
    ],
  },
  {
    title: "Games",
    emoji: "🎮",
    apps: [
      {
        name: "Coloring Book",
        items: [
          { name: "Save Coloring", description: "Save your colored artwork", coins: "5" },
          { name: "Share Coloring", description: "Share to the gallery", coins: "10" },
        ],
      },
      {
        name: "Drink Creator",
        items: [
          { name: "Create Drink", description: "Create custom drinks", coins: "10" },
        ],
      },
      {
        name: "Memory Match",
        items: [
          { name: "Complete Game", description: "Complete games by difficulty", coins: "5-30" },
          { name: "Personal Best", description: "Beat your personal best time", coins: "50-150" },
        ],
      },
      {
        name: "Beat Pad",
        items: [
          { name: "Share Beat", description: "Create and share beats", coins: "10" },
        ],
      },
    ],
  },
  {
    title: "Resources",
    emoji: "📚",
    apps: [
      {
        name: "Recipe Pal",
        items: [
          { name: "Complete Recipe", description: "Complete a recipe", coins: "15" },
        ],
      },
      {
        name: "Chore Chart",
        items: [
          { name: "Complete Chore", description: "Finish a single chore", coins: "5" },
          { name: "All Daily Chores", description: "Complete all chores for the day", coins: "20" },
        ],
      },
      {
        name: "Cash Register",
        items: [
          { name: "Complete Level", description: "Complete a level", coins: "10" },
        ],
      },
      {
        name: "Fitness Center",
        items: [
          { name: "Complete Workout", description: "Log a workout activity", coins: "15" },
          { name: "Weekly Goal", description: "Meet your weekly workout goal", coins: "50" },
        ],
      },
    ],
  },
  {
    title: "Community",
    emoji: "💬",
    apps: [
      {
        name: "Discussions",
        items: [
          { name: "Create Post", description: "Share in discussions", coins: "15" },
          { name: "Add Comment", description: "Comment on posts", coins: "5" },
        ],
      },
      {
        name: "Prayer Requests",
        items: [
          { name: "Submit Request", description: "Submit a prayer request", coins: "10" },
        ],
      },
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
        
        <div className="mt-4 space-y-6">
          {earnHierarchy.map((category) => (
            <div key={category.title}>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-3">
                <span>{category.emoji}</span>
                {category.title}
              </h3>
              <div className="space-y-4 pl-4">
                {category.apps.map((app) => (
                  <div key={app.name}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">{app.name}</h4>
                    <div className="space-y-2 pl-2">
                      {app.items.map((method, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800"
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
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
