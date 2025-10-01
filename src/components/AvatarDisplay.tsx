import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import composite1 from "@/assets/avatars/composite-1.png";
import composite2 from "@/assets/avatars/composite-2.png";
import composite3 from "@/assets/avatars/composite-3.png";
import composite4 from "@/assets/avatars/composite-4.png";
import composite5 from "@/assets/avatars/composite-5.png";
import composite6 from "@/assets/avatars/composite-6.png";
import composite7 from "@/assets/avatars/composite-7.png";
import composite8 from "@/assets/avatars/composite-8.png";
import composite9 from "@/assets/avatars/composite-9.png";
import composite10 from "@/assets/avatars/composite-10.png";

const DEFAULT_AVATAR = 1;

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
  
  // Composite 7: avatars 25-28
  if (avatarNumber >= 25 && avatarNumber <= 28) {
    const positions = [
      { x: 0, y: 0 },      // 25: top-left
      { x: 100, y: 0 },    // 26: top-right
      { x: 0, y: 100 },    // 27: bottom-left
      { x: 100, y: 100 },  // 28: bottom-right
    ];
    return { image: composite7, position: positions[avatarNumber - 25] };
  }
  
  // Composite 8: avatars 29-32
  if (avatarNumber >= 29 && avatarNumber <= 32) {
    const positions = [
      { x: 0, y: 0 },      // 29: top-left
      { x: 100, y: 0 },    // 30: top-right
      { x: 0, y: 100 },    // 31: bottom-left
      { x: 100, y: 100 },  // 32: bottom-right
    ];
    return { image: composite8, position: positions[avatarNumber - 29] };
  }
  
  // Composite 9: avatars 33-36
  if (avatarNumber >= 33 && avatarNumber <= 36) {
    const positions = [
      { x: 0, y: 0 },      // 33: top-left
      { x: 100, y: 0 },    // 34: top-right
      { x: 0, y: 100 },    // 35: bottom-left
      { x: 100, y: 100 },  // 36: bottom-right
    ];
    return { image: composite9, position: positions[avatarNumber - 33] };
  }
  
  // Composite 10: avatars 37-40
  if (avatarNumber >= 37 && avatarNumber <= 40) {
    const positions = [
      { x: 0, y: 0 },      // 37: top-left
      { x: 100, y: 0 },    // 38: top-right
      { x: 0, y: 100 },    // 39: bottom-left
      { x: 100, y: 100 },  // 40: bottom-right
    ];
    return { image: composite10, position: positions[avatarNumber - 37] };
  }
  
  return null;
};

export const AvatarDisplay = ({ 
  avatarNumber, 
  displayName, 
  size = "md",
  className 
}: AvatarDisplayProps) => {
  const [effectiveAvatarNumber, setEffectiveAvatarNumber] = useState(avatarNumber);

  useEffect(() => {
    checkAvatarActive();
  }, [avatarNumber]);

  const checkAvatarActive = async () => {
    if (!avatarNumber) {
      setEffectiveAvatarNumber(null);
      return;
    }

    const { data } = await supabase
      .from("avatars")
      .select("is_active")
      .eq("avatar_number", avatarNumber)
      .single();

    if (data && !data.is_active) {
      setEffectiveAvatarNumber(DEFAULT_AVATAR);
    } else {
      setEffectiveAvatarNumber(avatarNumber);
    }
  };

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const config = effectiveAvatarNumber ? getAvatarConfig(effectiveAvatarNumber) : null;

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
