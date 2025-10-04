import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export const ImpersonationBanner = () => {
  const { impersonatedRole, stopImpersonation, isImpersonating } = useRoleImpersonation();

  if (!isImpersonating) return null;

  const roleLabels: Record<string, string> = {
    caregiver: "Guardian",
    bestie: "Bestie",
    supporter: "Supporter",
  };

  const handleStopImpersonation = () => {
    stopImpersonation();
    window.location.reload();
  };

  return (
    <div className="bg-[#FF8C42] text-white py-2 px-4 flex items-center justify-center gap-4 sticky top-0 z-[60] shadow-lg">
      <Eye className="w-5 h-5" />
      <span className="font-semibold">
        Admin Mode: Viewing as {roleLabels[impersonatedRole || ""]}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStopImpersonation}
        className="text-white hover:bg-[#FF7C32] hover:text-white"
      >
        <X className="w-4 h-4 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
};
