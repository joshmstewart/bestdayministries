import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Eye, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type WebhookLog = Database['public']['Tables']['stripe_webhook_logs']['Row'];

interface ProcessingStep {
  timestamp: string;
  step: string;
  status: string;
  details: any;
}

export function WebhookLogsViewer() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("stripe_webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("processing_status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch webhook logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("webhook_logs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stripe_webhook_logs",
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const filteredLogs = logs.filter(
    (log) =>
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.customer_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: "default",
      failed: "destructive",
      processing: "secondary",
      skipped: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhook Logs</CardTitle>
              <CardDescription>
                Comprehensive tracking of all Stripe webhook events
              </CardDescription>
            </div>
            <Button onClick={fetchLogs} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search by event type, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No webhook logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getStatusBadge(log.processing_status)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.event_type}</TableCell>
                        <TableCell>
                          <Badge variant={log.stripe_mode === "live" ? "default" : "secondary"}>
                            {log.stripe_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.customer_email || "-"}</TableCell>
                        <TableCell>
                          {log.processing_duration_ms ? `${log.processing_duration_ms}ms` : "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              Event ID: {selectedLog?.event_id}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedLog && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Status</h4>
                    {getStatusBadge(selectedLog.processing_status)}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Mode</h4>
                    <Badge variant={selectedLog.stripe_mode === "live" ? "default" : "secondary"}>
                      {selectedLog.stripe_mode}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Event Type</h4>
                    <p className="font-mono text-sm">{selectedLog.event_type}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Processing Duration</h4>
                    <p>{selectedLog.processing_duration_ms ? `${selectedLog.processing_duration_ms}ms` : "-"}</p>
                  </div>
                  {selectedLog.customer_email && (
                    <div className="col-span-2">
                      <h4 className="font-semibold mb-2">Customer Email</h4>
                      <p>{selectedLog.customer_email}</p>
                    </div>
                  )}
                  {selectedLog.related_record_type && (
                    <div className="col-span-2">
                      <h4 className="font-semibold mb-2">Related Record</h4>
                      <p>{selectedLog.related_record_type}: {selectedLog.related_record_id}</p>
                    </div>
                  )}
                </div>

                {selectedLog.error_message && (
                  <div>
                    <h4 className="font-semibold mb-2 text-destructive">Error Message</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                      {selectedLog.error_message}
                    </pre>
                    {selectedLog.error_stack && (
                      <>
                        <h4 className="font-semibold mb-2 mt-4 text-destructive">Stack Trace</h4>
                        <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                          {selectedLog.error_stack}
                        </pre>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Processing Steps</h4>
                  <div className="space-y-2">
                    {(selectedLog.processing_steps as unknown as ProcessingStep[] | null)?.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        {getStatusIcon(step.status)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{step.step}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(step.timestamp), "HH:mm:ss.SSS")}
                            </span>
                          </div>
                          {step.details && Object.keys(step.details).length > 0 && (
                            <pre className="mt-1 text-xs text-muted-foreground overflow-auto">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Raw Event Data</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(selectedLog.raw_event, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
