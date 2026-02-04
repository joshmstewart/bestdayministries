import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { SubscriberEngagement } from "./SubscriberEngagement";
import { EmailClientStats } from "./EmailClientStats";

export const NewsletterAnalytics = () => {
  const { data: campaignStats } = useQuery({
    queryKey: ["newsletter-campaign-stats"],
    queryFn: async () => {
      // Get all campaigns with analytics
      const { data: campaigns } = await supabase
        .from("newsletter_campaigns")
        .select("*, newsletter_analytics(*)")
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(10);

      return campaigns?.map((campaign) => {
        const analytics = campaign.newsletter_analytics || [];
        const sent = analytics.filter((a: any) => a.event_type === "sent").length;
        const delivered = analytics.filter((a: any) => a.event_type === "delivered").length;
        const opened = analytics.filter((a: any) => a.event_type === "opened").length;
        const clicked = analytics.filter((a: any) => a.event_type === "clicked").length;

        return {
          name: campaign.title.substring(0, 20) + "...",
          delivered: delivered || campaign.sent_to_count,
          opens: opened,
          clicks: clicked,
          deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0",
          openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0",
          clickRate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : "0",
        };
      });
    },
  });

  const { data: locationStats } = useQuery({
    queryKey: ["newsletter-location-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("newsletter_subscribers")
        .select("location_state, location_country")
        .eq("status", "active");

      // Group by state/country
      const stateCounts: Record<string, number> = {};
      data?.forEach((sub) => {
        const location = sub.location_state || sub.location_country || "Unknown";
        stateCounts[location] = (stateCounts[location] || 0) + 1;
      });

      return Object.entries(stateCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  });

  const { data: timezoneStats } = useQuery({
    queryKey: ["newsletter-timezone-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("newsletter_analytics")
        .select("timezone")
        .eq("event_type", "clicked")
        .not("timezone", "is", null);

      const timezoneCounts: Record<string, number> = {};
      data?.forEach((item) => {
        if (item.timezone && item.timezone !== "Unknown") {
          timezoneCounts[item.timezone] = (timezoneCounts[item.timezone] || 0) + 1;
        }
      });

      return Object.entries(timezoneCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    },
  });

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B9D"];

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="subscribers">Subscriber Engagement</TabsTrigger>
        <TabsTrigger value="clients">Email Clients</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4">Campaign Performance</h3>
        <Card className="p-6">
          {campaignStats && campaignStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="delivered" fill="hsl(var(--primary))" name="Delivered" />
                <Bar dataKey="opens" fill="hsl(var(--secondary))" name="Opens" />
                <Bar dataKey="clicks" fill="hsl(var(--accent))" name="Clicks" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No campaign data available yet
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold mb-4">Subscribers by Location</h3>
          <Card className="p-6">
            {locationStats && locationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={locationStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {locationStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No location data available
              </div>
            )}
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Engaged Readers by Timezone</h3>
          <Card className="p-6">
            {timezoneStats && timezoneStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timezoneStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No engagement data available yet
              </div>
            )}
          </Card>
        </div>
      </div>

      {campaignStats && campaignStats.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Recent Campaign Metrics</h3>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Campaign</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Delivered</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Open Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Click Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaignStats.map((campaign, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{campaign.name}</td>
                      <td className="px-4 py-3 text-sm">{campaign.delivered}</td>
                      <td className="px-4 py-3 text-sm">{campaign.openRate}%</td>
                      <td className="px-4 py-3 text-sm">{campaign.clickRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
        </div>
      </TabsContent>

      <TabsContent value="subscribers">
        <SubscriberEngagement />
      </TabsContent>

      <TabsContent value="clients">
        <EmailClientStats />
      </TabsContent>
    </Tabs>
  );
};