import { useState } from "react";
import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVAILABLE_APPS, APP_CATEGORIES, AppConfig } from "./appsConfig";
import { AppIcon } from "./AppIcon";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { useAppConfigurations } from "@/hooks/useAppConfigurations";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function AppsGrid() {
  const { user } = useAuth();
  const { 
    loading, 
    saving,
    getVisibleApps, 
    isAppHidden, 
    toggleAppVisibility,
    resetToDefaults 
  } = useAppPreferences();
  const { getConfiguredApps, loading: configLoading } = useAppConfigurations();
  const [editMode, setEditMode] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Please sign in to view your apps.</p>
      </div>
    );
  }

  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Get admin-configured apps (respects visibility and custom names)
  const configuredApps = getConfiguredApps();

  // Define typed interface for apps with config
  type ConfiguredApp = typeof configuredApps[number];

  // In edit mode, show all configured apps; otherwise filter by user preferences
  const visibleApps = editMode 
    ? configuredApps 
    : configuredApps.filter(app => !isAppHidden(app.id));

  // Group apps by category
  const appsByCategory = visibleApps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, ConfiguredApp[]>);

  // Sort categories by order
  const sortedCategories = Object.entries(appsByCategory)
    .sort(([a], [b]) => APP_CATEGORIES[a as keyof typeof APP_CATEGORIES].order - APP_CATEGORIES[b as keyof typeof APP_CATEGORIES].order);

  const hiddenCount = configuredApps.length - configuredApps.filter(app => !isAppHidden(app.id)).length;

  return (
    <div className="space-y-6">
      {/* Header with edit button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Apps</h2>
          <p className="text-sm text-muted-foreground">
            {editMode 
              ? "Tap apps to show or hide them" 
              : `${configuredApps.filter(app => !isAppHidden(app.id)).length} apps${hiddenCount > 0 ? ` • ${hiddenCount} hidden` : ""}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              disabled={saving}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Show All
            </Button>
          )}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="gap-1"
          >
            <Settings className={cn("w-4 h-4", editMode && "animate-spin-slow")} />
            {editMode ? "Done" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Apps grid by category */}
      <div className="space-y-8 max-w-4xl mx-auto">
        {sortedCategories.map(([category, apps]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {APP_CATEGORIES[category as keyof typeof APP_CATEGORIES].label}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 lg:gap-6">
              {apps.map(app => (
                <AppIcon
                  key={app.id}
                  app={app}
                  editMode={editMode}
                  isHidden={isAppHidden(app.id)}
                  onToggle={() => toggleAppVisibility(app.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state when all apps hidden */}
      {!editMode && visibleApps.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You've hidden all your apps!</p>
          <Button onClick={() => setEditMode(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Edit Apps
          </Button>
        </div>
      )}
    </div>
  );
}
