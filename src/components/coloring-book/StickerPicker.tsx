import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sticker } from "lucide-react";

interface StickerPickerProps {
  onSelectSticker: (stickerUrl: string) => void;
}

export function StickerPicker({ onSelectSticker }: StickerPickerProps) {
  const { user } = useAuth();

  const { data: userStickers, isLoading } = useQuery({
    queryKey: ["user-stickers-for-coloring", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_stickers")
        .select(`
          *,
          sticker:stickers(*)
        `)
        .eq("user_id", user.id)
        .gt("quantity", 0);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="text-xs text-muted-foreground text-center py-2">
        Sign in to use your stickers
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-xs text-muted-foreground text-center py-2">Loading...</div>;
  }

  if (!userStickers?.length) {
    return (
      <div className="text-xs text-muted-foreground text-center py-2">
        No stickers yet! Collect some from the daily scratch card.
      </div>
    );
  }

  return (
    <ScrollArea className="h-24">
      <div className="grid grid-cols-4 gap-1">
        {userStickers.map((userSticker) => (
          <button
            key={userSticker.id}
            className="relative w-12 h-12 rounded border-2 border-transparent hover:border-primary transition-all hover:scale-105 bg-muted/50"
            onClick={() => onSelectSticker(userSticker.sticker?.image_url)}
            title={userSticker.sticker?.name}
          >
            <img
              src={userSticker.sticker?.image_url}
              alt={userSticker.sticker?.name}
              className="w-full h-full object-contain p-0.5"
            />
            {userSticker.quantity > 1 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {userSticker.quantity}
              </span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
