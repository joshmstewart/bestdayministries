import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface StickerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSticker: (stickerUrl: string) => void;
}

export function StickerPicker({ open, onOpenChange, onSelectSticker }: StickerPickerProps) {
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

  const handleSelect = (url: string) => {
    onSelectSticker(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your Sticker Collection</DialogTitle>
          <DialogDescription>
            Tap a sticker to add it to your coloring
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="text-center py-8 text-muted-foreground">
            Sign in to use your stickers
          </div>
        ) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading your stickers...</div>
        ) : !userStickers?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No stickers yet! Collect some from the daily scratch card on the Community page.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-4 gap-3 p-2">
              {userStickers.map((userSticker) => (
                <button
                  key={userSticker.id}
                  className="aspect-square rounded-lg border-2 border-transparent hover:border-primary transition-all hover:scale-105 bg-muted/50 p-2"
                  onClick={() => handleSelect(userSticker.sticker?.image_url)}
                  title={userSticker.sticker?.name}
                >
                  <img
                    src={userSticker.sticker?.image_url}
                    alt={userSticker.sticker?.name}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
