import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ExternalLink } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface WelcomeModalContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  button_text: string;
}

const DEFAULT_CONTENT: WelcomeModalContent = {
  title: "Joy House Has a New Home!",
  paragraph1: "Welcome! Joy House is now part of Best Day Ministries — a family that includes Joy House Store, Best Day Ever! coffee + crepes, and all our community events and programs.",
  paragraph2: "Please update your bookmarks to bestdayministries.org to visit us directly next time.",
  button_text: "Explore the New Site"
};

const WelcomeModalManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<WelcomeModalContent>(DEFAULT_CONTENT);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "welcome_modal_content")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const parsedContent = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        setContent({ ...DEFAULT_CONTENT, ...parsedContent });
      }
    } catch (error) {
      console.error("Error loading welcome modal content:", error);
      toast.error("Failed to load welcome modal content");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", "welcome_modal_content")
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from("app_settings")
          .update({
            setting_value: content as unknown as Json,
            updated_at: new Date().toISOString()
          })
          .eq("setting_key", "welcome_modal_content");
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert([{
            setting_key: "welcome_modal_content",
            setting_value: content as unknown as Json,
            updated_at: new Date().toISOString()
          }]);
        error = insertError;
      }

      toast.success("Welcome modal content saved successfully");
    } catch (error) {
      console.error("Error saving welcome modal content:", error);
      toast.error("Failed to save welcome modal content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome Redirect Modal</CardTitle>
          <CardDescription>
            This modal appears for visitors coming from the old Joy House Community domain. 
            It welcomes them and explains the transition to Best Day Ministries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">How it works:</p>
            <p className="text-muted-foreground">
              When visitors are redirected from the old domain with <code className="bg-background px-1 rounded">?welcome=true</code> in the URL, 
              they'll see this welcome popup explaining that Joy House is now part of Best Day Ministries.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Modal Title</Label>
            <Input
              id="title"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              placeholder="Joy House Has a New Home!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paragraph1">First Paragraph</Label>
            <Textarea
              id="paragraph1"
              value={content.paragraph1}
              onChange={(e) => setContent({ ...content, paragraph1: e.target.value })}
              placeholder="Welcome message explaining the transition..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use this to explain the relationship between Joy House and Best Day Ministries.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paragraph2">Second Paragraph</Label>
            <Textarea
              id="paragraph2"
              value={content.paragraph2}
              onChange={(e) => setContent({ ...content, paragraph2: e.target.value })}
              placeholder="Reminder to update bookmarks..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use this to remind visitors to update their bookmarks.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="button_text">Button Text</Label>
            <Input
              id="button_text"
              value={content.button_text}
              onChange={(e) => setContent({ ...content, button_text: e.target.value })}
              placeholder="Explore the New Site"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/?welcome=true', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Modal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeModalManager;
