import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface WordArtPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWordArt: (wordArtUrl: string) => void;
  templateId?: string | null;
}

export function WordArtPicker({ open, onOpenChange, onSelectWordArt, templateId }: WordArtPickerProps) {
  const { data: wordArts, isLoading } = useQuery({
    queryKey: ["card-word-arts", templateId],
    queryFn: async () => {
      let query = supabase
        .from("card_word_arts")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      // Get both template-specific and general word arts (null template_id)
      if (templateId) {
        query = query.or(`template_id.eq.${templateId},template_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSelect = (url: string) => {
    onSelectWordArt(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Word Art</DialogTitle>
          <DialogDescription>
            Tap a phrase to add it to your card - you can resize and move it!
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !wordArts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No word arts available yet. Check back soon!
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3 p-2">
              {wordArts.map((wordArt) => (
                <button
                  key={wordArt.id}
                  className="aspect-[3/2] rounded-lg border-2 border-transparent hover:border-primary transition-all hover:scale-105 bg-white p-2 shadow-sm"
                  onClick={() => handleSelect(wordArt.image_url)}
                  title={wordArt.phrase}
                >
                  <img
                    src={wordArt.image_url}
                    alt={wordArt.phrase}
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
