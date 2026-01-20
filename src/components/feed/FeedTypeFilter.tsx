import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Music, Palette, Image, MessageSquare, FolderOpen, Trophy,
  Calendar, HandHeart, Dumbbell, ChefHat, GlassWater, Laugh, X
} from "lucide-react";
import { ItemType, ITEM_TYPE_LABELS } from "@/hooks/useCommunityFeed";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface FeedTypeFilterProps {
  selectedType: ItemType | null;
  onTypeChange: (type: ItemType | null) => void;
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
};

const typeColors: Record<ItemType, string> = {
  beat: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20",
  card: "bg-pink-500/10 text-pink-500 border-pink-500/20 hover:bg-pink-500/20",
  coloring: "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20",
  post: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20",
  album: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20",
  chore_art: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
  event: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20",
  prayer: "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20",
  workout: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
  recipe: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20",
  drink: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20",
  joke: "bg-lime-500/10 text-lime-500 border-lime-500/20 hover:bg-lime-500/20",
};

const FILTER_ORDER: ItemType[] = [
  'post', 'album', 'event', 'beat', 'coloring', 'card', 
  'recipe', 'drink', 'joke', 'prayer', 'workout', 'chore_art'
];

export function FeedTypeFilter({ selectedType, onTypeChange }: FeedTypeFilterProps) {
  return (
    <div className="relative">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
          {/* All button */}
          <Button
            variant={selectedType === null ? "default" : "outline"}
            size="sm"
            onClick={() => onTypeChange(null)}
            className="shrink-0"
          >
            All
          </Button>

          {/* Type filter buttons */}
          {FILTER_ORDER.map((type) => {
            const Icon = typeIcons[type];
            const isSelected = selectedType === type;
            
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => onTypeChange(isSelected ? null : type)}
                className={cn(
                  "shrink-0 gap-1.5",
                  isSelected && typeColors[type],
                  isSelected && "border-2"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {ITEM_TYPE_LABELS[type]}
                {isSelected && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Active filter indicator */}
      {selectedType && (
        <Badge 
          variant="secondary" 
          className="absolute -top-2 -right-2 text-xs px-1.5"
        >
          1
        </Badge>
      )}
    </div>
  );
}