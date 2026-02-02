import { cn } from '@/lib/utils';

interface AvatarEmotionDisplayProps {
  emoji: string;
  emotionName: string;
  avatarImage?: { url: string; cropScale: number } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-base',
  md: 'w-10 h-10 text-2xl',
  lg: 'w-12 h-12 text-3xl',
};

/**
 * Displays either an avatar emotion image or fallback emoji.
 * Handles the circular crop with proper scaling.
 */
export function AvatarEmotionDisplay({
  emoji,
  emotionName,
  avatarImage,
  size = 'md',
  className,
}: AvatarEmotionDisplayProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarImage?.url) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden flex-shrink-0 bg-muted",
          sizeClass,
          className
        )}
        title={emotionName}
      >
        <img
          src={avatarImage.url}
          alt={emotionName}
          className="w-full h-full object-cover"
          style={{
            transform: `scale(${avatarImage.cropScale})`,
            transformOrigin: 'center',
          }}
        />
      </div>
    );
  }

  // Fallback to emoji
  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        sizeClass,
        className
      )}
      title={emotionName}
    >
      {emoji}
    </div>
  );
}
