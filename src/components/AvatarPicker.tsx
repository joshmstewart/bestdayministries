import { Label } from "@/components/ui/label";
import { AVAILABLE_AVATARS, getAvatarDisplay } from "@/lib/avatarUtils";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  selectedAvatar: number | null;
  onSelectAvatar: (avatarNumber: number) => void;
}

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }: AvatarPickerProps) => {
  return (
    <div className="space-y-3">
      <Label>Choose Your Avatar</Label>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg bg-muted/20">
        {AVAILABLE_AVATARS.map((avatarNum) => {
          const avatar = getAvatarDisplay(avatarNum);
          const isSelected = selectedAvatar === avatarNum;
          
          return (
            <button
              key={avatarNum}
              type="button"
              onClick={() => onSelectAvatar(avatarNum)}
              className={cn(
                "relative p-3 rounded-lg transition-all border-2",
                avatar.bgColor,
                isSelected 
                  ? "border-primary scale-110 shadow-lg ring-2 ring-primary ring-offset-2" 
                  : "border-transparent hover:scale-105 hover:border-primary/50"
              )}
              title={`Avatar ${avatarNum}`}
            >
              <span className="text-2xl" role="img" aria-label={`Avatar ${avatarNum}`}>
                {avatar.emoji}
              </span>
              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
