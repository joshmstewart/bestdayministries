import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Minus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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

type SortField = 'email' | 'total_delivered' | 'total_opens' | 'total_clicks' | 'open_rate' | 'click_rate' | 'last_activity';
type SortDirection = 'asc' | 'desc';

export const SubscriberEngagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('total_clicks');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["subscriber-engagement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscriber_engagement")
        .select("*");

      if (error) throw error;
      return data as SubscriberEngagementData[];
    },
  });

  const sortedAndFilteredSubscribers = useMemo(() => {
    if (!subscribers) return [];
    
    // Filter first
    let filtered = subscribers.filter(sub => 
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.subscriber_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Then sort
    return filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortField) {
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'total_delivered':
          aVal = a.total_delivered ?? 0;
          bVal = b.total_delivered ?? 0;
          break;
        case 'total_opens':
          aVal = a.total_opens ?? 0;
          bVal = b.total_opens ?? 0;
          break;
        case 'total_clicks':
          aVal = a.total_clicks ?? 0;
          bVal = b.total_clicks ?? 0;
          break;
        case 'open_rate':
          aVal = a.open_rate ?? -1;
          bVal = b.open_rate ?? -1;
          break;
        case 'click_rate':
          aVal = a.click_rate ?? -1;
          bVal = b.click_rate ?? -1;
          break;
        case 'last_activity':
          aVal = a.last_clicked_at || a.last_opened_at || '';
          bVal = b.last_clicked_at || b.last_opened_at || '';
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [subscribers, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isActive = sortField === field;
    return (
      <th className={`px-4 py-3 text-sm font-medium ${className || ''}`}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent font-medium"
          onClick={() => handleSort(field)}
        >
          {children}
          {isActive ? (
            sortDirection === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
            ) : (
              <ArrowUp className="ml-1 h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          )}
        </Button>
      </th>
    );
  };

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
          {sortedAndFilteredSubscribers.length} subscribers
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <SortableHeader field="email" className="text-left">Subscriber</SortableHeader>
                <th className="px-4 py-3 text-left text-sm font-medium">Engagement</th>
                <SortableHeader field="total_delivered" className="text-center">Delivered</SortableHeader>
                <SortableHeader field="total_opens" className="text-center">Opens</SortableHeader>
                <SortableHeader field="total_clicks" className="text-center">Clicks</SortableHeader>
                <SortableHeader field="open_rate" className="text-center">Open Rate</SortableHeader>
                <SortableHeader field="click_rate" className="text-center">Click Rate</SortableHeader>
                <SortableHeader field="last_activity" className="text-left">Last Activity</SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedAndFilteredSubscribers.map((sub) => {
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
              {sortedAndFilteredSubscribers.length === 0 && (
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
