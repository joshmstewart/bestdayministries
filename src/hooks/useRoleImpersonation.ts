import { useState, useEffect } from "react";

export type UserRole = "admin" | "owner" | "caregiver" | "bestie" | "supporter" | "vendor";

const IMPERSONATION_KEY = "admin_impersonated_role";

/**
 * SECURITY NOTE: This hook manages UI-only role impersonation for admin/owner users.
 * The impersonation is stored in localStorage for UI testing purposes only.
 * 
 * CRITICAL: All server-side authorization MUST use the actual role from the 
 * user_roles table via has_admin_access() or get_user_role() functions.
 * Never trust client-supplied role information for access control decisions.
 */
export const useRoleImpersonation = () => {
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Load impersonated role from localStorage on mount
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      setImpersonatedRole(stored as UserRole);
    }
  }, []);

  const startImpersonation = (role: UserRole) => {
    setImpersonatedRole(role);
    localStorage.setItem(IMPERSONATION_KEY, role);
  };

  const stopImpersonation = () => {
    setImpersonatedRole(null);
    localStorage.removeItem(IMPERSONATION_KEY);
  };

  const getEffectiveRole = (actualRole: UserRole | null): UserRole | null => {
    // Only allow impersonation if user has admin-level access (admin or owner)
    // This is for UI display purposes only - server validates actual role
    if (actualRole === "admin" || actualRole === "owner") {
      return impersonatedRole || actualRole;
    }
    return actualRole;
  };

  return {
    impersonatedRole,
    startImpersonation,
    stopImpersonation,
    getEffectiveRole,
    isImpersonating: impersonatedRole !== null,
  };
};