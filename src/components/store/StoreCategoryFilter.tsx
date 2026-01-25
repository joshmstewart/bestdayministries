import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StoreCategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  games: "🎮 Games",
  fitness: "💪 Fitness",
  creative: "🎨 Creative",
  social: "👥 Social",
  rewards: "🏆 Rewards",
  themes: "🎨 Themes",
  avatars: "👤 Avatars",
  locations: "📍 Locations",
  packs: "📦 Packs",
};

export function StoreCategoryFilter({ 
  categories, 
  selectedCategories, 
  onCategoriesChange 
}: StoreCategoryFilterProps) {
  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
  };

  const handleSelectAll = () => {
    onCategoriesChange([...categories]);
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 relative"
          >
            <Filter className="h-4 w-4" />
            Filter
            {selectedCategories.length > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {selectedCategories.length}
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
              <span className="text-sm font-medium">Filter by category</span>
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
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category);
                
                return (
                  <label
                    key={category}
                    className={cn(
                      "flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                      "hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleCategoryToggle(category)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{getCategoryLabel(category)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Show selected categories as chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.slice(0, 3).map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => handleCategoryToggle(category)}
            >
              {getCategoryLabel(category)}
              <X className="h-3 w-3 ml-0.5" />
            </Badge>
          ))}
          {selectedCategories.length > 3 && (
            <Badge variant="secondary">
              +{selectedCategories.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
