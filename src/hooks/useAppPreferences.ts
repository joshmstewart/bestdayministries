import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AVAILABLE_APPS } from "@/components/community/appsConfig";

interface AppPreferences {
  hiddenApps: string[];
  appOrder: string[] | null;
}

export function useAppPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AppPreferences>({
    hiddenApps: [],
    appOrder: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from database
  useEffect(() => {
    if (!user) {
      setPreferences({ hiddenApps: [], appOrder: null });
      setLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from("user_app_preferences")
          .select("hidden_apps, app_order")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences({
            hiddenApps: data.hidden_apps || [],
            appOrder: data.app_order
          });
        }
      } catch (error) {
        console.error("Error loading app preferences:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Get visible apps based on preferences
  const getVisibleApps = useCallback(() => {
    return AVAILABLE_APPS.filter(app => !preferences.hiddenApps.includes(app.id));
  }, [preferences.hiddenApps]);

  // Check if an app is hidden
  const isAppHidden = useCallback((appId: string) => {
    return preferences.hiddenApps.includes(appId);
  }, [preferences.hiddenApps]);

  // Toggle app visibility
  const toggleAppVisibility = useCallback(async (appId: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const newHiddenApps = preferences.hiddenApps.includes(appId)
        ? preferences.hiddenApps.filter(id => id !== appId)
        : [...preferences.hiddenApps, appId];

      const { error } = await supabase
        .from("user_app_preferences")
        .upsert({
          user_id: user.id,
          hidden_apps: newHiddenApps,
          app_order: preferences.appOrder,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      setPreferences(prev => ({
        ...prev,
        hiddenApps: newHiddenApps
      }));
    } catch (error) {
      console.error("Error updating app preferences:", error);
    } finally {
      setSaving(false);
    }
  }, [user, preferences]);

  // Reset to show all apps
  const resetToDefaults = useCallback(async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_app_preferences")
        .upsert({
          user_id: user.id,
          hidden_apps: [],
          app_order: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      setPreferences({
        hiddenApps: [],
        appOrder: null
      });
    } catch (error) {
      console.error("Error resetting app preferences:", error);
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    preferences,
    loading,
    saving,
    getVisibleApps,
    isAppHidden,
    toggleAppVisibility,
    resetToDefaults
  };
}
