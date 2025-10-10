import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import ReportIssueDialog from "./ReportIssueDialog";

const ReportIssueButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
        title="Report an issue or bug"
      >
        <Bug className="w-4 h-4" />
        <span className="hidden sm:inline">Report Issue</span>
      </Button>

      <ReportIssueDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export default ReportIssueButton;
