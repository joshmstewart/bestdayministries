import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
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
import monsterPirateStarfish from "@/assets/avatars/monster-pirate-starfish.png";
import monsterPurpleThreeEyes from "@/assets/avatars/monster-purple-three-eyes.png";

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
  // Check if it's a dynamically uploaded avatar (49+)
  if (avatarNumber >= 49) {
    return { image: null, position: null, isStorageAvatar: true };
  }
  
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
  
  // Individual monsters: avatars 49-50
  if (avatarNumber === 49) {
    return { image: monsterPirateStarfish, position: null };
  }
  
  if (avatarNumber === 50) {
    return { image: monsterPurpleThreeEyes, position: null };
  }
  
  return null;
};

export const AvatarPicker = ({ selectedAvatar, onSelectAvatar }: AvatarPickerProps) => {
  const [avatarsByCategory, setAvatarsByCategory] = useState<Record<string, { label: string; avatars: number[] }>>({});
  const [loading, setLoading] = useState(true);
  const [storageUrls, setStorageUrls] = useState<Record<number, string>>({});
  const [isOpen, setIsOpen] = useState(false);

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

    const urls: Record<number, string> = {};
    
    // Group avatars by their database category
    data.forEach((avatar: AvatarData) => {
      const categoryKey = avatar.category;
      
      // Initialize category if it doesn't exist yet
      if (!categories[categoryKey]) {
        // Create a label from the category key
        const label = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
        categories[categoryKey] = { label, avatars: [] };
      }
      
      categories[categoryKey].avatars.push(avatar.avatar_number);
      
      // Load storage URL for uploaded avatars (49+)
      if (avatar.avatar_number >= 49) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(`avatar-${avatar.avatar_number}.png`);
        
        if (urlData) {
          urls[avatar.avatar_number] = urlData.publicUrl;
        }
      }
    });

    // Shuffle avatars within each category
    Object.keys(categories).forEach(key => {
      categories[key].avatars = categories[key].avatars.sort(() => Math.random() - 0.5);
    });

    setAvatarsByCategory(categories);
    setStorageUrls(urls);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading avatars...</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button 
          type="button"
          className="flex items-center justify-between w-full text-left hover:opacity-70 transition-opacity"
        >
          <Label className="cursor-pointer">Change Avatar (Optional)</Label>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4">
        {Object.entries(avatarsByCategory)
          .filter(([_, category]) => category.avatars.length > 0)
          .map(([key, category]) => (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{category.label}</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 border rounded-lg bg-muted/20">
              {category.avatars.map((avatarNum) => {
                const config = getAvatarConfig(avatarNum);
                const isSelected = selectedAvatar === avatarNum;
                
                if (!config) return null;
                
                // Determine the background image URL
                const backgroundUrl = config.isStorageAvatar 
                  ? storageUrls[avatarNum] 
                  : config.image;
                
                return (
                  <button
                    key={avatarNum}
                    type="button"
                    onClick={() => onSelectAvatar(avatarNum)}
                    data-avatar-number={avatarNum}
                    className={cn(
                      "relative aspect-square rounded-lg transition-all border-2 overflow-hidden",
                      isSelected 
                        ? "border-primary scale-105 shadow-lg ring-2 ring-primary ring-offset-2" 
                        : "border-border hover:scale-105 hover:border-primary/50"
                    )}
                    title={`Avatar ${avatarNum}`}
                    style={{
                      backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
                      backgroundSize: config.position ? '200% 200%' : 'cover',
                      backgroundPosition: config.position ? `${config.position.x}% ${config.position.y}%` : 'center',
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
      </CollapsibleContent>
    </Collapsible>
  );
};
