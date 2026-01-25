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

const earnMethods = [
  { name: "Daily Sticker Pack", description: "Open your free pack each day", coins: "10-50" },
  { name: "Memory Match", description: "Complete games and beat your best time", coins: "25-100" },
  { name: "Brew Blast", description: "Complete levels in the coffee game", coins: "10-50" },
  { name: "Cash Register", description: "Practice making change correctly", coins: "10-25" },
  { name: "Complete Coloring Pages", description: "Finish and save your artwork", coins: "5-15" },
  { name: "Share Creations", description: "Share your coloring pages to the gallery", coins: "10" },
  { name: "Complete Chores", description: "Finish daily tasks and activities", coins: "5-20" },
  { name: "Chore Challenge", description: "Complete the monthly sticker challenge", coins: "50-100" },
  { name: "Beat Pad Creations", description: "Save and share your musical beats", coins: "10-25" },
  { name: "Recipe Pal", description: "Create and save new recipes", coins: "15-30" },
  { name: "Fitness Goals", description: "Complete workout activities", coins: "10-25" },
  { name: "Daily Joke", description: "Read the daily joke", coins: "1" },
  { name: "Card Creations", description: "Design and save greeting cards", coins: "10-20" },
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
        
        <div className="space-y-3 mt-4">
          {earnMethods.map((method, index) => (
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
      </DialogContent>
    </Dialog>
  );
}
