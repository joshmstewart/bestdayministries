import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PermissionType = 'moderate' | 'manage_vendors' | 'view_analytics';

export const useUserPermissions = () => {
  const [permissions, setPermissions] = useState<Set<PermissionType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [canModerate, setCanModerate] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has admin access (admins can do everything)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = roleData?.role && ['admin', 'owner'].includes(roleData.role);

      if (isAdmin) {
        // Admins have all permissions
        setCanModerate(true);
        setPermissions(new Set(['moderate', 'manage_vendors', 'view_analytics']));
        setLoading(false);
        return;
      }

      // Load user's specific permissions
      const { data: permissionsData } = await supabase
        .from("user_permissions")
        .select("permission_type")
        .eq("user_id", user.id);

      if (permissionsData) {
        const perms = new Set(permissionsData.map(p => p.permission_type as PermissionType));
        setPermissions(perms);
        setCanModerate(perms.has('moderate'));
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: PermissionType): boolean => {
    return permissions.has(permission);
  };

  return {
    permissions,
    loading,
    canModerate,
    hasPermission,
    refreshPermissions: loadPermissions,
  };
};