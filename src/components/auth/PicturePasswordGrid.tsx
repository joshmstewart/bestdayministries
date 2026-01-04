import { PICTURE_PASSWORD_IMAGES, getPictureById } from "@/lib/picturePasswordImages";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PicturePasswordGridProps {
  selectedSequence: string[];
  onSelect: (pictureId: string) => void;
  onClear: () => void;
  maxSelections?: number;
  disabled?: boolean;
}

export const PicturePasswordGrid = ({
  selectedSequence,
  onSelect,
  onClear,
  maxSelections = 4,
  disabled = false,
}: PicturePasswordGridProps) => {
  const handlePictureClick = (pictureId: string) => {
    if (disabled || selectedSequence.length >= maxSelections) return;
    onSelect(pictureId);
  };

  return (
    <div className="space-y-4">
      {/* Selected sequence display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your code:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((index) => {
              const pictureId = selectedSequence[index];
              const picture = pictureId ? getPictureById(pictureId) : null;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all",
                    picture
                      ? "border-primary bg-primary/10"
                      : "border-dashed border-muted-foreground/30 bg-muted/30"
                  )}
                >
                  {picture ? (
                    <div className="relative">
                      <picture.icon className={cn("w-7 h-7", picture.color)} />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">{index + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled || selectedSequence.length === 0}
          className="text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Start Over
        </Button>
      </div>

      {/* Picture grid - 6 columns x 4 rows */}
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {PICTURE_PASSWORD_IMAGES.map((picture) => {
          const Icon = picture.icon;
          const isDisabled = disabled || selectedSequence.length >= maxSelections;
          
          return (
            <button
              key={picture.id}
              onClick={() => handlePictureClick(picture.id)}
              disabled={isDisabled}
              className={cn(
                "aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                "hover:scale-105 hover:border-primary hover:bg-primary/5",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                "bg-card"
              )}
              title={picture.name}
            >
              <Icon className={cn("w-8 h-8 sm:w-10 sm:h-10", picture.color)} />
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                {picture.name}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSequence.length === maxSelections && (
        <p className="text-center text-sm text-green-600 font-medium">
          ✓ Code complete! Tap "Start Over" to change it.
        </p>
      )}
    </div>
  );
};
