import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarDisplay } from "@/lib/avatarUtils";
import { cn } from "@/lib/utils";

interface AvatarDisplayProps {
  avatarNumber?: number | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const AvatarDisplay = ({ 
  avatarNumber, 
  displayName, 
  size = "md",
  className 
}: AvatarDisplayProps) => {
  const avatar = getAvatarDisplay(avatarNumber);
  
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-16 w-16 text-2xl"
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback 
        className={cn(
          avatar.bgColor, 
          avatar.textColor,
          "font-bold flex items-center justify-center"
        )}
      >
        <span role="img" aria-label={`Avatar ${avatarNumber || 'default'}`}>
          {avatar.emoji}
        </span>
      </AvatarFallback>
    </Avatar>
  );
};
