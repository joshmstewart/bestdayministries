import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, Shield } from "lucide-react";

interface CollaborativeEditingSettingsProps {
  allowAdminEdit: boolean;
  allowOwnerEdit: boolean;
  onAllowAdminEditChange: (checked: boolean) => void;
  onAllowOwnerEditChange: (checked: boolean) => void;
  showOwnerOption?: boolean;
}

export const CollaborativeEditingSettings = ({
  allowAdminEdit,
  allowOwnerEdit,
  onAllowAdminEditChange,
  onAllowOwnerEditChange,
  showOwnerOption = true,
}: CollaborativeEditingSettingsProps) => {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Collaborative Editing
        </CardTitle>
        <CardDescription>
          Allow other admins or owners to edit this content, including changing the author/creator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allow-admin-edit"
            checked={allowAdminEdit}
            onCheckedChange={(checked) => onAllowAdminEditChange(!!checked)}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="allow-admin-edit"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-blue-500" />
              Allow Admins to Edit
            </label>
            <p className="text-sm text-muted-foreground">
              Admins (non-owners) can edit this content and change its author/creator
            </p>
          </div>
        </div>

        {showOwnerOption && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allow-owner-edit"
              checked={allowOwnerEdit}
              onCheckedChange={(checked) => onAllowOwnerEditChange(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="allow-owner-edit"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-amber-500" />
                Allow Owners to Edit
              </label>
              <p className="text-sm text-muted-foreground">
                Owners can edit this content and change its author/creator
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <strong>Note:</strong> When collaborative editing is enabled, designated users can modify all aspects of this content, including reassigning authorship to themselves or others.
        </div>
      </CardContent>
    </Card>
  );
};
