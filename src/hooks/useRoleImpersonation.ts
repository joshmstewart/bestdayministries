import { useState, useEffect } from "react";

export type UserRole = "admin" | "owner" | "caregiver" | "bestie" | "supporter";

const IMPERSONATION_KEY = "admin_impersonated_role";

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
    // Only allow impersonation if user is actually an admin/owner
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
