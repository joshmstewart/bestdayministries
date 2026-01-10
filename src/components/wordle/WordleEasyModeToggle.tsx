import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shuffle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WordleEasyModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isBestie: boolean;
  disabled?: boolean;
}

export function WordleEasyModeToggle({ 
  enabled, 
  onToggle, 
  isBestie,
  disabled 
}: WordleEasyModeToggleProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
      <Shuffle className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="easy-mode" className="text-sm font-medium cursor-pointer flex-1">
        Letter Mode
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px]">
            <p>
              {isBestie 
                ? "Letter Mode shows you the letters to arrange. Turn off for a challenge!"
                : "Letter Mode shows you the letters to arrange - just figure out the order!"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Switch
        id="easy-mode"
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
