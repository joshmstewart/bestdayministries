import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SponsorPageSettings {
  badge_text: string;
  main_heading: string;
  description: string;
  featured_video_id?: string;
}

interface Video {
  id: string;
  title: string;
}

export const SponsorBestiePageManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<SponsorPageSettings>({
    badge_text: "Sponsor a Bestie",
    main_heading: "Change a Life Today",
    description: "Sponsor a Bestie and directly support their journey of growth, creativity, and community engagement",
    featured_video_id: ""
  });
  const [carouselTiming, setCarouselTiming] = useState<number>(7);
  const [savingTiming, setSavingTiming] = useState(false);

  useEffect(() => {
    loadSettings();
    loadVideos();
    loadCarouselTiming();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "sponsor_page_content")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const parsed = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        setSettings(parsed);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title")
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error loading videos:", error);
    }
  };

  const loadCarouselTiming = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "carousel_timing_sponsor_bestie")
        .maybeSingle();

      if (error) throw error;
      if (data?.setting_value) {
        setCarouselTiming(Number(data.setting_value) || 7);
      }
    } catch (error) {
      console.error("Error loading carousel timing:", error);
    }
  };

  const saveCarouselTiming = async () => {
    try {
      setSavingTiming(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "carousel_timing_sponsor_bestie",
          setting_value: carouselTiming,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;
      toast.success("Carousel timing updated successfully");
    } catch (error: any) {
      console.error("Error saving carousel timing:", error);
      toast.error(error.message || "Failed to update carousel timing");
    } finally {
      setSavingTiming(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "sponsor_page_content",
          setting_value: settings as any,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      toast.success("Sponsor page content updated successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to update sponsor page content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sponsor Page Content</CardTitle>
        <CardDescription>
          Customize the header and description text on the Sponsor a Bestie page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="badge-text">Badge Text</Label>
          <Input
            id="badge-text"
            value={settings.badge_text}
            onChange={(e) => setSettings({ ...settings, badge_text: e.target.value })}
            placeholder="Sponsor a Bestie"
          />
          <p className="text-xs text-muted-foreground">
            Small badge text displayed above the main heading
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="main-heading">Main Heading</Label>
          <Input
            id="main-heading"
            value={settings.main_heading}
            onChange={(e) => setSettings({ ...settings, main_heading: e.target.value })}
            placeholder="Change a Life Today"
          />
          <p className="text-xs text-muted-foreground">
            Large heading text with gradient effect
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={settings.description}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
            placeholder="Sponsor a Bestie and directly support their journey..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Description text displayed below the main heading
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video">Featured Video</Label>
          <Select
            value={settings.featured_video_id || "none"}
            onValueChange={(value) => setSettings({ ...settings, featured_video_id: value === "none" ? "" : value })}
          >
            <SelectTrigger id="video">
              <SelectValue placeholder="Select a video (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No video</SelectItem>
              {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose a video to display below the description (optional)
          </p>
        </div>

        <Button
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
