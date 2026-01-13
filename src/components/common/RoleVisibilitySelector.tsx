import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RoleVisibilitySelectorProps {
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  excludeRoles?: string[];
}

const ALL_ROLES = [
  { id: "caregiver", label: "Caregivers" },
  { id: "bestie", label: "Besties" },
  { id: "supporter", label: "Supporters" },
  { id: "moderator", label: "Moderators" },
];

export function RoleVisibilitySelector({
  selectedRoles,
  onRolesChange,
  excludeRoles = ["admin", "owner"],
}: RoleVisibilitySelectorProps) {
  const availableRoles = ALL_ROLES.filter(r => !excludeRoles.includes(r.id));

  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      onRolesChange(selectedRoles.filter(r => r !== roleId));
    } else {
      onRolesChange([...selectedRoles, roleId]);
    }
  };

  const selectAll = () => {
    onRolesChange(availableRoles.map(r => r.id));
  };

  const selectNone = () => {
    onRolesChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Visible to Roles</Label>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="text-primary hover:underline"
          >
            Select All
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-muted-foreground hover:underline"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {availableRoles.map((role) => (
          <div key={role.id} className="flex items-center gap-2">
            <Checkbox
              id={`role-${role.id}`}
              checked={selectedRoles.includes(role.id)}
              onCheckedChange={() => toggleRole(role.id)}
            />
            <Label htmlFor={`role-${role.id}`} className="text-sm font-normal cursor-pointer">
              {role.label}
            </Label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Admin and Owner roles always have access
      </p>
    </div>
  );
}
