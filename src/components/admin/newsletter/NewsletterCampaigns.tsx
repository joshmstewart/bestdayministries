import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NewsletterCampaignDialog } from "./NewsletterCampaignDialog";
import { format } from "date-fns";

export const NewsletterCampaigns = () => {
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["newsletter-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: { campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Campaign sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send campaign");
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("newsletter_campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign deleted");
      queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "scheduled":
        return "outline";
      case "sent":
        return "default";
      case "sending":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Email Campaigns</h3>
        <Button onClick={() => { setSelectedCampaign(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
      ) : campaigns?.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No campaigns yet</p>
          <Button onClick={() => { setSelectedCampaign(null); setIsDialogOpen(true); }}>
            Create Your First Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{campaign.title}</h4>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <span>Created {format(new Date(campaign.created_at), "MMM d, yyyy")}</span>
                    {campaign.scheduled_for && campaign.status === 'scheduled' && (
                      <span>Scheduled for {format(new Date(campaign.scheduled_for), "MMM d, yyyy 'at' h:mm a")}</span>
                    )}
                    {campaign.sent_at && (
                      <span>Sent {format(new Date(campaign.sent_at), "MMM d, yyyy")}</span>
                    )}
                    {campaign.sent_to_count > 0 && (
                      <span>{campaign.sent_to_count} recipients</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(campaign.status === "draft" || campaign.status === "scheduled") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {campaign.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => sendCampaignMutation.mutate(campaign.id)}
                          disabled={sendCampaignMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Now
                        </Button>
                      )}
                    </>
                  )}
                  {campaign.status === "sent" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: View analytics
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Stats
                    </Button>
                  )}
                  {(campaign.status === "draft" || campaign.status === "scheduled") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewsletterCampaignDialog
        campaign={selectedCampaign}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};