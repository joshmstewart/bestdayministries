import { getPictureById } from "@/lib/picturePasswordImages";
import { cn } from "@/lib/utils";

interface PicturePasswordDisplayProps {
  sequence: string[];
  size?: "sm" | "md" | "lg";
  showNames?: boolean;
  showNumbers?: boolean;
}

export const PicturePasswordDisplay = ({
  sequence,
  size = "md",
  showNames = true,
  showNumbers = true,
}: PicturePasswordDisplayProps) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const numberSizes = {
    sm: "w-3 h-3 text-[8px]",
    md: "w-4 h-4 text-xs",
    lg: "w-5 h-5 text-sm",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 sm:gap-3">
        {sequence.map((pictureId, index) => {
          const picture = getPictureById(pictureId);
          if (!picture) return null;

          const Icon = picture.icon;

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  sizeClasses[size],
                  "rounded-xl border-2 border-primary/30 bg-primary/5 flex items-center justify-center relative"
                )}
              >
                <Icon className={cn(iconSizes[size], picture.color)} />
                {showNumbers && (
                  <span
                    className={cn(
                      numberSizes[size],
                      "absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold"
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              {showNames && (
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {picture.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
