import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProfileAvatarUrl } from "@/hooks/useProfileAvatarUrl";

interface AvatarDisplayProps {
  /** Fitness avatar UUID from profiles.profile_avatar_id */
  profileAvatarId?: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export const AvatarDisplay = ({
  profileAvatarId,
  displayName,
  size = "md",
  className,
}: AvatarDisplayProps) => {
  const avatarUrl = useProfileAvatarUrl(profileAvatarId);

  if (avatarUrl) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full overflow-hidden border-2 border-border bg-muted shrink-0",
          className
        )}
        style={{
          backgroundImage: `url(${avatarUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        title={displayName}
      />
    );
  }

  // Fallback — show initials
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold">
        {displayName?.charAt(0)?.toUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  );
};
