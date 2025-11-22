import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Download, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ChangesDiffViewer } from "./ChangesDiffViewer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PreviewChange {
  sponsorship_id: string;
  stripe_subscription_id: string;
  stripe_mode: string;
  change_type: string;
  before_state: any;
  after_state: any;
  stripe_data?: any;
}

interface PreviewChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: {
    preview_mode: boolean;
    checked: number;
    would_fix?: number;
    would_update?: number;
    would_cancel?: number;
    changes: PreviewChange[];
    warnings?: string[];
  } | null;
  onApprove: () => void;
  executing: boolean;
  jobType: "recovery" | "sync";
}

export function PreviewChangesDialog({
  open,
  onOpenChange,
  previewData,
  onApprove,
  executing,
  jobType,
}: PreviewChangesDialogProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (!previewData) return null;

  const totalChanges = previewData.would_fix || previewData.would_update || previewData.would_cancel || 0;

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const downloadPreview = () => {
    const dataStr = JSON.stringify(previewData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${jobType}-preview-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case "field_backfill": return "Field Recovery";
      case "status_update": return "Status Update";
      case "cancellation": return "Cancellation";
      default: return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "field_backfill": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "status_update": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancellation": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {jobType === "recovery" ? "Preview Recovery Changes" : "Preview Sync Changes"}
              </DialogTitle>
              <DialogDescription>
                Review all proposed changes before executing
              </DialogDescription>
            </div>
            <Button onClick={downloadPreview} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Preview
            </Button>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Summary</h3>
            <Badge variant="outline">{previewData.stripe_mode || "test"}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Records Checked:</span>{" "}
              <span className="font-semibold">{previewData.checked}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Will Change:</span>{" "}
              <span className="font-semibold text-primary">{totalChanges}</span>
            </div>
            {previewData.would_cancel !== undefined && previewData.would_cancel > 0 && (
              <div>
                <span className="text-muted-foreground">Will Cancel:</span>{" "}
                <span className="font-semibold text-destructive">{previewData.would_cancel}</span>
              </div>
            )}
          </div>
          {previewData.warnings && previewData.warnings.length > 0 && (
            <div className="pt-2 border-t">
              {previewData.warnings.map((warning, i) => (
                <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ {warning}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Changes Table */}
        {previewData.changes.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Proposed Changes ({previewData.changes.length})</h3>
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Sponsorship ID</TableHead>
                    <TableHead>Stripe ID</TableHead>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.changes.map((change) => {
                    const isExpanded = expandedRows.has(change.sponsorship_id);
                    return (
                      <Collapsible key={change.sponsorship_id} open={isExpanded} onOpenChange={() => toggleRow(change.sponsorship_id)} asChild>
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {change.sponsorship_id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {change.stripe_subscription_id.slice(0, 20)}...
                            </TableCell>
                            <TableCell>
                              <Badge className={getChangeTypeColor(change.change_type)}>
                                {getChangeTypeLabel(change.change_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {Object.keys(change.after_state).filter(
                                k => change.before_state[k] !== change.after_state[k]
                              ).join(", ")}
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30">
                                <div className="p-4 space-y-4">
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">Field Changes</h4>
                                    <ChangesDiffViewer 
                                      beforeState={change.before_state}
                                      afterState={change.after_state}
                                    />
                                  </div>
                                  {change.stripe_data && (
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">Stripe Data</h4>
                                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                        {JSON.stringify(change.stripe_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No changes needed. All records are in sync.
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span>This action cannot be undone</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executing}>
              Cancel
            </Button>
            <Button 
              onClick={onApprove} 
              disabled={executing || previewData.changes.length === 0}
              variant={previewData.changes.length > 0 ? "default" : "secondary"}
            >
              {executing ? "Executing..." : `Approve and Execute ${totalChanges > 0 ? `(${totalChanges})` : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
