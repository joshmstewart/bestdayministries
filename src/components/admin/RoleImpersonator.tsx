import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export const RoleImpersonator = () => {
  const { impersonatedRole, startImpersonation, stopImpersonation, isImpersonating } = useRoleImpersonation();
  const [selectedRole, setSelectedRole] = useState<UserRole>("caregiver");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkOwnerStatus();
  }, []);

  const checkOwnerStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsOwner(profile?.role === "owner");
  };

  // Base roles available to all admins/owners
  const baseRoles: { value: UserRole; label: string }[] = [
    { value: "caregiver", label: "Guardian/Caregiver" },
    { value: "bestie", label: "Bestie" },
    { value: "supporter", label: "Supporter" },
  ];

  // Add admin role option for owners only
  const roles: { value: UserRole; label: string }[] = isOwner
    ? [{ value: "admin", label: "Admin" }, ...baseRoles]
    : baseRoles;

  const handleStartImpersonation = () => {
    startImpersonation(selectedRole);
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Role Impersonation
        </CardTitle>
        <CardDescription>
          {isOwner 
            ? "View the site as a different user role (including admin) to test permissions and visibility"
            : "View the site as a different user role to test permissions and visibility"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isImpersonating && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are currently viewing as: <strong>{roles.find(r => r.value === impersonatedRole)?.label}</strong>
              {impersonatedRole === 'admin' && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Note: This shows the admin UI/UX. All server-side operations still use your owner role.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Role to Impersonate</label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {!isImpersonating ? (
              <Button onClick={handleStartImpersonation} className="gap-2">
                <Eye className="w-4 h-4" />
                Start Impersonation
              </Button>
            ) : (
              <Button onClick={handleStopImpersonation} variant="destructive" className="gap-2">
                <EyeOff className="w-4 h-4" />
                Stop Impersonation
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
