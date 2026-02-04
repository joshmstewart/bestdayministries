import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SubscriberEngagementData {
  subscriber_identifier: string;
  email: string;
  subscriber_name: string | null;
  campaigns_received: number;
  total_delivered: number;
  total_opens: number;
  total_clicks: number;
  total_bounced: number;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  open_rate: number | null;
  click_rate: number | null;
}

export const SubscriberEngagement = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["subscriber-engagement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscriber_engagement")
        .select("*")
        .order("total_opens", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SubscriberEngagementData[];
    },
  });

  const filteredSubscribers = subscribers?.filter(sub => 
    sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sub.subscriber_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getEngagementLevel = (openRate: number | null, clickRate: number | null) => {
    if (openRate === null) return { label: "New", color: "secondary" };
    const score = (openRate || 0) + ((clickRate || 0) * 2); // Weight clicks higher
    if (score >= 50) return { label: "High", color: "default", icon: TrendingUp };
    if (score >= 20) return { label: "Medium", color: "secondary", icon: Minus };
    return { label: "Low", color: "outline", icon: TrendingDown };
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading subscriber engagement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredSubscribers?.length || 0} subscribers
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Subscriber</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Engagement</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Delivered</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Opens</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Clicks</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Open Rate</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Click Rate</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSubscribers?.map((sub) => {
                const engagement = getEngagementLevel(sub.open_rate, sub.click_rate);
                const EngagementIcon = engagement.icon;
                const lastActivity = sub.last_clicked_at || sub.last_opened_at;
                
                return (
                  <tr key={sub.subscriber_identifier} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{sub.subscriber_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={engagement.color as any} className="gap-1">
                        {EngagementIcon && <EngagementIcon className="h-3 w-3" />}
                        {engagement.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">{sub.total_delivered}</td>
                    <td className="px-4 py-3 text-center text-sm">{sub.total_opens}</td>
                    <td className="px-4 py-3 text-center text-sm">{sub.total_clicks}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {sub.open_rate !== null ? `${sub.open_rate}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {sub.click_rate !== null ? `${sub.click_rate}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {lastActivity ? format(new Date(lastActivity), "MMM d, yyyy") : "Never"}
                    </td>
                  </tr>
                );
              })}
              {(!filteredSubscribers || filteredSubscribers.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No subscriber engagement data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
