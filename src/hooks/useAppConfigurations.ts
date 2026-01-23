import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AVAILABLE_APPS, AppConfig } from "@/components/community/appsConfig";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

export type AppCategory = "games" | "resources" | "content" | "user";

export interface AppConfiguration {
  id: string;
  app_id: string;
  display_name: string | null;
  is_active: boolean;
  visible_to_roles: UserRole[];
  display_order: number;
  category: AppCategory | null;
}

const ALL_ROLES: UserRole[] = ["supporter", "bestie", "caregiver", "moderator", "admin", "owner"];

export function useAppConfigurations() {
  const { user, role } = useAuth();
  const [configurations, setConfigurations] = useState<AppConfiguration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from("app_configurations")
        .select("*")
        .order("display_order");

      if (error) throw error;
      // Cast category to AppCategory type
      const typedData = (data || []).map(item => ({
        ...item,
        category: item.category as AppCategory | null,
      }));
      setConfigurations(typedData);
    } catch (error) {
      console.error("Error fetching app configurations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  // Get merged app list with configurations
  const getConfiguredApps = (): (AppConfig & { config?: AppConfiguration })[] => {
    return AVAILABLE_APPS.map((app) => {
      const config = configurations.find((c) => c.app_id === app.id);
      return {
        ...app,
        name: config?.display_name || app.name,
        category: config?.category || app.category, // Use configured category or fallback to default
        config,
      };
    }).filter((app) => {
      const config = app.config;
      // If no config exists, show to everyone
      if (!config) return true;
      // If not active, don't show
      if (!config.is_active) return false;
      // Check role visibility
      if (role && config.visible_to_roles) {
        return config.visible_to_roles.includes(role as UserRole);
      }
      return true;
    });
  };

  const updateConfiguration = async (
    appId: string,
    updates: Partial<Pick<AppConfiguration, "display_name" | "is_active" | "visible_to_roles" | "display_order" | "category">>
  ) => {
    try {
      // Check if config exists
      const existing = configurations.find((c) => c.app_id === appId);

      if (existing) {
        const { error } = await supabase
          .from("app_configurations")
          .update({
            display_name: updates.display_name,
            is_active: updates.is_active,
            visible_to_roles: updates.visible_to_roles as UserRole[],
            display_order: updates.display_order,
            category: updates.category,
          })
          .eq("app_id", appId);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from("app_configurations")
          .insert({
            app_id: appId,
            display_name: updates.display_name,
            is_active: updates.is_active,
            visible_to_roles: updates.visible_to_roles as UserRole[],
            display_order: updates.display_order,
            category: updates.category,
          });

        if (error) throw error;
      }

      await fetchConfigurations();
      toast.success("App configuration updated");
    } catch (error) {
      console.error("Error updating app configuration:", error);
      toast.error("Failed to update configuration");
    }
  };

  const initializeAllConfigs = async () => {
    try {
      const existingIds = configurations.map((c) => c.app_id);
      const newConfigs = AVAILABLE_APPS.filter((app) => !existingIds.includes(app.id)).map((app, index) => ({
        app_id: app.id,
        display_name: app.name,
        is_active: true,
        visible_to_roles: ALL_ROLES,
        display_order: existingIds.length + index,
        category: app.category,
      }));

      if (newConfigs.length > 0) {
        const { error } = await supabase.from("app_configurations").insert(newConfigs);
        if (error) throw error;
        await fetchConfigurations();
      }
    } catch (error) {
      console.error("Error initializing configs:", error);
    }
  };

  return {
    configurations,
    loading,
    getConfiguredApps,
    updateConfiguration,
    initializeAllConfigs,
    refetch: fetchConfigurations,
  };
}
