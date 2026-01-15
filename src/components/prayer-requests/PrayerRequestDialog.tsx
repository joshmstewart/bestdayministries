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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Lock, Share2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { addDays, addWeeks } from "date-fns";

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_answered: boolean;
  answer_notes: string | null;
  is_anonymous?: boolean;
  share_duration?: string;
  expires_at?: string | null;
}

interface PrayerRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId?: string;
  editingPrayer?: PrayerRequest | null;
}

type ShareDuration = "1_week" | "2_weeks" | "1_month";

const calculateExpiresAt = (duration: ShareDuration): string => {
  const now = new Date();
  switch (duration) {
    case "1_week":
      return addWeeks(now, 1).toISOString();
    case "2_weeks":
      return addWeeks(now, 2).toISOString();
    case "1_month":
    default:
      return addDays(now, 30).toISOString();
  }
};

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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareDuration, setShareDuration] = useState<ShareDuration>("1_month");

  useEffect(() => {
    if (editingPrayer) {
      setTitle(editingPrayer.title);
      setContent(editingPrayer.content);
      setIsAnonymous(editingPrayer.is_anonymous || false);
      setShareDuration((editingPrayer.share_duration as ShareDuration) || "1_month");
    } else {
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      setShareDuration("1_month");
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
            is_anonymous: isAnonymous,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPrayer.id);

        if (error) throw error;
        toast.success("Prayer request updated!");
      } else {
        const expiresAt = makePublic ? calculateExpiresAt(shareDuration) : null;
        
        const { error } = await supabase
          .from("prayer_requests")
          .insert({
            user_id: userId,
            title: title.trim(),
            content: content.trim(),
            is_public: makePublic,
            is_anonymous: isAnonymous,
            share_duration: shareDuration,
            expires_at: expiresAt,
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
      setIsAnonymous(false);
      setShareDuration("1_month");
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="anonymous" className="cursor-pointer">Share Anonymously</Label>
                <p className="text-xs text-muted-foreground">Your name won't be shown</p>
              </div>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
            />
          </div>

          {/* Share Duration - only show when creating new and not editing */}
          {!editingPrayer && (
            <div className="space-y-3">
              <Label>Share Duration</Label>
              <p className="text-xs text-muted-foreground">
                Prayer will auto-unshare after this time (you can renew later)
              </p>
              <RadioGroup
                value={shareDuration}
                onValueChange={(v) => setShareDuration(v as ShareDuration)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1_week" id="1_week" />
                  <Label htmlFor="1_week" className="cursor-pointer">1 Week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2_weeks" id="2_weeks" />
                  <Label htmlFor="2_weeks" className="cursor-pointer">2 Weeks</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1_month" id="1_month" />
                  <Label htmlFor="1_month" className="cursor-pointer">1 Month</Label>
                </div>
              </RadioGroup>
            </div>
          )}
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
