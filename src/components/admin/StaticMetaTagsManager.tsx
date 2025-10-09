import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, AlertCircle, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { compressImage } from "@/lib/imageUtils";

export function StaticMetaTagsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [metaTags, setMetaTags] = useState({
    title: "",
    description: "",
    image: "",
  });

  useEffect(() => {
    loadMetaTags();
  }, []);

  const loadMetaTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["static_og_title", "static_og_description", "static_og_image"]);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((item) => {
        const value = typeof item.setting_value === 'string' 
          ? item.setting_value 
          : JSON.stringify(item.setting_value);
        settings[item.setting_key] = value;
      });

      setMetaTags({
        title: settings.static_og_title || "",
        description: settings.static_og_description || "",
        image: settings.static_og_image || "",
      });
    } catch (error) {
      console.error("Error loading meta tags:", error);
      toast({
        title: "Error",
        description: "Failed to load meta tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image (recommended 1200x630 for OG images)
      const compressedFile = await compressImage(file, 2, 1200, 630);
      
      // Upload to Supabase storage
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `og-image-${Date.now()}.${fileExt}`;
      const filePath = `meta-tags/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

      setMetaTags({ ...metaTags, image: publicUrl });

      toast({
        title: "Image Uploaded",
        description: "Image uploaded successfully. Don't forget to save your settings.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setMetaTags({ ...metaTags, image: "" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to database
      const updates = [
        { setting_key: "static_og_title", setting_value: metaTags.title },
        { setting_key: "static_og_description", setting_value: metaTags.description },
        { setting_key: "static_og_image", setting_value: metaTags.image },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "Meta tag settings saved! Ask your AI assistant to update the index.html file to make these changes live.",
      });
    } catch (error) {
      console.error("Error saving meta tags:", error);
      toast({
        title: "Error",
        description: "Failed to update meta tags",
        variant: "destructive",
      });
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
          <CardTitle>Static Meta Tags for Social Sharing</CardTitle>
          <CardDescription>
            Set the meta tags that should appear when sharing your site on social media and in text messages.
            After saving, ask your AI assistant to apply these to the index.html file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> These settings control what appears in link previews on Facebook, Twitter, LinkedIn, 
              iMessage, WhatsApp, and SMS. After saving, tell your AI assistant: "Update index.html with my static meta tags"
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="og-title">Title</Label>
              <Input
                id="og-title"
                value={metaTags.title}
                onChange={(e) => setMetaTags({ ...metaTags, title: e.target.value })}
                placeholder="Joy House Community | Spreading Joy"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Keep under 60 characters for best display
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-description">Description</Label>
              <Input
                id="og-description"
                value={metaTags.description}
                onChange={(e) => setMetaTags({ ...metaTags, description: e.target.value })}
                placeholder="Building a supportive community for adults with special needs..."
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground">
                Keep under 160 characters for best display
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="og-image">Image</Label>
              
              {metaTags.image ? (
                <div className="space-y-2">
                  <div className="relative w-full aspect-[1200/630] max-w-md rounded-lg overflow-hidden border border-border">
                    <img 
                      src={metaTags.image} 
                      alt="Meta tag preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current image will be used in social sharing previews
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="og-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1200x630px. Image will be automatically optimized for social sharing.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How This Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Step 1:</strong> Fill in your desired meta tags above and click "Save Settings"
          </p>
          <p>
            <strong>Step 2:</strong> Tell your AI assistant: "Update index.html with my static meta tags"
          </p>
          <p>
            <strong>Step 3:</strong> The AI will update the HTML file with your settings
          </p>
          <p>
            ✅ Works immediately on ALL platforms: Facebook, Twitter, LinkedIn, iMessage, WhatsApp, SMS
          </p>
          <p>
            ⚠️ People who already shared your link will see the old preview until their cache expires (7-30 days)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
