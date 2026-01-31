import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getAvatarConfig, getAvatarName } from "@/lib/avatarConfig";
import { supabase } from "@/integrations/supabase/client";

interface AvatarThumbnailProps {
  avatarNumber: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function AvatarThumbnail({ avatarNumber, size = "sm", className, showName = false }: AvatarThumbnailProps) {
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const config = getAvatarConfig(avatarNumber);
  const name = getAvatarName(avatarNumber);
  
  useEffect(() => {
    // Load storage URL for uploaded avatars (49+)
    if (config?.isStorageAvatar && avatarNumber >= 49) {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(`avatar-${avatarNumber}.png`);
      
      if (urlData) {
        setStorageUrl(urlData.publicUrl);
      }
    }
  }, [avatarNumber, config?.isStorageAvatar]);
  
  if (!config) {
    return (
      <div className={cn("rounded-full bg-muted flex items-center justify-center text-muted-foreground", sizeClasses[size], className)}>
        ?
      </div>
    );
  }
  
  // For storage avatars
  if (config.isStorageAvatar) {
    return (
      <div className={cn("flex items-center gap-2", showName && "gap-2")}>
        <div
          className={cn("rounded-full overflow-hidden bg-muted", sizeClasses[size], className)}
          style={{
            backgroundImage: storageUrl ? `url(${storageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {showName && <span className="text-sm">{name}</span>}
      </div>
    );
  }
  
  // For composite or individual avatars
  const backgroundStyle = config.position 
    ? {
        backgroundImage: config.image ? `url(${config.image})` : undefined,
        backgroundSize: '200% 200%',
        backgroundPosition: `${config.position.x}% ${config.position.y}%`,
      }
    : {
        backgroundImage: config.image ? `url(${config.image})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
  
  if (showName) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn("rounded-full overflow-hidden", sizeClasses[size], className)}
          style={backgroundStyle}
          title={name}
        />
        <span className="text-sm">{name}</span>
      </div>
    );
  }
  
  return (
    <div
      className={cn("rounded-full overflow-hidden", sizeClasses[size], className)}
      style={backgroundStyle}
      title={name}
    />
  );
}
