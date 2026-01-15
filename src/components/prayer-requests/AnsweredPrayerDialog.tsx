import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AnsweredPrayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prayerId: string;
  currentGratitude?: string | null;
  onSuccess: () => void;
}

export const AnsweredPrayerDialog = ({
  open,
  onOpenChange,
  prayerId,
  currentGratitude,
  onSuccess,
}: AnsweredPrayerDialogProps) => {
  const [gratitudeMessage, setGratitudeMessage] = useState(currentGratitude || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (includeGratitude: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("prayer_requests")
        .update({
          is_answered: true,
          answered_at: new Date().toISOString(),
          gratitude_message: includeGratitude && gratitudeMessage.trim() 
            ? gratitudeMessage.trim() 
            : null,
        })
        .eq("id", prayerId);

      if (error) throw error;
      
      toast.success("Marked as answered! 🙏");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking prayer as answered:", error);
      toast.error("Failed to update prayer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Mark as Answered
          </DialogTitle>
          <DialogDescription>
            Celebrate this answered prayer! You can optionally share a prayer of gratitude 
            with those who prayed with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gratitude" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Prayer of Gratitude (Optional)
            </Label>
            <Textarea
              id="gratitude"
              placeholder="Share how this prayer was answered and express your gratitude..."
              value={gratitudeMessage}
              onChange={(e) => setGratitudeMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {gratitudeMessage.length}/500
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Your gratitude message will be shown on the community board to encourage others.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Just Mark Answered
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || !gratitudeMessage.trim()}
            className="w-full sm:w-auto gap-2 bg-gradient-warm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Share Gratitude
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
