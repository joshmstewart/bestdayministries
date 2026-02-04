import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Monitor, Smartphone, Tablet, ExternalLink } from "lucide-react";

interface CampaignStatsDialogProps {
  campaignId: string;
  campaignTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CampaignStatsDialog = ({ campaignId, campaignTitle, open, onOpenChange }: CampaignStatsDialogProps) => {
  const { data: campaign } = useQuery({
    queryKey: ["campaign-detail", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: analytics } = useQuery({
    queryKey: ["campaign-analytics", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_analytics")
        .select("*")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const sent = data.filter((a) => a.event_type === "sent").length;
      const delivered = data.filter((a) => a.event_type === "delivered").length;
      const opened = data.filter((a) => a.event_type === "opened").length;
      const clicked = data.filter((a) => a.event_type === "clicked").length;
      const bounced = data.filter((a) => a.event_type === "bounced").length;
      const complained = data.filter((a) => a.event_type === "complained").length;

      // Group clicks by URL
      const clicksByUrl: Record<string, number> = {};
      data
        .filter((a) => a.event_type === "clicked" && a.clicked_url)
        .forEach((a: any) => {
          const url = a.clicked_url!;
          clicksByUrl[url] = (clicksByUrl[url] || 0) + 1;
        });

      // Group by email client
      const byEmailClient: Record<string, { opens: number; clicks: number }> = {};
      data.forEach((a: any) => {
        const client = a.email_client || "Unknown";
        if (!byEmailClient[client]) {
          byEmailClient[client] = { opens: 0, clicks: 0 };
        }
        if (a.event_type === "opened") byEmailClient[client].opens++;
        if (a.event_type === "clicked") byEmailClient[client].clicks++;
      });

      // Group by device type
      const byDeviceType: Record<string, number> = {};
      data.forEach((a: any) => {
        const device = a.device_type || "unknown";
        byDeviceType[device] = (byDeviceType[device] || 0) + 1;
      });

      // Count layout fallbacks
      const fallbackCount = data.filter((a: any) => a.layout_fallback_used).length;

      return {
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0",
        openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0",
        clickRate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : "0",
        clicksByUrl: Object.entries(clicksByUrl)
          .map(([url, count]) => ({ url, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        byEmailClient: Object.entries(byEmailClient)
          .map(([client, data]) => ({ client, ...data }))
          .sort((a, b) => (b.opens + b.clicks) - (a.opens + a.clicks))
          .slice(0, 8),
        byDeviceType: Object.entries(byDeviceType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        fallbackCount,
        fallbackRate: data.length > 0 ? ((fallbackCount / data.length) * 100).toFixed(1) : "0",
      };
    },
    enabled: open,
  });

  const chartData = analytics
    ? [
        { name: "Sent", value: analytics.sent, fill: "hsl(var(--primary))" },
        { name: "Delivered", value: analytics.delivered, fill: "hsl(var(--secondary))" },
        { name: "Opened", value: analytics.opened, fill: "hsl(var(--accent))" },
        { name: "Clicked", value: analytics.clicked, fill: "hsl(var(--chart-1))" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Statistics: {campaignTitle}</DialogTitle>
        </DialogHeader>

        {campaign && analytics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-3xl font-bold">{analytics.deliveryRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-3xl font-bold">{analytics.openRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-3xl font-bold">{analytics.clickRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-3xl font-bold">{analytics.clicked}</p>
              </Card>
            </div>

            {/* Funnel Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Email Funnel</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Detailed Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Detailed Statistics</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent:</span>
                    <span className="font-medium">{analytics.sent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered:</span>
                    <span className="font-medium">{analytics.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opened:</span>
                    <span className="font-medium">{analytics.opened}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clicked:</span>
                    <span className="font-medium">{analytics.clicked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bounced:</span>
                    <span className="font-medium text-destructive">{analytics.bounced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complained:</span>
                    <span className="font-medium text-destructive">{analytics.complained}</span>
                  </div>
                  {campaign.sent_at && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Sent Date:</span>
                      <span className="font-medium">{format(new Date(campaign.sent_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  )}
                </div>
              </Card>

              {analytics.clicksByUrl.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Clicked Links</h3>
                  <div className="space-y-2">
                    {analytics.clicksByUrl.map((link, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="truncate flex-1 mr-2 text-muted-foreground">
                          {link.url.length > 40 ? link.url.substring(0, 40) + "..." : link.url}
                        </span>
                        <span className="font-medium">{link.count} clicks</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
