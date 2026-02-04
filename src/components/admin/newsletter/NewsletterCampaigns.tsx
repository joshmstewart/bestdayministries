import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Eye, Edit, Trash2, Zap, GitBranch, FileText, Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { NewsletterCampaignDialog } from "./NewsletterCampaignDialog";
import { CampaignActions } from "./CampaignActions";
import { CampaignStatsDialog } from "./CampaignStatsDialog";
import { NewsletterPreviewDialog } from "./NewsletterPreviewDialog";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import { format, formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { SectionLoadingState } from "@/components/common";

// Helper to detect if a campaign appears stuck (no progress for 3+ minutes)
const getStuckInfo = (campaign: any) => {
  if (campaign.status !== 'sending') return null;
  
  const lastProgress = campaign.last_progress_at 
    ? new Date(campaign.last_progress_at) 
    : new Date(campaign.updated_at || campaign.created_at);
  
  const minutesSinceProgress = (Date.now() - lastProgress.getTime()) / (1000 * 60);
  
  if (minutesSinceProgress >= 3) {
    return {
      minutes: Math.floor(minutesSinceProgress),
      lastProgress
    };
  }
  return null;
};

export const NewsletterCampaigns = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsCampaign, setStatsCampaign] = useState<any>(null);
  const [previewCampaign, setPreviewCampaign] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateCampaign, setTemplateCampaign] = useState<any>(null);

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
    // Refetch every 10 seconds when a campaign is sending
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasSending = data?.some((c: any) => c.status === 'sending');
      return hasSending ? 10000 : false;
    },
  });

  // Realtime subscription for queue progress
  useEffect(() => {
    const channel = supabase
      .channel('newsletter-queue-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'newsletter_campaigns',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


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

  const cloneCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get original campaign
      const { data: original, error: fetchError } = await supabase
        .from("newsletter_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      // Create copy
      const { error: insertError } = await supabase
        .from("newsletter_campaigns")
        .insert({
          title: `${original.title} (Copy)`,
          subject: original.subject,
          preview_text: original.preview_text,
          html_content: original.html_content,
          target_audience: original.target_audience,
          status: "draft",
          created_by: user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success("Campaign cloned");
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
        <SectionLoadingState message="Loading campaigns..." />
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
              <div className={isMobile ? "space-y-4" : "flex items-start justify-between"}>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-lg font-semibold">{campaign.title}</h4>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                    {/* TODO: Show these badges if campaign has automation or sequence */}
                    {false && (
                      <>
                        <Badge variant="outline" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Event Trigger
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <GitBranch className="h-3 w-3" />
                          Sequence (3 steps)
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
                    {campaign.created_at && (
                      <span>Created {format(new Date(campaign.created_at), "MMM d, yyyy")}</span>
                    )}
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
                  
                  {/* Queue progress bar for sending campaigns */}
                  {campaign.status === 'sending' && campaign.queued_count > 0 && (() => {
                    const stuckInfo = getStuckInfo(campaign);
                    return (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          {stuckInfo ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          <span className="text-muted-foreground">
                            Sending: {(campaign.processed_count || 0) + (campaign.failed_count || 0)} / {campaign.queued_count}
                            {campaign.failed_count > 0 && (
                              <span className="text-destructive ml-1">({campaign.failed_count} failed)</span>
                            )}
                          </span>
                        </div>
                        <Progress 
                          value={((campaign.processed_count || 0) + (campaign.failed_count || 0)) / campaign.queued_count * 100} 
                          className="h-2"
                        />
                        {stuckInfo ? (
                          <p className="text-xs text-warning flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            No progress for {stuckInfo.minutes} min — try "Resume Sending" below
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            ~{Math.ceil((campaign.queued_count - (campaign.processed_count || 0) - (campaign.failed_count || 0)) / 80)} min remaining
                            {campaign.last_progress_at && (
                              <span className="ml-2">• Last progress {formatDistanceToNow(new Date(campaign.last_progress_at), { addSuffix: true })}</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className={isMobile ? "flex gap-2 flex-wrap" : "flex gap-2 flex-shrink-0"}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewCampaign(campaign);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cloneCampaignMutation.mutate(campaign.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTemplateCampaign(campaign);
                          setSaveTemplateDialogOpen(true);
                        }}
                        title="Save as Template"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <CampaignActions
                        campaignId={campaign.id}
                        campaignStatus={campaign.status}
                        failedCount={campaign.failed_count || 0}
                        queuedCount={campaign.queued_count || 0}
                        processedCount={campaign.processed_count || 0}
                        onSendComplete={() => queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] })}
                      />
                    </>
                  )}
                  {(campaign.status === "sent" || campaign.status === "sending") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatsCampaign(campaign);
                          setStatsDialogOpen(true);
                        }}
                      >
                        View Stats
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cloneCampaignMutation.mutate(campaign.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTemplateCampaign(campaign);
                          setSaveTemplateDialogOpen(true);
                        }}
                        title="Save as Template"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {/* Show Retry/Resume buttons for sending or sent campaigns with failures */}
                      <CampaignActions
                        campaignId={campaign.id}
                        campaignStatus={campaign.status}
                        failedCount={campaign.failed_count || 0}
                        queuedCount={campaign.queued_count || 0}
                        processedCount={campaign.processed_count || 0}
                        onSendComplete={() => queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] })}
                      />
                    </>
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

      {statsCampaign && (
        <CampaignStatsDialog
          campaignId={statsCampaign.id}
          campaignTitle={statsCampaign.title}
          open={statsDialogOpen}
          onOpenChange={setStatsDialogOpen}
        />
      )}

      {previewCampaign && (
        <NewsletterPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          subject={previewCampaign.subject || ""}
          previewText={previewCampaign.preview_text || ""}
          htmlContent={previewCampaign.html_content || ""}
        />
      )}

      {templateCampaign && (
        <SaveAsTemplateDialog
          open={saveTemplateDialogOpen}
          onOpenChange={setSaveTemplateDialogOpen}
          campaignSubject={templateCampaign.subject || ""}
          campaignPreviewText={templateCampaign.preview_text || ""}
          campaignHtmlContent={templateCampaign.html_content || ""}
        />
      )}
    </div>
  );
};