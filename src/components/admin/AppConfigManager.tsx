import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Upload, X } from "lucide-react";
import { useAppConfigurations, AppConfiguration, AppCategory } from "@/hooks/useAppConfigurations";
import { AVAILABLE_APPS, APP_CATEGORIES } from "@/components/community/appsConfig";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

type UserRole = Database["public"]["Enums"]["user_role"];
const ALL_ROLES: UserRole[] = ["supporter", "bestie", "caregiver", "moderator", "admin", "owner"];

interface EditableConfig {
  app_id: string;
  display_name: string;
  is_active: boolean;
  visible_to_roles: UserRole[];
  category: AppCategory;
  icon_url: string | null;
}

export function AppConfigManager() {
  const { configurations, loading, updateConfiguration, initializeAllConfigs, refetch } = useAppConfigurations();
  const [editedConfigs, setEditedConfigs] = useState<Record<string, EditableConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize all configs on first load
  useEffect(() => {
    if (!loading && !initialized) {
      initializeAllConfigs().then(() => {
        setInitialized(true);
        refetch();
      });
    }
  }, [loading, initialized]);

  // Build editable state from configurations
  useEffect(() => {
    const configs: Record<string, EditableConfig> = {};
    AVAILABLE_APPS.forEach((app) => {
      const existing = configurations.find((c) => c.app_id === app.id);
      configs[app.id] = {
        app_id: app.id,
        display_name: existing?.display_name || app.name,
        is_active: existing?.is_active ?? true,
        visible_to_roles: existing?.visible_to_roles || [...ALL_ROLES],
        category: (existing?.category || app.category) as AppCategory,
        icon_url: existing?.icon_url || null,
      };
    });
    setEditedConfigs(configs);
  }, [configurations]);

  const handleNameChange = (appId: string, name: string) => {
    setEditedConfigs((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], display_name: name },
    }));
  };

  const handleActiveChange = (appId: string, isActive: boolean) => {
    setEditedConfigs((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], is_active: isActive },
    }));
  };

  const handleRoleToggle = (appId: string, role: UserRole) => {
    setEditedConfigs((prev) => {
      const current = prev[appId].visible_to_roles;
      const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
      return {
        ...prev,
        [appId]: { ...prev[appId], visible_to_roles: updated },
      };
    });
  };

  const handleCategoryChange = async (appId: string, category: AppCategory) => {
    const config = editedConfigs[appId];
    if (!config) return;
    
    // Update local state immediately for responsive UI
    setEditedConfigs((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], category },
    }));
    
    // Auto-save the category change
    setSaving(appId);
    await updateConfiguration(appId, {
      display_name: config.display_name,
      is_active: config.is_active,
      visible_to_roles: config.visible_to_roles,
      category,
    });
    setSaving(null);
  };

  const handleSave = async (appId: string) => {
    const config = editedConfigs[appId];
    if (!config) return;

    setSaving(appId);
    await updateConfiguration(appId, {
      display_name: config.display_name,
      is_active: config.is_active,
      visible_to_roles: config.visible_to_roles,
      category: config.category,
      icon_url: config.icon_url,
    });
    setSaving(null);
  };

  const handleReset = (appId: string) => {
    const app = AVAILABLE_APPS.find((a) => a.id === appId);
    if (!app) return;

    setEditedConfigs((prev) => ({
      ...prev,
      [appId]: {
        app_id: appId,
        display_name: app.name,
        is_active: true,
        visible_to_roles: [...ALL_ROLES],
        category: app.category as AppCategory,
        icon_url: null,
      },
    }));
  };

  const handleIconUpload = async (appId: string, file: File) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      setSaving(appId);

      // Compress image if over 2MB (target 2MB max, 512px for icons)
      let processedFile = file;
      if (file.size > 2 * 1024 * 1024) {
        toast.info("Compressing image...");
        processedFile = await compressImage(file, 2, 512, 512);
      }

      // Upload to storage
      const fileName = `app-icons/${appId}-${Date.now()}.${processedFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, processedFile, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(fileName);

      const iconUrl = urlData.publicUrl;

      // Update local state
      setEditedConfigs((prev) => ({
        ...prev,
        [appId]: { ...prev[appId], icon_url: iconUrl },
      }));

      // Save to database
      const config = editedConfigs[appId];
      await updateConfiguration(appId, {
        display_name: config.display_name,
        is_active: config.is_active,
        visible_to_roles: config.visible_to_roles,
        category: config.category,
        icon_url: iconUrl,
      });

      toast.success("Icon uploaded successfully");
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("Failed to upload icon");
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveIcon = async (appId: string) => {
    setEditedConfigs((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], icon_url: null },
    }));

    // Auto-save the removal
    const config = editedConfigs[appId];
    setSaving(appId);
    await updateConfiguration(appId, {
      display_name: config.display_name,
      is_active: config.is_active,
      visible_to_roles: config.visible_to_roles,
      category: config.category,
      icon_url: null,
    });
    setSaving(null);
    toast.success("Icon removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Convert APP_CATEGORIES object to array for mapping
  const categoryEntries = Object.entries(APP_CATEGORIES) as [keyof typeof APP_CATEGORIES, typeof APP_CATEGORIES[keyof typeof APP_CATEGORIES]][];
  const sortedCategories = categoryEntries.sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">App Configuration</h2>
        <p className="text-sm text-muted-foreground">Control visibility and names for each app</p>
      </div>

      {sortedCategories.map(([categoryId, category]) => {
        // Group apps by their EDITED category, not static category
        const categoryApps = AVAILABLE_APPS.filter((app) => {
          const editedCategory = editedConfigs[app.id]?.category;
          return editedCategory === categoryId;
        });
        
        return (
          <Card key={categoryId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryApps.map((app) => {
                const config = editedConfigs[app.id];
                if (!config) return null;

                const Icon = app.icon;
                const existingConfig = configurations.find((c) => c.app_id === app.id);
                const hasChanges =
                  config.display_name !== (existingConfig?.display_name || app.name) ||
                  config.is_active !== (existingConfig?.is_active ?? true) ||
                  config.category !== (existingConfig?.category || app.category) ||
                  config.icon_url !== (existingConfig?.icon_url || null) ||
                  JSON.stringify(config.visible_to_roles.sort()) !==
                    JSON.stringify((existingConfig?.visible_to_roles || [...ALL_ROLES]).sort());

                return (
                  <div
                    key={app.id}
                    className={cn(
                      "p-4 border rounded-lg space-y-4",
                      !config.is_active && "opacity-60 bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* App Icon with upload option */}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "relative w-12 h-12 rounded-xl flex items-center justify-center shadow-sm overflow-hidden group",
                            !config.icon_url && "bg-gradient-to-br",
                            !config.icon_url && app.color
                          )}
                        >
                          {config.icon_url ? (
                            <>
                              <img 
                                src={config.icon_url} 
                                alt={app.name} 
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => handleRemoveIcon(app.id)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="Remove icon"
                              >
                                <X className="w-5 h-5 text-white" />
                              </button>
                            </>
                          ) : (
                            <Icon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleIconUpload(app.id, file);
                              e.target.value = '';
                            }}
                          />
                          <span className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            {config.icon_url ? "Change" : "Upload"}
                          </span>
                        </label>
                      </div>

                      {/* Name Input */}
                      <div className="flex-1">
                        <Label htmlFor={`name-${app.id}`} className="text-xs text-muted-foreground">
                          Display Name
                        </Label>
                        <Input
                          id={`name-${app.id}`}
                          value={config.display_name}
                          onChange={(e) => handleNameChange(app.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      {/* Category Select */}
                      <div className="w-32">
                        <Label htmlFor={`category-${app.id}`} className="text-xs text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={config.category}
                          onValueChange={(value) => handleCategoryChange(app.id, value as AppCategory)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(APP_CATEGORIES).map(([key, cat]) => (
                              <SelectItem key={key} value={key}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Active Toggle */}
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor={`active-${app.id}`} className="text-xs text-muted-foreground">
                          Active
                        </Label>
                        <Switch
                          id={`active-${app.id}`}
                          checked={config.is_active}
                          onCheckedChange={(checked) => handleActiveChange(app.id, checked)}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleReset(app.id)}
                          title="Reset to defaults"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={hasChanges ? "default" : "outline"}
                          onClick={() => handleSave(app.id)}
                          disabled={saving === app.id}
                        >
                          {saving === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Role Visibility */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t">
                      <span className="text-xs text-muted-foreground mr-2">Visible to:</span>
                      {ALL_ROLES.map((role) => (
                        <div key={role} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`${app.id}-${role}`}
                            checked={config.visible_to_roles.includes(role)}
                            onCheckedChange={() => handleRoleToggle(app.id, role)}
                          />
                          <Label
                            htmlFor={`${app.id}-${role}`}
                            className="text-xs capitalize cursor-pointer"
                          >
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
