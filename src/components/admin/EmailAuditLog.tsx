import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Mail, ExternalLink, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  resend_email_id: string | null;
  email_type: string;
  recipient_email: string;
  recipient_name: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  html_content: string | null;
  status: string;
  error_message: string | null;
  related_id: string | null;
  related_type: string | null;
  metadata: any;
  created_at: string;
  sent_at: string | null;
}

export default function EmailAuditLog() {
  const [searchEmail, setSearchEmail] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["email-audit-log", searchEmail, typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchEmail) {
        query = query.ilike("recipient_email", `%${searchEmail}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("email_type", typeFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "bounced":
        return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      default:
        return "bg-secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      receipt: "Receipt",
      contact_confirmation: "Contact Confirmation",
      contact_reply: "Contact Reply",
      admin_notification: "Admin Notification",
      year_end_summary: "Year-End Summary",
      newsletter: "Newsletter",
      notification: "Notification",
      digest: "Digest",
    };
    return labels[type] || type;
  };

  const openResendDashboard = (emailId: string) => {
    window.open(`https://resend.com/emails/${emailId}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Email type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="contact_confirmation">Contact Confirmation</SelectItem>
            <SelectItem value="contact_reply">Contact Reply</SelectItem>
            <SelectItem value="admin_notification">Admin Notification</SelectItem>
            <SelectItem value="year_end_summary">Year-End Summary</SelectItem>
            <SelectItem value="newsletter">Newsletter</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
            <SelectItem value="digest">Digest</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Audit Log</CardTitle>
          <CardDescription>
            Complete audit trail of all emails sent by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No emails found matching your filters
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{log.subject}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          To: {log.recipient_email}
                          {log.recipient_name && ` (${log.recipient_name})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        <Badge variant="outline">{getTypeLabel(log.email_type)}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {log.resend_email_id && (
                        <span className="truncate">ID: {log.resend_email_id}</span>
                      )}
                    </div>

                    {log.error_message && (
                      <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEmail(log)}
                      title="View email content"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {log.resend_email_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openResendDashboard(log.resend_email_id!)}
                        title="Open in Resend Dashboard"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Content Preview</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">To:</span> {selectedEmail.recipient_email}
                </div>
                <div>
                  <span className="font-medium">From:</span> {selectedEmail.from_email}
                </div>
                <div>
                  <span className="font-medium">Subject:</span> {selectedEmail.subject}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <Badge className={getStatusColor(selectedEmail.status)}>
                    {selectedEmail.status}
                  </Badge>
                </div>
              </div>
              
              {selectedEmail.html_content ? (
                <div className="border rounded-lg p-4 bg-white">
                  <iframe
                    srcDoc={selectedEmail.html_content}
                    className="w-full min-h-[500px] border-0"
                    title="Email preview"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No email content available
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
