import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Trash2, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface IssueReport {
  id: string;
  user_id: string | null;
  user_email: string | null;
  title: string;
  description: string;
  image_url: string | null;
  current_url: string | null;
  status: string;
  priority: string;
  browser_info: any;
  session_data: any;
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  admin_notes: string | null;
}

const IssueReportsManager = () => {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();

    // Subscribe to new reports
    const channel = supabase
      .channel('issue_reports_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_reports'
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("issue_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load issue reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: IssueReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
    setNewStatus(report.status);
    setDetailsOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = {
        status: newStatus,
        admin_notes: adminNotes.trim() || null
      };

      if (newStatus === "resolved" && selectedReport.status !== "resolved") {
        updates.resolved_by = user?.id;
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("issue_reports")
        .update(updates)
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report updated",
      });

      setDetailsOpen(false);
      fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from("issue_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Report deleted",
      });

      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <AlertCircle className="w-4 h-4" />;
      case "investigating": return <Clock className="w-4 h-4" />;
      case "resolved": return <CheckCircle2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filterByStatus = (status: string) => {
    return reports.filter(r => r.status === status);
  };

  const ReportCard = ({ report }: { report: IssueReport }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{report.title}</h3>
              <Badge variant={getPriorityColor(report.priority)}>
                {report.priority}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {getStatusIcon(report.status)}
                {report.status}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.description}
            </p>
            
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Reported: {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}</span>
              {report.user_email && <span>• {report.user_email}</span>}
              {report.current_url && (
                <a 
                  href={report.current_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  Page URL
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewDetails(report)}
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(report.id)}
              title="Delete report"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div>Loading issue reports...</div>;
  }

  const newReports = filterByStatus("new");
  const investigatingReports = filterByStatus("investigating");
  const resolvedReports = filterByStatus("resolved");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Issue Reports</CardTitle>
          <CardDescription>
            View and manage bug reports and issues submitted by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="new" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="new" className="gap-2">
                New
                {newReports.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {newReports.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="investigating">
                Investigating
                {investigatingReports.length > 0 && (
                  <Badge className="ml-1">{investigatingReports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3">
              {newReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No new reports
                </p>
              ) : (
                newReports.map(report => <ReportCard key={report.id} report={report} />)
              )}
            </TabsContent>

            <TabsContent value="investigating" className="space-y-3">
              {investigatingReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reports being investigated
                </p>
              ) : (
                investigatingReports.map(report => <ReportCard key={report.id} report={report} />)
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-3">
              {resolvedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No resolved reports
                </p>
              ) : (
                resolvedReports.map(report => <ReportCard key={report.id} report={report} />)
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reports yet
                </p>
              ) : (
                reports.map(report => <ReportCard key={report.id} report={report} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedReport && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Issue Report Details
                <Badge variant={getPriorityColor(selectedReport.priority)}>
                  {selectedReport.priority}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedReport.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.image_url && (
                <div>
                  <Label className="mb-2 block">Screenshot</Label>
                  <img
                    src={selectedReport.image_url}
                    alt="Issue screenshot"
                    className="max-w-full rounded-lg border"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Reported By</Label>
                  <p className="text-sm">{selectedReport.user_email || "Guest"}</p>
                </div>
                <div>
                  <Label className="mb-2 block">Reported At</Label>
                  <p className="text-sm">
                    {format(new Date(selectedReport.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {selectedReport.current_url && (
                <div>
                  <Label className="mb-2 block">Page URL</Label>
                  <a
                    href={selectedReport.current_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {selectedReport.current_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div>
                <Label className="mb-2 block">Browser Information</Label>
                <div className="bg-muted p-3 rounded-lg">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(selectedReport.browser_info, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedReport.session_data?.recentActions && (
                <div>
                  <Label className="mb-2 block">Recent User Actions (Last 50)</Label>
                  <div className="bg-muted p-3 rounded-lg max-h-60 overflow-auto">
                    <div className="space-y-1">
                      {selectedReport.session_data.recentActions.map((action: any, idx: number) => (
                        <div key={idx} className="text-xs font-mono">
                          <span className="text-muted-foreground">
                            {format(new Date(action.timestamp), "HH:mm:ss")}
                          </span>
                          {" - "}
                          <span className="text-primary">{action.action}</span>
                          {" → "}
                          <span>{action.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes</Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this issue..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleUpdateReport}>
                  Update Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default IssueReportsManager;
