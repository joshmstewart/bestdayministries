import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PermissionType = 'moderate' | 'manage_vendors' | 'view_analytics' | 'store_access';

export const useUserPermissions = () => {
  const { user, isAdmin, isAuthenticated, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<PermissionType>>(new Set());
  const [loading, setLoading] = useState(true);
  const [canModerate, setCanModerate] = useState(false);
  const [hasStoreAccess, setHasStoreAccess] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (isAdmin) {
        // Admins have all permissions
        setCanModerate(true);
        setHasStoreAccess(true);
        setPermissions(new Set(['moderate', 'manage_vendors', 'view_analytics', 'store_access']));
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
        setHasStoreAccess(perms.has('store_access'));
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [authLoading, isAuthenticated, loadPermissions]);

  const hasPermission = (permission: PermissionType): boolean => {
    return permissions.has(permission);
  };

  return {
    permissions,
    loading: loading || authLoading,
    canModerate,
    hasStoreAccess,
    hasPermission,
    refreshPermissions: loadPermissions,
  };
};
