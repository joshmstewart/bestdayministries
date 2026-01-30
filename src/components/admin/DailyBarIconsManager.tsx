import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, GripVertical } from "lucide-react";

interface DailyBarIcon {
  id: string;
  item_key: string;
  icon_url: string | null;
  label: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_ICONS: Record<string, string> = {
  mood: "🌈",
  "daily-five": "🎯",
  fortune: "✨",
  stickers: "🎁",
};

export function DailyBarIconsManager() {
  const [icons, setIcons] = useState<DailyBarIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIcons();
  }, []);

  const fetchIcons = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_bar_icons")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setIcons(data || []);
    } catch (error) {
      console.error("Error fetching icons:", error);
      toast({
        title: "Error",
        description: "Failed to load daily bar icons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (iconId: string, itemKey: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(iconId);

    try {
      // Sanitize filename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/^_+|_+$/g, "");
      const fileName = `${itemKey}-${Date.now()}-${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("daily-bar-icons")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("daily-bar-icons")
        .getPublicUrl(fileName);

      // Update database
      const { error: updateError } = await supabase
        .from("daily_bar_icons")
        .update({ icon_url: urlData.publicUrl })
        .eq("id", iconId);

      if (updateError) throw updateError;

      toast({ title: "Icon uploaded successfully" });
      fetchIcons();
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload icon",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveIcon = async (iconId: string) => {
    try {
      const { error } = await supabase
        .from("daily_bar_icons")
        .update({ icon_url: null })
        .eq("id", iconId);

      if (error) throw error;

      toast({ title: "Icon removed" });
      fetchIcons();
    } catch (error) {
      console.error("Error removing icon:", error);
      toast({
        title: "Error",
        description: "Failed to remove icon",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (iconId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_bar_icons")
        .update({ is_active: isActive })
        .eq("id", iconId);

      if (error) throw error;
      fetchIcons();
    } catch (error) {
      console.error("Error toggling icon:", error);
      toast({
        title: "Error",
        description: "Failed to update icon",
        variant: "destructive",
      });
    }
  };

  const handleLabelChange = async (iconId: string, label: string) => {
    try {
      const { error } = await supabase
        .from("daily_bar_icons")
        .update({ label })
        .eq("id", iconId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating label:", error);
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
        <CardTitle>Daily Bar Icons</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize the icons displayed in the Daily Bar on the Community page.
          Upload custom images or use the default emojis. (Stickers icon is managed automatically based on scratch card availability.)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {icons.filter(icon => icon.item_key !== "stickers").map((icon) => (
          <div
            key={icon.id}
            className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
            
            {/* Icon Preview */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border overflow-hidden">
              {icon.icon_url ? (
                <img
                  src={icon.icon_url}
                  alt={icon.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">{DEFAULT_ICONS[icon.item_key]}</span>
              )}
            </div>

            {/* Label and Controls */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">
                  {icon.item_key}
                </Label>
              </div>
              <Input
                value={icon.label}
                onChange={(e) => {
                  setIcons((prev) =>
                    prev.map((i) =>
                      i.id === icon.id ? { ...i, label: e.target.value } : i
                    )
                  );
                }}
                onBlur={(e) => handleLabelChange(icon.id, e.target.value)}
                className="max-w-[200px]"
                placeholder="Label"
              />
            </div>

            {/* Upload/Remove */}
            <div className="flex items-center gap-2">
              {icon.icon_url ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveIcon(icon.id)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              ) : null}
              
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(icon.id, icon.item_key, file);
                    }
                  }}
                  disabled={uploading === icon.id}
                />
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={uploading === icon.id}
                >
                  <span className="cursor-pointer">
                    {uploading === icon.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-1" />
                    )}
                    Upload
                  </span>
                </Button>
              </label>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={icon.is_active}
                onCheckedChange={(checked) => handleToggleActive(icon.id, checked)}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
