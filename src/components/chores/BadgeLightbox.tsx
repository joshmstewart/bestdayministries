import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ZoomIn } from "lucide-react";
import { BadgeDefinition, BADGE_RARITY_CONFIG } from "@/lib/choreBadgeDefinitions";
import { useCustomBadgeImages } from "@/hooks/useCustomBadgeImages";
import { TextToSpeech } from "@/components/TextToSpeech";

interface BadgeLightboxProps {
  badge: BadgeDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEarned?: boolean;
  earnedDate?: string;
}

export function BadgeLightbox({
  badge,
  open,
  onOpenChange,
  isEarned = false,
  earnedDate,
}: BadgeLightboxProps) {
  if (!badge) return null;

  const rarityConfig = BADGE_RARITY_CONFIG[badge.rarity];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none" hideCloseButton>
        <div className="relative flex flex-col items-center p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 rounded-2xl border-2 border-amber-300 dark:border-amber-700 shadow-2xl">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 hover:bg-amber-100 dark:hover:bg-amber-900"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Rarity badge */}
          <Badge className={`${rarityConfig.bgClass} text-white mb-4`}>
            {rarityConfig.label}
          </Badge>

          {/* Large badge image */}
          <div className={`relative mb-6 ${!isEarned ? 'grayscale opacity-60' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-orange-400/30 rounded-full blur-2xl" />
            <img
              src={badge.imageUrl}
              alt={badge.name}
              className="relative w-48 h-48 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Badge info */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-center text-foreground">
              {badge.name}
            </h2>
            <TextToSpeech 
              text={`${badge.name}. ${badge.description}. ${isEarned ? `You earned this badge!` : `Complete ${badge.threshold} ${badge.category === 'streak' ? 'days in a row' : 'total days'} to unlock this badge.`}`}
              size="icon"
            />
          </div>
          <p className="text-center text-muted-foreground mb-4 max-w-xs">
            {badge.description}
          </p>

          {/* Status */}
          {isEarned && earnedDate ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-full">
              <span className="text-2xl">🏆</span>
              <span className="text-green-700 dark:text-green-300 font-medium">
                Earned {new Date(earnedDate).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
              <span className="text-muted-foreground">
                Complete {badge.threshold} {badge.category === 'streak' ? 'days in a row' : 'total days'} to unlock
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BadgeImageWithZoomProps {
  badge: BadgeDefinition;
  isEarned?: boolean;
  earnedDate?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeImageWithZoom({
  badge,
  isEarned = false,
  earnedDate,
  className = '',
  size = 'md',
}: BadgeImageWithZoomProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const { getBadgeWithCustomImage } = useCustomBadgeImages();

  const effectiveBadge = getBadgeWithCustomImage(badge);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <>
      <button
        onClick={() => setLightboxOpen(true)}
        className={`relative group cursor-pointer transition-transform hover:scale-105 ${className}`}
        title="Click to view larger"
      >
        <img
          src={effectiveBadge.imageUrl}
          alt={badge.name}
          className={`${sizeClasses[size]} object-contain ${!isEarned ? 'grayscale opacity-50' : ''}`}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
          <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
        </div>
      </button>

      <BadgeLightbox
        badge={effectiveBadge}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        isEarned={isEarned}
        earnedDate={earnedDate}
      />
    </>
  );
}
