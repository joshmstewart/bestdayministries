import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type LogLevel = 'info' | 'success' | 'warning' | 'error';

type DetailedLog = {
  timestamp: string;
  sponsorship_id: string;
  level: LogLevel;
  message: string;
  details?: any;
};

type JobLog = {
  id: string;
  job_name: string;
  ran_at: string;
  completed_at: string | null;
  checked_count: number | null;
  updated_count: number | null;
  skipped_count: number | null;
  error_count: number | null;
  errors: any;
  status: string;
  stripe_mode: string;
  metadata: {
    detailed_logs?: DetailedLog[];
    start_time?: string;
    end_time?: string;
    cancelled_count?: number;
  } | null;
};

interface ReconciliationJobLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobLog: JobLog | null;
}

const getLevelIcon = (level: LogLevel) => {
  switch (level) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
};

const getLevelColor = (level: LogLevel) => {
  switch (level) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    default:
      return 'text-blue-600';
  }
};

export function ReconciliationJobLogsDialog({ open, onOpenChange, jobLog }: ReconciliationJobLogsDialogProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!jobLog) return null;

  const detailedLogs = jobLog.metadata?.detailed_logs || [];
  const startTime = jobLog.metadata?.start_time || jobLog.ran_at;
  const endTime = jobLog.metadata?.end_time || jobLog.completed_at;

  const copyLogEntry = (log: DetailedLog, index: number) => {
    const text = JSON.stringify({
      timestamp: log.timestamp,
      sponsorship_id: log.sponsorship_id,
      level: log.level,
      message: log.message,
      details: log.details,
    }, null, 2);
    
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: "Copied",
      description: "Log entry copied to clipboard",
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllLogs = () => {
    const text = JSON.stringify({
      job_name: jobLog.job_name,
      started: startTime,
      completed: endTime,
      summary: {
        checked: jobLog.checked_count,
        updated: jobLog.updated_count,
        skipped: jobLog.skipped_count,
        cancelled: jobLog.metadata?.cancelled_count,
        errors: jobLog.error_count,
      },
      detailed_logs: detailedLogs,
      errors: jobLog.errors,
    }, null, 2);
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "All logs copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Job Execution Logs</DialogTitle>
              <DialogDescription>
                {jobLog.job_name === 'recover-incomplete-sponsorships' 
                  ? 'Incomplete Sponsorship Recovery'
                  : 'Sponsorship Status Sync'}
              </DialogDescription>
            </div>
            <Button onClick={copyAllLogs} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Summary</h3>
            <Badge variant={jobLog.status === 'success' ? 'default' : 'destructive'}>
              {jobLog.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Started:</span>{' '}
              {format(new Date(startTime), 'PPp')}
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>{' '}
              {endTime ? format(new Date(endTime), 'PPp') : 'N/A'}
            </div>
            <div>
              <span className="text-muted-foreground">Stripe Mode:</span>{' '}
              <Badge variant="outline">{jobLog.stripe_mode}</Badge>
            </div>
            <div className="flex gap-3 flex-wrap">
              <span>Checked: {jobLog.checked_count || 0}</span>
              <span className="text-green-600">Updated: {jobLog.updated_count || 0}</span>
              {jobLog.skipped_count !== null && jobLog.skipped_count > 0 && (
                <span className="text-yellow-600">Skipped: {jobLog.skipped_count}</span>
              )}
              {jobLog.metadata?.cancelled_count !== null && jobLog.metadata.cancelled_count > 0 && (
                <span className="text-orange-600">Cancelled: {jobLog.metadata.cancelled_count}</span>
              )}
              <span className="text-red-600">Errors: {jobLog.error_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Detailed Logs */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Detailed Logs ({detailedLogs.length} entries)</h3>
          {detailedLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
              No detailed logs available for this job run.
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {detailedLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${getLevelColor(log.level)}`}>
                              {log.message}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              Sponsorship: <code className="text-xs">{log.sponsorship_id}</code>
                            </div>
                            <div>
                              Time: {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                            </div>
                            {log.details && (
                              <details className="mt-2">
                                <summary className="cursor-pointer hover:text-foreground">
                                  View details
                                </summary>
                                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => copyLogEntry(log, index)}
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Errors */}
        {jobLog.errors && Array.isArray(jobLog.errors) && jobLog.errors.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-red-600">Errors ({jobLog.errors.length})</h3>
            <ScrollArea className="max-h-[200px] border rounded-lg border-red-200">
              <div className="p-4 space-y-2">
                {jobLog.errors.map((error: any, index: number) => (
                  <div key={index} className="text-sm border-l-4 border-red-500 pl-3 py-1">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(error, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
