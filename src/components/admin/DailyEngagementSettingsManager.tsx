import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flame, Gift, Sparkles } from "lucide-react";
import { RoleVisibilitySelector } from "@/components/common/RoleVisibilitySelector";

interface DailyEngagementSetting {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  visible_to_roles: string[];
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  daily_scratch_widget: <Gift className="w-5 h-5 text-primary" />,
  login_streak_button: <Flame className="w-5 h-5 text-destructive" />,
  daily_bar: <Sparkles className="w-5 h-5 text-accent" />,
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  daily_scratch_widget: "The floating scratch card button that appears in the bottom corner",
  login_streak_button: "The flame/streak button that shows consecutive login days",
  daily_bar: "The horizontal bar with Mood, Daily Five, Fortune, and Stickers buttons",
};

export function DailyEngagementSettingsManager() {
  const [settings, setSettings] = useState<DailyEngagementSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_engagement_settings")
        .select("*")
        .order("feature_key");

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load daily engagement settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (settingId: string, isEnabled: boolean) => {
    setSaving(settingId);
    try {
      const { error } = await supabase
        .from("daily_engagement_settings")
        .update({ is_enabled: isEnabled })
        .eq("id", settingId);

      if (error) throw error;

      setSettings(prev =>
        prev.map(s => (s.id === settingId ? { ...s, is_enabled: isEnabled } : s))
      );

      toast({ title: isEnabled ? "Feature enabled" : "Feature disabled" });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleRolesChange = async (settingId: string, roles: string[]) => {
    setSaving(settingId);
    try {
      // Cast roles to the expected type for the database
      const typedRoles = roles as ("admin" | "bestie" | "caregiver" | "moderator" | "owner" | "supporter")[];
      
      const { error } = await supabase
        .from("daily_engagement_settings")
        .update({ visible_to_roles: typedRoles })
        .eq("id", settingId);

      if (error) throw error;

      setSettings(prev =>
        prev.map(s => (s.id === settingId ? { ...s, visible_to_roles: roles } : s))
      );

      toast({ title: "Visibility updated" });
    } catch (error) {
      console.error("Error updating roles:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Engagement Visibility</CardTitle>
        <CardDescription>
          Control which daily engagement features are visible and to which roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="p-4 border rounded-lg bg-muted/20 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {FEATURE_ICONS[setting.feature_key]}
                <div>
                  <h4 className="font-medium">{setting.feature_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {FEATURE_DESCRIPTIONS[setting.feature_key]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={setting.is_enabled}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled(setting.id, checked)
                  }
                  disabled={saving === setting.id}
                />
              </div>
            </div>

            {setting.is_enabled && (
              <div className="pt-2 border-t">
                <RoleVisibilitySelector
                  selectedRoles={setting.visible_to_roles || []}
                  onRolesChange={(roles) => handleRolesChange(setting.id, roles)}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
