import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MousePointerClick, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface TabClickStats {
  tab_name: string;
  total_clicks: number;
  unique_users: number;
  last_clicked: string | null;
}

interface RecentClick {
  id: string;
  tab_name: string;
  page_url: string;
  created_at: string;
  user_id: string | null;
  display_name: string | null;
}

export function TabClickAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TabClickStats[]>([]);
  const [recentClicks, setRecentClicks] = useState<RecentClick[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch aggregated stats per tab
      const { data: clickData, error: clickError } = await supabase
        .from("tab_click_tracking")
        .select("tab_name, user_id, created_at");

      if (clickError) throw clickError;

      // Aggregate stats
      const statsMap = new Map<string, { clicks: number; users: Set<string>; lastClicked: string | null }>();
      
      (clickData || []).forEach((click) => {
        const existing = statsMap.get(click.tab_name) || { 
          clicks: 0, 
          users: new Set<string>(), 
          lastClicked: null 
        };
        existing.clicks++;
        if (click.user_id) existing.users.add(click.user_id);
        if (!existing.lastClicked || click.created_at > existing.lastClicked) {
          existing.lastClicked = click.created_at;
        }
        statsMap.set(click.tab_name, existing);
      });

      const aggregatedStats: TabClickStats[] = Array.from(statsMap.entries()).map(([tab_name, data]) => ({
        tab_name,
        total_clicks: data.clicks,
        unique_users: data.users.size,
        last_clicked: data.lastClicked,
      })).sort((a, b) => b.total_clicks - a.total_clicks);

      setStats(aggregatedStats);
      setTotalClicks(clickData?.length || 0);

      // Fetch recent clicks with user names
      const { data: recentData, error: recentError } = await supabase
        .from("tab_click_tracking")
        .select("id, tab_name, page_url, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      // Get user display names
      const userIds = [...new Set((recentData || []).map(c => c.user_id).filter(Boolean))] as string[];
      let userMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        
        (profiles || []).forEach(p => userMap.set(p.id, p.display_name || "Unknown"));
      }

      setRecentClicks((recentData || []).map(click => ({
        id: click.id,
        tab_name: click.tab_name,
        page_url: click.page_url,
        created_at: click.created_at,
        user_id: click.user_id,
        display_name: click.user_id ? userMap.get(click.user_id) || "Unknown" : "Anonymous"
      })));

    } catch (error) {
      console.error("Error loading tab analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTabName = (tabName: string) => {
    return tabName
      .replace("community_", "")
      .replace("_tab", "")
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks}</div>
            <p className="text-xs text-muted-foreground">All time tab clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tabs Tracked</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">Unique tabs with data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats[0] ? formatTabName(stats[0].tab_name) : "N/A"}</div>
            <p className="text-xs text-muted-foreground">
              {stats[0] ? `${stats[0].total_clicks} clicks` : "No data yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats by Tab */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks by Tab</CardTitle>
          <CardDescription>Breakdown of clicks for each tracked tab</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tab clicks recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab Name</TableHead>
                  <TableHead className="text-right">Total Clicks</TableHead>
                  <TableHead className="text-right">Unique Users</TableHead>
                  <TableHead className="text-right">Last Clicked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.tab_name}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{formatTabName(stat.tab_name)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{stat.total_clicks}</TableCell>
                    <TableCell className="text-right">{stat.unique_users}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {stat.last_clicked 
                        ? format(new Date(stat.last_clicked), "MMM d, h:mm a")
                        : "Never"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Clicks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Clicks</CardTitle>
          <CardDescription>Last 20 tab clicks with user information</CardDescription>
        </CardHeader>
        <CardContent>
          {recentClicks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent clicks.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentClicks.map((click) => (
                  <TableRow key={click.id}>
                    <TableCell>
                      <Badge variant="secondary">{formatTabName(click.tab_name)}</Badge>
                    </TableCell>
                    <TableCell>{click.display_name}</TableCell>
                    <TableCell className="text-muted-foreground">{click.page_url}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(new Date(click.created_at), "MMM d, h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
