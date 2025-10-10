import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TestRun {
  id: string;
  created_at: string;
  status: 'pending' | 'success' | 'failure' | 'cancelled';
  workflow_name: string;
  commit_sha: string;
  commit_message: string | null;
  branch: string;
  run_id: string;
  run_url: string;
  duration_seconds: number | null;
  test_count: number | null;
  passed_count: number | null;
  failed_count: number | null;
  skipped_count: number | null;
  error_message: string | null;
  metadata: any;
}

const TestRunsManager = () => {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTestRuns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTestRuns((data || []) as TestRun[]);
    } catch (error: any) {
      console.error('Error fetching test runs:', error);
      toast({
        title: "Error",
        description: "Failed to load test runs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestRuns();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('test_runs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_runs'
        },
        () => {
          fetchTestRuns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      success: "default",
      failure: "destructive",
      pending: "secondary",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Test Run History</CardTitle>
          <Button onClick={fetchTestRuns} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {testRuns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No test runs recorded yet. Tests will appear here after they run on GitHub.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell className="font-medium">{run.workflow_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.branch}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <code className="text-xs">{run.commit_sha.substring(0, 7)}</code>
                          {run.commit_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {run.commit_message}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(run.duration_seconds)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={run.run_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">
            To enable automatic logging, add this webhook URL to your GitHub repository:
          </p>
          <code className="block p-2 bg-muted rounded text-xs break-all">
            {import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-test-webhook
          </code>
          <p className="text-muted-foreground text-xs">
            Go to Settings → Webhooks → Add webhook in your GitHub repository. Set content type to "application/json"
            and select "Workflow runs" event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestRunsManager;
