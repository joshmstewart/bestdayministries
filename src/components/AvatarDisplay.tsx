import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import composite1 from "@/assets/avatars/composite-1.png";
import composite2 from "@/assets/avatars/composite-2.png";
import composite3 from "@/assets/avatars/composite-3.png";
import composite4 from "@/assets/avatars/composite-4.png";
import composite5 from "@/assets/avatars/composite-5.png";
import composite6 from "@/assets/avatars/composite-6.png";

interface AvatarDisplayProps {
  avatarNumber?: number | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Map avatar numbers to composite images and positions
const getAvatarConfig = (avatarNumber: number) => {
  // Composite 1: avatars 1-4 (2x2 grid)
  if (avatarNumber >= 1 && avatarNumber <= 4) {
    const positions = [
      { x: 0, y: 0 },      // 1: top-left
      { x: 100, y: 0 },    // 2: top-right
      { x: 0, y: 100 },    // 3: bottom-left
      { x: 100, y: 100 },  // 4: bottom-right
    ];
    return { image: composite1, position: positions[avatarNumber - 1] };
  }
  
  // Composite 2: avatars 5-8
  if (avatarNumber >= 5 && avatarNumber <= 8) {
    const positions = [
      { x: 0, y: 0 },      // 5: top-left
      { x: 100, y: 0 },    // 6: top-right
      { x: 0, y: 100 },    // 7: bottom-left
      { x: 100, y: 100 },  // 8: bottom-right
    ];
    return { image: composite2, position: positions[avatarNumber - 5] };
  }
  
  // Composite 3: avatars 9-12
  if (avatarNumber >= 9 && avatarNumber <= 12) {
    const positions = [
      { x: 0, y: 0 },      // 9: top-left
      { x: 100, y: 0 },    // 10: top-right
      { x: 0, y: 100 },    // 11: bottom-left
      { x: 100, y: 100 },  // 12: bottom-right
    ];
    return { image: composite3, position: positions[avatarNumber - 9] };
  }
  
  // Composite 4: avatars 13-16
  if (avatarNumber >= 13 && avatarNumber <= 16) {
    const positions = [
      { x: 0, y: 0 },      // 13: top-left
      { x: 100, y: 0 },    // 14: top-right
      { x: 0, y: 100 },    // 15: bottom-left
      { x: 100, y: 100 },  // 16: bottom-right
    ];
    return { image: composite4, position: positions[avatarNumber - 13] };
  }
  
  // Composite 5: avatars 17-20
  if (avatarNumber >= 17 && avatarNumber <= 20) {
    const positions = [
      { x: 0, y: 0 },      // 17: top-left
      { x: 100, y: 0 },    // 18: top-right
      { x: 0, y: 100 },    // 19: bottom-left
      { x: 100, y: 100 },  // 20: bottom-right
    ];
    return { image: composite5, position: positions[avatarNumber - 17] };
  }
  
  // Composite 6: avatars 21-24
  if (avatarNumber >= 21 && avatarNumber <= 24) {
    const positions = [
      { x: 0, y: 0 },      // 21: top-left
      { x: 100, y: 0 },    // 22: top-right
      { x: 0, y: 100 },    // 23: bottom-left
      { x: 100, y: 100 },  // 24: bottom-right
    ];
    return { image: composite6, position: positions[avatarNumber - 21] };
  }
  
  return null;
};

export const AvatarDisplay = ({ 
  avatarNumber, 
  displayName, 
  size = "md",
  className 
}: AvatarDisplayProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const config = avatarNumber ? getAvatarConfig(avatarNumber) : null;

  if (config) {
    return (
      <div 
        className={cn(
          sizeClasses[size], 
          "rounded-full overflow-hidden border-2 border-border bg-muted shrink-0",
          className
        )}
        style={{
          backgroundImage: `url(${config.image})`,
          backgroundSize: '200% 200%',
          backgroundPosition: `${config.position.x}% ${config.position.y}%`,
        }}
        title={displayName}
      />
    );
  }

  // Fallback for no avatar selected
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold">
        {displayName?.charAt(0)?.toUpperCase() || '?'}
      </AvatarFallback>
    </Avatar>
  );
};
