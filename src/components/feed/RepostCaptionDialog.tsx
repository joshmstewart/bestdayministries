import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Repeat2, Loader2 } from "lucide-react";

interface RepostCaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (caption: string) => Promise<void>;
  itemType: string;
}

export const RepostCaptionDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemType,
}: RepostCaptionDialogProps) => {
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(caption.trim());
      setCaption("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await onConfirm("");
      setCaption("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="w-5 h-5 text-primary" />
            Repost {itemType === "album" ? "Album" : "Event"}
          </DialogTitle>
          <DialogDescription>
            Add a caption to let people know what's new or why you're sharing this again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Textarea
            placeholder={`e.g. "New photos added!" or "Check out the updated details..."`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground text-right">
            {caption.length}/280
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Skip Caption
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !caption.trim()}
            className="w-full sm:w-auto gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Repeat2 className="w-4 h-4" />
            )}
            Repost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
