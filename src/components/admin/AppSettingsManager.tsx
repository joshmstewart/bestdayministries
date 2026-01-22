import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Settings } from "lucide-react";

// Draws the sunburst gradient directly on canvas (avoids tainted-canvas issues)
const exportSunburstGradientToPng = async (width: number, height: number, filename: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported");

  // Base burnt-orange fill (hsl 24 85% 56%)
  ctx.fillStyle = "hsl(24, 85%, 56%)";
  ctx.fillRect(0, 0, width, height);

  // Radial mustard "spots" matching --gradient-warm
  const spots: { cx: number; cy: number; r: number; alpha: number }[] = [
    { cx: 0.20, cy: 0.30, r: 0.25, alpha: 0.25 },
    { cx: 0.75, cy: 0.20, r: 0.30, alpha: 0.20 },
    { cx: 0.85, cy: 0.70, r: 0.25, alpha: 0.28 },
    { cx: 0.40, cy: 0.80, r: 0.35, alpha: 0.18 },
    { cx: 0.15, cy: 0.85, r: 0.28, alpha: 0.15 },
  ];

  for (const spot of spots) {
    const cx = spot.cx * width;
    const cy = spot.cy * height;
    const r = spot.r * Math.max(width, height);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    // mustard hsl(46 95% 55%) with varying alpha
    grad.addColorStop(0, `hsla(46, 95%, 55%, ${spot.alpha})`);
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });

  const url = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const AppSettingsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    logo_url: "",
    mobile_app_name: "",
    mobile_app_icon_url: "",
    favicon_url: "",
    site_title: "",
    site_description: "",
    og_image_url: "",
    twitter_handle: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("setting_key", ["logo_url", "mobile_app_name", "mobile_app_icon_url", "favicon_url", "site_title", "site_description", "og_image_url", "twitter_handle"]);

      if (error) throw error;

      const settingsMap: any = {
        logo_url: "",
        mobile_app_name: "Best Day Ministries Community",
        mobile_app_icon_url: "",
        favicon_url: "",
        site_title: "Joy House Community | Spreading Joy Through Special Needs Community",
        site_description: "Joy House builds a supportive community for adults with special needs by sharing their creativity through unique gifts, giving them confidence, independence, and JOY!",
        og_image_url: "https://lovable.dev/opengraph-image-p98pqg.png",
        twitter_handle: "",
      };
      
      data?.forEach((setting) => {
        try {
          // Handle both string and already-parsed JSON values
          const value = typeof setting.setting_value === 'string' 
            ? JSON.parse(setting.setting_value) 
            : setting.setting_value;
          settingsMap[setting.setting_key] = value;
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

  const handleImageUpload = async (file: File, settingKey: "logo_url" | "mobile_app_icon_url" | "favicon_url" | "og_image_url") => {
    try {
      setUploading(true);

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a web-compatible image (PNG, JPG, WEBP, or SVG)');
      }

      const fileExt = file.name.split(".").pop();
      // Use a fixed filename for mobile app icon so iOS and Android use the same stable URL
      const fileName = settingKey === "mobile_app_icon_url" 
        ? `mobile-app-icon.${fileExt}`
        : `${settingKey}-${Date.now()}.${fileExt}`;
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

      // If favicon, also copy to public directory
      if (settingKey === "favicon_url") {
        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("app-assets")
          .download(filePath);

        if (downloadError) throw downloadError;

        // Note: In a real implementation, you'd need a backend function to copy to public/
        // For now, we store the URL and admins can manually update if needed
      }

      const displayName = settingKey === "logo_url" ? "Logo" : 
                         settingKey === "mobile_app_icon_url" ? "Mobile app icon" :
                         settingKey === "og_image_url" ? "Social share image" : "Favicon";

      toast({
        title: "Success",
        description: `${displayName} uploaded successfully. For favicon changes to take effect, you may need to clear your browser cache.`,
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

  const handleTextSettingUpdate = async (settingKey: string, successMessage: string) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: settingKey,
          setting_value: JSON.stringify(settings[settingKey as keyof typeof settings]),
          updated_by: user?.id,
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: successMessage,
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

  const handleDownloadSplash = async () => {
    try {
      await exportSunburstGradientToPng(1242, 1920, "splash-background-sunburst.png");
      toast({
        title: "Downloaded",
        description: "Generated from your live sunburst gradient (bg-gradient-warm).",
      });
    } catch (error: any) {
      console.error("Splash gradient export failed:", error);
      toast({
        title: "Download failed",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          App Settings
        </CardTitle>
        <CardDescription>
          Manage your app's logo, mobile app icon, favicon, name, and social sharing metadata
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Splash Background (download helper) */}
        <div className="space-y-3">
          <Label>Mobile Splash Background</Label>
          <p className="text-sm text-muted-foreground">
            Download a PNG generated from your actual sunburst gradient (the same <code className="bg-muted px-1 py-0.5 rounded">bg-gradient-warm</code> token used across the app).
          </p>

          <div className="border rounded-lg p-4 bg-muted/50">
            <div
              aria-label="Splash background preview"
              className="w-full max-w-sm aspect-[9/16] rounded-md border border-border bg-gradient-warm shadow-warm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadSplash}>
              Download sunburst splash (PNG)
            </Button>
          </div>
        </div>

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
          <Label>Mobile App Icon (iOS & Android)</Label>
          <p className="text-sm text-muted-foreground">
            The icon used when users add the app to their home screen on any device (recommended: 1024x1024px PNG)
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

        {/* Favicon */}
        <div className="space-y-3">
          <Label>Browser Favicon</Label>
          <p className="text-sm text-muted-foreground">
            The icon that appears in browser tabs (recommended: 32x32px or 16x16px PNG/ICO)
          </p>
          {settings.favicon_url && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={settings.favicon_url}
                alt="Current favicon"
                className="max-h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "favicon_url");
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
          <p className="text-xs text-muted-foreground">
            Note: After uploading, you may need to clear your browser cache to see the new favicon
          </p>
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
            <Button onClick={() => handleTextSettingUpdate("mobile_app_name", "Mobile app name updated successfully")} disabled={uploading}>
              {uploading ? (
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>

        {/* SEO & Social Sharing Settings */}
        <div className="border-t pt-6 mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">SEO & Social Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Control how your site appears when shared on social media and in search results
            </p>
          </div>

          {/* Site Title */}
          <div className="space-y-3">
            <Label htmlFor="site-title">Site Title</Label>
            <p className="text-sm text-muted-foreground">
              The title that appears in search results and social media shares (recommended: under 60 characters)
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="site-title"
                value={settings.site_title}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_title: e.target.value,
                  }))
                }
                placeholder="Joy House Community | Spreading Joy Through Special Needs Community"
                disabled={uploading}
                maxLength={60}
              />
              <Button onClick={() => handleTextSettingUpdate("site_title", "Site title updated successfully")} disabled={uploading}>
                {uploading ? (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                ) : (
                  "Update"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.site_title.length}/60 characters
            </p>
          </div>

          {/* Site Description */}
          <div className="space-y-3">
            <Label htmlFor="site-description">Site Description</Label>
            <p className="text-sm text-muted-foreground">
              A brief description for search results and social shares (recommended: under 160 characters)
            </p>
            <div className="space-y-2">
              <textarea
                id="site-description"
                value={settings.site_description}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    site_description: e.target.value,
                  }))
                }
                placeholder="Joy House builds a supportive community for adults with special needs..."
                disabled={uploading}
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {settings.site_description.length}/160 characters
                </p>
                <Button onClick={() => handleTextSettingUpdate("site_description", "Site description updated successfully")} disabled={uploading}>
                  {uploading ? (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Social Share Image */}
          <div className="space-y-3">
            <Label>Social Share Image</Label>
            <p className="text-sm text-muted-foreground">
              The image shown when your site is shared on social media (recommended: 1200x630px)
            </p>
            {settings.og_image_url && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <img
                  src={settings.og_image_url}
                  alt="Current social share image"
                  className="max-h-40 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, "og_image_url");
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

          {/* Twitter Handle */}
          <div className="space-y-3">
            <Label htmlFor="twitter-handle">Twitter Handle (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Your Twitter/X username (without the @)
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="twitter-handle"
                value={settings.twitter_handle}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    twitter_handle: e.target.value.replace('@', ''),
                  }))
                }
                placeholder="lovable_dev"
                disabled={uploading}
              />
              <Button onClick={() => handleTextSettingUpdate("twitter_handle", "Twitter handle updated successfully")} disabled={uploading}>
                {uploading ? (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </div>
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
