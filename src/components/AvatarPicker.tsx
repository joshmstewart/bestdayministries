import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import composite1 from "@/assets/avatars/composite-1.png";
import composite2 from "@/assets/avatars/composite-2.png";
import composite3 from "@/assets/avatars/composite-3.png";
import composite4 from "@/assets/avatars/composite-4.png";

interface AvatarPickerProps {
  selectedAvatar: number | null;
  onSelectAvatar: (avatarNumber: number) => void;
}

const AVATAR_COUNT = 16;

const AVATAR_CATEGORIES = {
  humans: { label: "Humans", avatars: [1, 2, 3, 4, 13] },
  animals: { label: "Animals", avatars: [5, 6, 7, 8, 15] },
  monsters: { label: "Monsters", avatars: [9, 10, 11, 12, 14] },
  shapes: { label: "Shapes", avatars: [16] },
};

const getAvatarConfig = (avatarNumber: number) => {
  if (avatarNumber >= 1 && avatarNumber <= 4) {
    const positions = [
      { x: 0, y: 0 },      // 1: top-left
      { x: 100, y: 0 },    // 2: top-right
      { x: 0, y: 100 },    // 3: bottom-left
      { x: 100, y: 100 },  // 4: bottom-right
    ];
    return { image: composite1, position: positions[avatarNumber - 1] };
  }
  
  if (avatarNumber >= 5 && avatarNumber <= 8) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite2, position: positions[avatarNumber - 5] };
  }
  
  if (avatarNumber >= 9 && avatarNumber <= 12) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite3, position: positions[avatarNumber - 9] };
  }
  
  if (avatarNumber >= 13 && avatarNumber <= 16) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite4, position: positions[avatarNumber - 13] };
  }
  
  return null;
};

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }: AvatarPickerProps) => {
  return (
    <div className="space-y-4">
      <Label>Choose Your Avatar</Label>
      {Object.entries(AVATAR_CATEGORIES).map(([key, category]) => (
        <div key={key} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{category.label}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 border rounded-lg bg-muted/20">
            {category.avatars.map((avatarNum) => {
              const config = getAvatarConfig(avatarNum);
              const isSelected = selectedAvatar === avatarNum;
              
              if (!config) return null;
              
              return (
                <button
                  key={avatarNum}
                  type="button"
                  onClick={() => onSelectAvatar(avatarNum)}
                  className={cn(
                    "relative aspect-square rounded-lg transition-all border-2 overflow-hidden",
                    isSelected 
                      ? "border-primary scale-105 shadow-lg ring-2 ring-primary ring-offset-2" 
                      : "border-border hover:scale-105 hover:border-primary/50"
                  )}
                  title={`Avatar ${avatarNum}`}
                  style={{
                    backgroundImage: `url(${config.image})`,
                    backgroundSize: '200% 200%',
                    backgroundPosition: `${config.position.x}% ${config.position.y}%`,
                  }}
                >
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
