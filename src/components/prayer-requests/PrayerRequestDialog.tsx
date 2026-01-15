import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_answered: boolean;
  answer_notes: string | null;
}

interface PrayerRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId?: string;
  editingPrayer?: PrayerRequest | null;
}

export const PrayerRequestDialog = ({
  open,
  onOpenChange,
  onSuccess,
  userId,
  editingPrayer,
}: PrayerRequestDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingPrayer) {
      setTitle(editingPrayer.title);
      setContent(editingPrayer.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [editingPrayer, open]);

  const handleSave = async (makePublic: boolean) => {
    if (!userId) {
      toast.error("Please sign in to create a prayer request");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setSaving(true);
    try {
      if (editingPrayer) {
        const { error } = await supabase
          .from("prayer_requests")
          .update({
            title: title.trim(),
            content: content.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPrayer.id);

        if (error) throw error;
        toast.success("Prayer request updated!");
      } else {
        const { error } = await supabase
          .from("prayer_requests")
          .insert({
            user_id: userId,
            title: title.trim(),
            content: content.trim(),
            is_public: makePublic,
          });

        if (error) throw error;
        toast.success(
          makePublic 
            ? "Prayer request shared with the community!" 
            : "Prayer request saved privately!"
        );
      }

      setTitle("");
      setContent("");
      onSuccess();
    } catch (error) {
      console.error("Error saving prayer request:", error);
      toast.error("Failed to save prayer request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingPrayer ? "Edit Prayer Request" : "New Prayer Request"}
          </DialogTitle>
          <DialogDescription>
            {editingPrayer 
              ? "Update your prayer request details"
              : "Share what's on your heart. You can keep it private or share with the community."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="A brief title for your prayer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Prayer Request</Label>
            <Textarea
              id="content"
              placeholder="Share the details of your prayer request..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {editingPrayer ? (
            <Button
              onClick={() => handleSave(editingPrayer.is_public)}
              disabled={saving || !title.trim() || !content.trim()}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving || !title.trim() || !content.trim()}
                className="w-full sm:w-auto gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Save Private
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || !title.trim() || !content.trim()}
                className="w-full sm:w-auto gap-2 bg-gradient-warm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                Save & Share
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
