import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyEngagementSetting {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  visible_to_roles: string[];
}

interface UseDailyEngagementSettingsResult {
  settings: DailyEngagementSetting[];
  loading: boolean;
  canSeeFeature: (featureKey: string) => boolean;
  refetch: () => Promise<void>;
}

export function useDailyEngagementSettings(): UseDailyEngagementSettingsResult {
  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<DailyEngagementSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_engagement_settings")
        .select("*");

      if (error) throw error;
      
      setSettings(data || []);
    } catch (error) {
      console.error("Error fetching daily engagement settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchSettings();
  }, [authLoading, isAuthenticated]);

  const canSeeFeature = (featureKey: string): boolean => {
    if (!isAuthenticated || !role) return false;
    
    const setting = settings.find(s => s.feature_key === featureKey);
    if (!setting) return true; // Default to visible if setting not found
    
    if (!setting.is_enabled) return false;
    
    // Admins and owners always see everything
    if (role === 'admin' || role === 'owner') return true;
    
    return setting.visible_to_roles?.includes(role) ?? false;
  };

  return {
    settings,
    loading: loading || authLoading,
    canSeeFeature,
    refetch: fetchSettings,
  };
}
