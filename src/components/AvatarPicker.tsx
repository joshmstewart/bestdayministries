import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
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
import composite11 from "@/assets/avatars/composite-11.png";
import composite12 from "@/assets/avatars/composite-12.png";

interface AvatarPickerProps {
  selectedAvatar: number | null;
  onSelectAvatar: (avatarNumber: number) => void;
}

interface AvatarData {
  avatar_number: number;
  category: string;
  is_active: boolean;
}

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
  
  if (avatarNumber >= 17 && avatarNumber <= 20) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite5, position: positions[avatarNumber - 17] };
  }
  
  if (avatarNumber >= 21 && avatarNumber <= 24) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite6, position: positions[avatarNumber - 21] };
  }
  
  if (avatarNumber >= 25 && avatarNumber <= 28) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite7, position: positions[avatarNumber - 25] };
  }
  
  if (avatarNumber >= 29 && avatarNumber <= 32) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite8, position: positions[avatarNumber - 29] };
  }
  
  if (avatarNumber >= 33 && avatarNumber <= 36) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite9, position: positions[avatarNumber - 33] };
  }
  
  if (avatarNumber >= 37 && avatarNumber <= 40) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite10, position: positions[avatarNumber - 37] };
  }
  
  if (avatarNumber >= 41 && avatarNumber <= 44) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite11, position: positions[avatarNumber - 41] };
  }
  
  if (avatarNumber >= 45 && avatarNumber <= 48) {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    return { image: composite12, position: positions[avatarNumber - 45] };
  }
  
  return null;
};

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }: AvatarPickerProps) => {
  const [avatarsByCategory, setAvatarsByCategory] = useState<Record<string, { label: string; avatars: number[] }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    const { data, error } = await supabase
      .from("avatars")
      .select("avatar_number, category, is_active")
      .eq("is_active", true)
      .order("avatar_number");

    if (error) {
      console.error("Error loading avatars:", error);
      setLoading(false);
      return;
    }

    const categories: Record<string, { label: string; avatars: number[] }> = {
      humans: { label: "Humans", avatars: [] },
      animals: { label: "Animals", avatars: [] },
      monsters: { label: "Monsters & Aliens", avatars: [] },
      shapes: { label: "Shapes", avatars: [] },
    };

    data.forEach((avatar: AvatarData) => {
      if (categories[avatar.category]) {
        categories[avatar.category].avatars.push(avatar.avatar_number);
      }
    });

    // Shuffle avatars within each category
    Object.keys(categories).forEach(key => {
      categories[key].avatars = categories[key].avatars.sort(() => Math.random() - 0.5);
    });

    setAvatarsByCategory(categories);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading avatars...</div>;
  }

  return (
    <div className="space-y-4">
      <Label>Choose Your Avatar</Label>
      {Object.entries(avatarsByCategory).map(([key, category]) => (
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
