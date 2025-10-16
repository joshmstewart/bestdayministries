import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StickerAlbum } from "./StickerAlbum";

export const StickerBookButton = () => {
  const [open, setOpen] = useState(false);
  const [newStickersCount, setNewStickersCount] = useState(0);

  useEffect(() => {
    checkNewStickers();

    // Subscribe to new stickers
    const channel = supabase
      .channel('new-stickers')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_stickers',
        },
        () => {
          checkNewStickers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkNewStickers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('user_stickers')
      .select('id')
      .eq('user_id', user.id)
      .gte('first_obtained_at', today);

    if (!error && data) {
      setNewStickersCount(data.length);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setNewStickersCount(0); // Clear badge when opened
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={handleOpen}
        className="relative"
        aria-label="Open Sticker Album"
      >
        <BookOpen className="h-4 w-4" />
        {newStickersCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {newStickersCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Sticker Album</DialogTitle>
          </DialogHeader>
          <StickerAlbum />
        </DialogContent>
      </Dialog>
    </>
  );
};