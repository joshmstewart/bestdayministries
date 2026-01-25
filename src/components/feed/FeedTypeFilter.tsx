import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Music, Palette, Image, MessageSquare, FolderOpen, Trophy,
  Calendar, HandHeart, Dumbbell, ChefHat, GlassWater, Laugh, Filter, X, Megaphone
} from "lucide-react";
import { ItemType, ITEM_TYPE_LABELS } from "@/hooks/useCommunityFeed";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FeedTypeFilterProps {
  selectedTypes: ItemType[];
  onTypesChange: (types: ItemType[]) => void;
}

const typeIcons: Record<ItemType, React.ElementType> = {
  beat: Music,
  card: Image,
  coloring: Palette,
  post: MessageSquare,
  album: FolderOpen,
  chore_art: Trophy,
  event: Calendar,
  prayer: HandHeart,
  workout: Dumbbell,
  recipe: ChefHat,
  drink: GlassWater,
  joke: Laugh,
  announcement: Megaphone,
};

const typeColors: Record<ItemType, string> = {
  beat: "text-purple-500",
  card: "text-pink-500",
  coloring: "text-orange-500",
  post: "text-blue-500",
  album: "text-green-500",
  chore_art: "text-yellow-500",
  event: "text-indigo-500",
  prayer: "text-rose-500",
  workout: "text-emerald-500",
  recipe: "text-amber-500",
  drink: "text-cyan-500",
  joke: "text-lime-500",
  announcement: "text-primary",
};

const FILTER_ORDER: ItemType[] = [
  'post', 'album', 'event', 'beat', 'coloring', 'card', 
  'recipe', 'drink', 'joke', 'prayer', 'workout', 'chore_art'
];

export function FeedTypeFilter({ selectedTypes, onTypesChange }: FeedTypeFilterProps) {
  const handleTypeToggle = (type: ItemType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleClearAll = () => {
    onTypesChange([]);
  };

  const handleSelectAll = () => {
    onTypesChange([...FILTER_ORDER]);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 relative"
          >
            <Filter className="h-4 w-4" />
            Filter
            {selectedTypes.length > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {selectedTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3 bg-popover border border-border z-50" 
          align="start"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter by type</span>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={handleSelectAll}
                >
                  All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={handleClearAll}
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
              {FILTER_ORDER.map((type) => {
                const Icon = typeIcons[type];
                const isSelected = selectedTypes.includes(type);
                
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                      "hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleTypeToggle(type)}
                      className="h-4 w-4"
                    />
                    <Icon className={cn("h-4 w-4", typeColors[type])} />
                    <span className="text-sm">{ITEM_TYPE_LABELS[type]}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Show selected types as chips */}
      {selectedTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTypes.slice(0, 3).map((type) => {
            const Icon = typeIcons[type];
            return (
              <Badge
                key={type}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleTypeToggle(type)}
              >
                <Icon className={cn("h-3 w-3", typeColors[type])} />
                {ITEM_TYPE_LABELS[type]}
                <X className="h-3 w-3 ml-0.5" />
              </Badge>
            );
          })}
          {selectedTypes.length > 3 && (
            <Badge variant="secondary">
              +{selectedTypes.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
