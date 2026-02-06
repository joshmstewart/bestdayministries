import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProfileAvatarPickerProps {
  /** Currently selected fitness avatar ID */
  selectedAvatarId: string | null;
  /** Called when user selects an avatar */
  onSelectAvatar: (avatarId: string) => void;
  /** If true, only show free avatars (for signup flows) */
  freeOnly?: boolean;
  /** Optional label override */
  label?: string;
}

interface FitnessAvatar {
  id: string;
  name: string;
  preview_image_url: string | null;
  is_free: boolean;
  price_coins: number;
  display_order: number;
  category: string | null;
}

const KNOWN_CATEGORY_META: Record<string, { label: string; emoji: string; sortOrder: number }> = {
  free: { label: "Free Tier", emoji: "🆓", sortOrder: 0 },
  icons: { label: "Iconic Characters", emoji: "⭐", sortOrder: 1 },
  animals: { label: "Animals", emoji: "🐾", sortOrder: 2 },
  superheroes: { label: "Superheroes", emoji: "🦸", sortOrder: 3 },
  monsters: { label: "Monsters", emoji: "👾", sortOrder: 4 },
  humans: { label: "Humans", emoji: "👤", sortOrder: 5 },
};

const getCategoryMeta = (value: string) => {
  const known = KNOWN_CATEGORY_META[value];
  if (known) return known;
  return {
    label: value.charAt(0).toUpperCase() + value.slice(1),
    emoji: "✨",
    sortOrder: 999,
  };
};

export const ProfileAvatarPicker = ({
  selectedAvatarId,
  onSelectAvatar,
  freeOnly = false,
  label = "Choose Your Avatar",
}: ProfileAvatarPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const didInitCategories = useRef(false);

  const { data: avatars = [], isLoading } = useQuery({
    queryKey: ["profile-avatars", freeOnly],
    queryFn: async () => {
      let query = supabase
        .from("fitness_avatars")
        .select("id, name, preview_image_url, is_free, price_coins, display_order, category")
        .eq("is_active", true)
        .order("display_order");

      if (freeOnly) {
        query = query.eq("is_free", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FitnessAvatar[];
    },
  });

  // Auto-open categories on first load
  useEffect(() => {
    if (didInitCategories.current || !avatars.length) return;
    const cats = Array.from(new Set(avatars.map((a) => a.category ?? "free")));
    setOpenCategories(new Set(cats)); // open all for simplicity
    didInitCategories.current = true;
  }, [avatars]);

  // Group by category
  const categoryValues = Array.from(new Set(avatars.map((a) => a.category ?? "free"))).sort(
    (a, b) => getCategoryMeta(a).sortOrder - getCategoryMeta(b).sortOrder
  );

  const groupedAvatars = categoryValues
    .map((value) => ({
      value,
      ...getCategoryMeta(value),
      avatars: avatars
        .filter((a) => (a.category ?? "free") === value)
        .sort((a, b) => a.display_order - b.display_order),
    }))
    .filter((g) => g.avatars.length > 0);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Find the selected avatar for preview
  const selectedAvatar = avatars.find((a) => a.id === selectedAvatarId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading avatars...
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full text-left hover:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-2">
            {selectedAvatar?.preview_image_url && (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary bg-white flex-shrink-0">
                <img
                  src={selectedAvatar.preview_image_url}
                  alt={selectedAvatar.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <Label className="cursor-pointer">
              {label} {selectedAvatar ? `(${selectedAvatar.name})` : "(Optional)"}
            </Label>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3">
        {groupedAvatars.length === 1 ? (
          // Single category — no need for nested collapsibles
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 border rounded-lg bg-muted/20">
            {groupedAvatars[0].avatars.map((avatar) => (
              <AvatarButton
                key={avatar.id}
                avatar={avatar}
                isSelected={selectedAvatarId === avatar.id}
                onSelect={() => onSelectAvatar(avatar.id)}
              />
            ))}
          </div>
        ) : (
          groupedAvatars.map((group) => (
            <Collapsible
              key={group.value}
              open={openCategories.has(group.value)}
              onOpenChange={() => toggleCategory(group.value)}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 py-1 h-auto">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    {group.emoji} {group.label}
                    <Badge variant="secondary" className="text-xs">
                      {group.avatars.length}
                    </Badge>
                  </span>
                  {openCategories.has(group.value) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-3 border rounded-lg bg-muted/20">
                  {group.avatars.map((avatar) => (
                    <AvatarButton
                      key={avatar.id}
                      avatar={avatar}
                      isSelected={selectedAvatarId === avatar.id}
                      onSelect={() => onSelectAvatar(avatar.id)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

function AvatarButton({
  avatar,
  isSelected,
  onSelect,
}: {
  avatar: FitnessAvatar;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative aspect-square rounded-lg transition-all border-2 overflow-hidden flex items-center justify-center",
        isSelected
          ? "border-primary scale-105 shadow-lg ring-2 ring-primary ring-offset-2"
          : "border-border hover:scale-105 hover:border-primary/50",
        avatar.preview_image_url ? "bg-white" : "bg-muted"
      )}
      title={avatar.name}
    >
      {avatar.preview_image_url ? (
        <img
          src={avatar.preview_image_url}
          alt={avatar.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      )}
      {isSelected && (
        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg">
          ✓
        </div>
      )}
    </button>
  );
}
