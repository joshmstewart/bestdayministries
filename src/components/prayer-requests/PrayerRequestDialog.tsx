import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lock, Share2, EyeOff, Mic, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, addWeeks } from "date-fns";
import { VoiceInput } from "@/components/VoiceInput";
import AudioPlayer from "@/components/AudioPlayer";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

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
  audio_url?: string | null;
  visible_to_roles?: UserRole[] | null;
}

interface PrayerRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId?: string;
  editingPrayer?: PrayerRequest | null;
  userRole?: string;
}

type ShareDuration = "1_week" | "2_weeks" | "1_month";

const ROLE_OPTIONS: { id: UserRole; label: string }[] = [
  { id: "caregiver", label: "Guardians" },
  { id: "bestie", label: "Besties" },
  { id: "supporter", label: "Supporters" },
];

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
  userRole,
}: PrayerRequestDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [shareDuration, setShareDuration] = useState<ShareDuration>("1_month");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [useRoleRestriction, setUseRoleRestriction] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  // Check if bestie needs approval from guardian
  useEffect(() => {
    const checkApprovalRequirement = async () => {
      if (!userId || userRole !== "bestie") {
        setRequiresApproval(false);
        return;
      }

      try {
        const { data: links } = await supabase
          .from("caregiver_bestie_links")
          .select("require_prayer_approval")
          .eq("bestie_id", userId)
          .limit(1);

        if (links && links.length > 0 && links[0].require_prayer_approval) {
          setRequiresApproval(true);
        } else {
          setRequiresApproval(false);
        }
      } catch (error) {
        console.error("Error checking approval requirement:", error);
      }
    };

    if (open) {
      checkApprovalRequirement();
    }
  }, [userId, userRole, open]);

  useEffect(() => {
    if (editingPrayer) {
      setTitle(editingPrayer.title);
      setContent(editingPrayer.content);
      setIsAnonymous(editingPrayer.is_anonymous || false);
      setShareDuration((editingPrayer.share_duration as ShareDuration) || "1_month");
      setAudioUrl(editingPrayer.audio_url || null);
      if (editingPrayer.visible_to_roles && editingPrayer.visible_to_roles.length > 0) {
        setUseRoleRestriction(true);
        setSelectedRoles(editingPrayer.visible_to_roles);
      } else {
        setUseRoleRestriction(false);
        setSelectedRoles([]);
      }
    } else {
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      setShareDuration("1_month");
      setSelectedRoles([]);
      setUseRoleRestriction(false);
      setShowVoiceInput(false);
      setAudioUrl(null);
      setIsRecordingMode(false);
    }
  }, [editingPrayer, open]);

  const handleTranscript = useCallback((text: string) => {
    setContent((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const toggleRole = (roleId: UserRole) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== roleId));
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const handleSave = async (makePublic: boolean) => {
    if (!userId) {
      toast.error("Please sign in to create a prayer request");
      return;
    }

    if (!title.trim() || (!content.trim() && !audioUrl)) {
      toast.error("Please add a title and either text or audio content");
      return;
    }

    setSaving(true);
    try {
      // Determine approval status based on user role and guardian settings
      const approvalStatus = requiresApproval && makePublic ? "pending_approval" : "approved";

      if (editingPrayer) {
        const { error } = await supabase
          .from("prayer_requests")
          .update({
            title: title.trim(),
            content: content.trim(),
            is_anonymous: isAnonymous,
            audio_url: audioUrl,
            visible_to_roles: useRoleRestriction && selectedRoles.length > 0 ? selectedRoles : null,
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
            audio_url: audioUrl,
            visible_to_roles: useRoleRestriction && selectedRoles.length > 0 ? selectedRoles : null,
            approval_status: approvalStatus,
          });

        if (error) throw error;
        
        if (approvalStatus === "pending_approval") {
          toast.success("Prayer request submitted for guardian approval!");
        } else {
          toast.success(
            makePublic 
              ? "Prayer request shared with the community!" 
              : "Prayer request saved privately!"
          );
        }
      }

      setTitle("");
      setContent("");
      setIsAnonymous(false);
      setShareDuration("1_month");
      setSelectedRoles([]);
      setUseRoleRestriction(false);
      setAudioUrl(null);
      setShowVoiceInput(false);
      onSuccess();
    } catch (error) {
      console.error("Error saving prayer request:", error);
      toast.error("Failed to save prayer request");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAudio = () => {
    setAudioUrl(null);
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
              : "Share what's on your heart. You can type or record an audio message."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requiresApproval && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
              <p className="text-yellow-700 dark:text-yellow-400">
                Your shared prayer requests will need guardian approval before they're visible to the community.
              </p>
            </div>
          )}

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

          {/* Audio Input Toggle */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isRecordingMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsRecordingMode(!isRecordingMode)}
              className="gap-2"
            >
              <Mic className="w-4 h-4 text-red-500" strokeWidth={2.5} />
              {isRecordingMode ? "Recording Mode" : "Record Audio Prayer"}
            </Button>
          </div>

          {/* Voice Input */}
          {isRecordingMode && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <Label>Speak Your Prayer</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Your voice will be transcribed to text automatically
              </p>
              <VoiceInput
                onTranscript={handleTranscript}
                placeholder="Tap the microphone and speak your prayer..."
                showTranscript={true}
                autoStop={true}
                maxDuration={120}
                silenceStopSeconds={10}
              />
            </div>
          )}

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

          {/* Audio URL display if exists */}
          {audioUrl && (
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
              <AudioPlayer src={audioUrl} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveAudio}
                className="text-destructive h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

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

          {/* Role Visibility - only show when creating new and not editing */}
          {!editingPrayer && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="cursor-pointer">Limit Who Can See</Label>
                  <p className="text-xs text-muted-foreground">Choose specific groups</p>
                </div>
                <Switch
                  checked={useRoleRestriction}
                  onCheckedChange={setUseRoleRestriction}
                />
              </div>
              
              {useRoleRestriction && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {ROLE_OPTIONS.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="text-sm font-normal cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
              disabled={saving || !title.trim() || (!content.trim() && !audioUrl)}
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
                disabled={saving || !title.trim() || (!content.trim() && !audioUrl)}
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
                disabled={saving || !title.trim() || (!content.trim() && !audioUrl)}
                className="w-full sm:w-auto gap-2 bg-gradient-warm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {requiresApproval ? "Submit for Approval" : "Save & Share"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
