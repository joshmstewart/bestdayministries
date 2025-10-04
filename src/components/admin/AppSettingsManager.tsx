import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Settings } from "lucide-react";

export const AppSettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    logo_url: "",
    mobile_app_name: "",
    mobile_app_icon_url: "",
    carousel_timing_featured_item: 10,
    carousel_timing_featured_bestie: 5,
    carousel_timing_sponsor_bestie: 7,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("setting_key", ["logo_url", "mobile_app_name", "mobile_app_icon_url", "carousel_timing_featured_item", "carousel_timing_featured_bestie", "carousel_timing_sponsor_bestie"]);

      if (error) throw error;

      const settingsMap: any = {
        logo_url: "",
        mobile_app_name: "Best Day Ministries Community",
        mobile_app_icon_url: "",
        carousel_timing_featured_item: 10,
        carousel_timing_featured_bestie: 5,
        carousel_timing_sponsor_bestie: 7,
      };
      
      data?.forEach((setting) => {
        try {
          // Handle both string and already-parsed JSON values
          const value = typeof setting.setting_value === 'string' 
            ? JSON.parse(setting.setting_value) 
            : setting.setting_value;
          
          // For carousel timing settings, extract interval_ms value
          if (setting.setting_key.startsWith('carousel_timing_')) {
            settingsMap[setting.setting_key] = (value.interval_ms || 5000) / 1000;
          } else {
            settingsMap[setting.setting_key] = value;
          }
        } catch (e) {
          // If JSON parse fails, use the value as-is
          settingsMap[setting.setting_key] = setting.setting_value;
        }
      });

      setSettings(settingsMap);
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, settingKey: "logo_url" | "mobile_app_icon_url") => {
    try {
      setUploading(true);

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a web-compatible image (PNG, JPG, WEBP, or SVG)');
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${settingKey}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: settingKey,
          setting_value: JSON.stringify(urlData.publicUrl),
          updated_by: user?.id,
        }, {
          onConflict: 'setting_key'
        });

      if (updateError) throw updateError;

      setSettings((prev) => ({
        ...prev,
        [settingKey]: urlData.publicUrl,
      }));

      toast({
        title: "Success",
        description: `${settingKey === "logo_url" ? "Logo" : "Mobile app icon"} uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAppNameUpdate = async () => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "mobile_app_name",
          setting_value: JSON.stringify(settings.mobile_app_name),
          updated_by: user?.id,
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mobile app name updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCarouselTimingUpdate = async () => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // Update all three carousel timing settings
      const updates = [
        {
          setting_key: "carousel_timing_featured_item",
          setting_value: JSON.stringify({ interval_ms: settings.carousel_timing_featured_item * 1000 }),
          updated_by: user?.id,
        },
        {
          setting_key: "carousel_timing_featured_bestie",
          setting_value: JSON.stringify({ interval_ms: settings.carousel_timing_featured_bestie * 1000 }),
          updated_by: user?.id,
        },
        {
          setting_key: "carousel_timing_sponsor_bestie",
          setting_value: JSON.stringify({ interval_ms: settings.carousel_timing_sponsor_bestie * 1000 }),
          updated_by: user?.id,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Carousel timing updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          App Settings
        </CardTitle>
        <CardDescription>
          Manage your app's logo, mobile app icon, and name
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Logo */}
        <div className="space-y-3">
          <Label>Header Logo</Label>
          <p className="text-sm text-muted-foreground">
            This logo will appear in the header across all pages
          </p>
          {settings.logo_url && !settings.logo_url.includes('object/public/app-assets/logo.png') && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={settings.logo_url}
                alt="Current logo"
                className="max-h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "logo_url");
              }}
              disabled={uploading}
            />
            <Button disabled={uploading} size="icon" variant="outline">
              {uploading ? (
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile App Icon */}
        <div className="space-y-3">
          <Label>Mobile App Icon</Label>
          <p className="text-sm text-muted-foreground">
            The icon used for the mobile app (recommended: 1024x1024px PNG)
          </p>
          {settings.mobile_app_icon_url && !settings.mobile_app_icon_url.includes('object/public/app-assets/icon.png') && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={settings.mobile_app_icon_url}
                alt="Current mobile icon"
                className="max-h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "mobile_app_icon_url");
              }}
              disabled={uploading}
            />
            <Button disabled={uploading} size="icon" variant="outline">
              {uploading ? (
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile App Name */}
        <div className="space-y-3">
          <Label htmlFor="app-name">Mobile App Name</Label>
          <p className="text-sm text-muted-foreground">
            The name displayed for the mobile app
          </p>
          <div className="flex items-center gap-2">
            <Input
              id="app-name"
              value={settings.mobile_app_name}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  mobile_app_name: e.target.value,
                }))
              }
              placeholder="Best Day Ministries Community"
              disabled={uploading}
            />
            <Button onClick={handleAppNameUpdate} disabled={uploading}>
              {uploading ? (
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>

        {/* Carousel Timing Settings */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Carousel Auto-Advance Timing</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure how long each carousel displays before auto-advancing (in seconds)
          </p>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="featured-item-timing">Featured Item</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="featured-item-timing"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.carousel_timing_featured_item}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      carousel_timing_featured_item: parseInt(e.target.value) || 10,
                    }))
                  }
                  disabled={uploading}
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured-bestie-timing">Featured Bestie</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="featured-bestie-timing"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.carousel_timing_featured_bestie}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      carousel_timing_featured_bestie: parseInt(e.target.value) || 5,
                    }))
                  }
                  disabled={uploading}
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsor-bestie-timing">Sponsor Bestie</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sponsor-bestie-timing"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.carousel_timing_sponsor_bestie}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      carousel_timing_sponsor_bestie: parseInt(e.target.value) || 7,
                    }))
                  }
                  disabled={uploading}
                />
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          </div>

          <Button onClick={handleCarouselTimingUpdate} disabled={uploading}>
            {uploading ? (
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            ) : (
              "Update Timing"
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Mobile App Configuration</p>
          <p className="text-xs text-muted-foreground">
            For mobile app development with Capacitor, these settings control the app's appearance.
            The app icon should be 1024x1024px PNG. After updating, run <code className="bg-muted px-1 py-0.5 rounded">npx cap sync</code> to apply changes to native platforms.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
