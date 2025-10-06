import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Image, Video, MessageSquare, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type ModerationPolicy = 'all' | 'flagged' | 'none';

interface ModerationSettings {
  sponsor_message_image_policy: ModerationPolicy;
  sponsor_message_video_policy: ModerationPolicy;
  discussion_post_image_policy: ModerationPolicy;
  discussion_comment_image_policy: ModerationPolicy;
}

const POLICY_OPTIONS = [
  { value: 'all', label: 'All Content', description: 'Require approval for ALL uploads' },
  { value: 'flagged', label: 'Flagged Only', description: 'Only AI-flagged content needs approval' },
  { value: 'none', label: 'None', description: 'Auto-approve everything (no moderation)' },
] as const;

export const ModerationPolicyManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ModerationSettings>({
    sponsor_message_image_policy: 'flagged',
    sponsor_message_video_policy: 'flagged',
    discussion_post_image_policy: 'flagged',
    discussion_comment_image_policy: 'flagged',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("moderation_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          sponsor_message_image_policy: data.sponsor_message_image_policy || 'flagged',
          sponsor_message_video_policy: data.sponsor_message_video_policy || 'flagged',
          discussion_post_image_policy: data.discussion_post_image_policy || 'flagged',
          discussion_comment_image_policy: data.discussion_comment_image_policy || 'flagged',
        });
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (field: keyof ModerationSettings, value: ModerationPolicy) => {
    try {
      // Check if settings row exists
      const { data: existing } = await supabase
        .from("moderation_settings")
        .select("id")
        .maybeSingle();

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from("moderation_settings")
          .update({ [field]: value })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase
          .from("moderation_settings")
          .insert({ [field]: value });

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, [field]: value }));

      toast({
        title: "Policy updated",
        description: "Moderation policy has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating policy:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse text-muted-foreground">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <CardTitle>Moderation Policies</CardTitle>
        </div>
        <CardDescription>
          Control when content requires admin approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sponsor Messages Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3>Sponsor Messages (Guardian to Sponsors)</h3>
          </div>
          
          <div className="pl-7 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="sponsor-image-policy">Image Uploads</Label>
              </div>
              <Select
                value={settings.sponsor_message_image_policy}
                onValueChange={(value) => updatePolicy('sponsor_message_image_policy', value as ModerationPolicy)}
              >
                <SelectTrigger id="sponsor-image-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="sponsor-video-policy">Video Uploads</Label>
              </div>
              <Select
                value={settings.sponsor_message_video_policy}
                onValueChange={(value) => updatePolicy('sponsor_message_video_policy', value as ModerationPolicy)}
              >
                <SelectTrigger id="sponsor-video-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Discussion Posts Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3>Discussion Posts & Comments</h3>
          </div>
          
          <div className="pl-7 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="post-image-policy">Post Image Uploads</Label>
              </div>
              <Select
                value={settings.discussion_post_image_policy}
                onValueChange={(value) => updatePolicy('discussion_post_image_policy', value as ModerationPolicy)}
              >
                <SelectTrigger id="post-image-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="comment-image-policy">Comment Image Uploads</Label>
              </div>
              <Select
                value={settings.discussion_comment_image_policy}
                onValueChange={(value) => updatePolicy('discussion_comment_image_policy', value as ModerationPolicy)}
              >
                <SelectTrigger id="comment-image-policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t text-sm text-muted-foreground space-y-2">
          <p><strong>All:</strong> Every upload goes to moderation queue regardless of AI result</p>
          <p><strong>Flagged Only:</strong> Only uploads flagged by AI go to moderation queue</p>
          <p><strong>None:</strong> All uploads auto-approve (no AI check, no queue)</p>
        </div>
      </CardContent>
    </Card>
  );
};
