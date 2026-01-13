import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionLoadingState } from "@/components/common";

export const NewsletterEmailsLog = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ["newsletter-emails-log", searchEmail, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_emails_log")
        .select("*, newsletter_campaigns(title), campaign_templates(name)")
        .order("sent_at", { ascending: false })
        .limit(500);

      if (searchEmail) {
        query = query.ilike("recipient_email", `%${searchEmail}%`);
      }

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "default";
      case "failed":
        return "destructive";
      case "bounced":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "bounced":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const statusCounts = emailLogs?.reduce((acc: any, log: any) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Email Send Log</h3>
          <p className="text-sm text-muted-foreground">
            View all newsletter emails sent, including status and errors
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">
            Total: {emailLogs?.length || 0}
          </Badge>
          {statusCounts.sent && (
            <Badge variant="default">
              Sent: {statusCounts.sent}
            </Badge>
          )}
          {statusCounts.failed && (
            <Badge variant="destructive">
              Failed: {statusCounts.failed}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Search Email</label>
          <Input
            placeholder="Search by email address..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <SectionLoadingState message="Loading email logs..." />
      ) : emailLogs?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No email logs found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {emailLogs?.map((log: any) => (
            <Card
              key={log.id}
              className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => setSelectedEmail(log)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getStatusColor(log.status)} className="gap-1">
                      {getStatusIcon(log.status)}
                      {log.status}
                    </Badge>
                    {log.metadata?.is_test && (
                      <Badge variant="outline">TEST</Badge>
                    )}
                  </div>
                  <p className="font-medium truncate">{log.recipient_email}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {log.subject}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                    <span>
                      {format(new Date(log.sent_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {log.newsletter_campaigns && (
                      <span>Campaign: {log.newsletter_campaigns.title}</span>
                    )}
                    {log.campaign_templates && (
                      <span>Template: {log.campaign_templates.name}</span>
                    )}
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-destructive mt-1 truncate">
                      Error: {log.error_message}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              View complete email information and content
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <Badge variant={getStatusColor(selectedEmail.status)} className="gap-1">
                    {getStatusIcon(selectedEmail.status)}
                    {selectedEmail.status}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Recipient</h4>
                  <p>{selectedEmail.recipient_email}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Subject</h4>
                  <p>{selectedEmail.subject}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Sent At</h4>
                  <p>{format(new Date(selectedEmail.sent_at), "PPpp")}</p>
                </div>

                {selectedEmail.newsletter_campaigns && (
                  <div>
                    <h4 className="font-semibold mb-2">Campaign</h4>
                    <p>{selectedEmail.newsletter_campaigns.title}</p>
                  </div>
                )}

                {selectedEmail.campaign_templates && (
                  <div>
                    <h4 className="font-semibold mb-2">Template</h4>
                    <p>{selectedEmail.campaign_templates.name}</p>
                  </div>
                )}

                {selectedEmail.resend_email_id && (
                  <div>
                    <h4 className="font-semibold mb-2">Resend Email ID</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmail.resend_email_id}
                    </p>
                  </div>
                )}

                {selectedEmail.error_message && (
                  <div>
                    <h4 className="font-semibold mb-2 text-destructive">Error Message</h4>
                    <p className="text-sm text-destructive">
                      {selectedEmail.error_message}
                    </p>
                  </div>
                )}

                {selectedEmail.html_content && (
                  <div>
                    <h4 className="font-semibold mb-2">Email Content Preview</h4>
                    <Card className="p-4 bg-muted/50">
                      <iframe
                        srcDoc={selectedEmail.html_content}
                        className="w-full h-96 border-0"
                        title="Email preview"
                      />
                    </Card>
                  </div>
                )}

                {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Metadata</h4>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedEmail.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
