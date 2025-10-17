import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Mail, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AutomatedSendsLog = () => {
  const [selectedSend, setSelectedSend] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: sends, isLoading } = useQuery({
    queryKey: ["automated-campaign-sends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automated_campaign_sends")
        .select(`
          *,
          campaign_templates (
            name,
            subject,
            content
          )
        `)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case "bounced":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Bounced</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Automated Email Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : !sends || sends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No automated emails sent yet
          </div>
        ) : (
          <div className="space-y-3">
            {sends.map((send: any) => (
              <div key={send.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{send.campaign_templates?.name || "Unknown Template"}</div>
                    <div className="text-sm text-muted-foreground">{send.recipient_email}</div>
                  </div>
                  <div className="flex gap-2">
                    {send.campaign_templates?.content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSend(send);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {getStatusBadge(send.status)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Event: {send.trigger_event}</span>
                  <span>•</span>
                  <span>{format(new Date(send.sent_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                {send.error_message && (
                  <div className="text-xs text-destructive mt-2">
                    Error: {send.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {selectedSend && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-2">
                <div className="text-sm font-medium">Template:</div>
                <div className="text-sm">{selectedSend.campaign_templates?.name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Subject:</div>
                <div className="text-sm">{selectedSend.campaign_templates?.subject}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Recipient:</div>
                <div className="text-sm">{selectedSend.recipient_email}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Sent:</div>
                <div className="text-sm">{format(new Date(selectedSend.sent_at), "MMM d, yyyy 'at' h:mm a")}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Email Content:</div>
                <div 
                  className="border rounded-lg p-4 bg-white text-sm"
                  dangerouslySetInnerHTML={{ __html: selectedSend.campaign_templates?.content || '<p class="text-muted-foreground">No content available</p>' }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
