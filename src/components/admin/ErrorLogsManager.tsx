import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ErrorLog {
  id: string;
  created_at: string;
  error_message: string;
  error_type: string | null;
  stack_trace: string | null;
  user_email: string | null;
  url: string | null;
  sentry_event_id: string | null;
  severity: string;
  environment: string | null;
  metadata: any;
}

export const ErrorLogsManager = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.error_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    
    return matchesSearch && matchesSeverity;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
      case "fatal":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
      case "fatal":
        return "destructive";
      case "warning":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Logs</CardTitle>
        <CardDescription>
          Errors automatically logged from Sentry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="fatal">Fatal</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Logs List */}
        <ScrollArea className="h-[600px] rounded-md border p-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading error logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterSeverity !== "all" 
                ? "No errors match your filters" 
                : "No errors logged yet"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        {getSeverityIcon(log.severity)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-words">{log.error_message}</p>
                          {log.error_type && (
                            <p className="text-xs text-muted-foreground">{log.error_type}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={getSeverityColor(log.severity)} className="shrink-0">
                        {log.severity}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                      {log.user_email && <span>• {log.user_email}</span>}
                      {log.environment && <span>• {log.environment}</span>}
                      {log.url && (
                        <span className="truncate max-w-xs" title={log.url}>
                          • {log.url}
                        </span>
                      )}
                    </div>

                    {log.stack_trace && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View stack trace
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap break-words">
                          {log.stack_trace}
                        </pre>
                      </details>
                    )}
                    
                    {log.sentry_event_id && (
                      <p className="text-xs text-muted-foreground">
                        Sentry ID: {log.sentry_event_id}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
