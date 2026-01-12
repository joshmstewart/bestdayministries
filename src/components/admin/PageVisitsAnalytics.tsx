import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { BarChart3, Users, Eye, Calendar, Clock, RefreshCw } from "lucide-react";

interface PageVisit {
  id: string;
  page_url: string;
  page_title: string | null;
  user_id: string | null;
  session_id: string | null;
  visited_at: string;
  profiles?: { display_name: string | null } | null;
}

interface ChartData {
  label: string;
  // Raw rows (each row = one page view)
  pageViews: number;
  // Visits = unique sessions in the bucket
  visits: number;
  // Unique visitors = logged-in users + guest sessions in the bucket
  uniqueVisitors: number;
}

export function PageVisitsAnalytics() {
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [dateRange, setDateRange] = useState<number>(7); // days
  const [viewMode, setViewMode] = useState<"daily" | "hourly">("daily");

  // Fetch unique pages
  const { data: pages } = useQuery({
    queryKey: ["page-visits-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_visits")
        .select("page_url")
        .order("page_url");
      if (error) throw error;
      
      // Get unique pages
      const uniquePages = [...new Set(data.map(p => p.page_url))].sort();
      return uniquePages;
    },
  });

  // Fetch visits for selected page and date range
  const { data: visits, isLoading, refetch } = useQuery({
    queryKey: ["page-visits", selectedPage, dateRange],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), dateRange));
      const pageSize = 1000;

      // IMPORTANT: PostgREST has a default per-request limit (commonly 1000).
      // We must paginate, otherwise charts/stats can be wildly wrong (partial-day sampling).
      const allRows: Array<
        Omit<PageVisit, "profiles"> & { visited_at: string }
      > = [];

      for (let offset = 0; offset < 50000; offset += pageSize) {
        let query = supabase
          .from("page_visits")
          .select(
            `
            id,
            page_url,
            page_title,
            user_id,
            session_id,
            visited_at
          `
          )
          .gte("visited_at", startDate.toISOString())
          .order("visited_at", { ascending: false });

        if (selectedPage !== "all") {
          query = query.eq("page_url", selectedPage);
        }

        const { data, error } = await query.range(offset, offset + pageSize - 1);
        if (error) throw error;

        const rows = (data || []) as any[];
        allRows.push(...rows);

        if (rows.length < pageSize) break;
      }

      // Fetch user profiles separately
      const userIds = [...new Set(allRows.filter(v => v.user_id).map(v => v.user_id))] as string[];
      let profilesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.display_name || "User"]));
        }
      }

      return allRows.map(v => ({
        ...v,
        profiles: v.user_id ? { display_name: profilesMap[v.user_id] || "User" } : null,
      })) as PageVisit[];
    },
  });

  // Process data for charts
  const chartData: ChartData[] = (() => {
    if (!visits) return [];

    const grouped = new Map<
      string,
      { pageViews: number; sessions: Set<string>; visitors: Set<string> }
    >();

    visits.forEach((visit) => {
      const date = parseISO(visit.visited_at);
      const key =
        viewMode === "daily" ? format(date, "MMM d") : format(date, "MMM d HH:00");

      if (!grouped.has(key)) {
        grouped.set(key, { pageViews: 0, sessions: new Set(), visitors: new Set() });
      }

      const entry = grouped.get(key)!;
      entry.pageViews += 1;

      // Visits = unique sessions
      if (visit.session_id) entry.sessions.add(visit.session_id);

      // Unique visitors = logged-in users + guest sessions
      if (visit.user_id) entry.visitors.add(`user-${visit.user_id}`);
      else if (visit.session_id) entry.visitors.add(`guest-${visit.session_id}`);
    });

    return Array.from(grouped.entries())
      .map(([label, data]) => ({
        label,
        pageViews: data.pageViews,
        visits: data.sessions.size,
        uniqueVisitors: data.visitors.size,
      }))
      .reverse();
  })();

  // Summary stats
  // - Total Visits = unique sessions in the selected period
  // - Unique Visitors = (logged-in user IDs) + (guest session IDs) in the selected period
  const stats = (() => {
    const rows = visits || [];

    const sessionIds = rows.map(v => v.session_id).filter(Boolean) as string[];
    const userIds = rows.map(v => v.user_id).filter(Boolean) as string[];
    const guestSessionIds = rows.filter(v => !v.user_id).map(v => v.session_id).filter(Boolean) as string[];

    const uniqueVisitors = new Set(
      rows
        .map(v => (v.user_id ? `user-${v.user_id}` : v.session_id ? `guest-${v.session_id}` : null))
        .filter(Boolean) as string[]
    );

    return {
      pageViews: rows.length,
      totalVisits: new Set(sessionIds).size,
      uniqueVisitors: uniqueVisitors.size,
      loggedInUsers: new Set(userIds).size,
      guestSessions: new Set(guestSessionIds).size,
    };
  })();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger>
              <SelectValue placeholder="Select a page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              {pages?.map(page => (
                <SelectItem key={page} value={page}>{page}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "hourly")}>
          <TabsList>
            <TabsTrigger value="daily" className="gap-1">
              <Calendar className="w-3 h-3" /> Daily
            </TabsTrigger>
            <TabsTrigger value="hourly" className="gap-1">
              <Clock className="w-3 h-3" /> Hourly
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Visits</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalVisits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.pageViews.toLocaleString()} page views</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unique Visitors</span>
            </div>
            <p className="text-2xl font-bold">{stats.uniqueVisitors.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{stats.guestSessions.toLocaleString()} guest sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Logged In Users</span>
            </div>
            <p className="text-2xl font-bold">{stats.loggedInUsers.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Page Views</span>
            </div>
            <p className="text-2xl font-bold">{stats.pageViews.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Page Visits Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                  angle={viewMode === "hourly" ? -45 : 0}
                  textAnchor={viewMode === "hourly" ? "end" : "middle"}
                  height={viewMode === "hourly" ? 60 : 30}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="visits" name="Visits (sessions)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uniqueVisitors" name="Unique Visitors" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Visitor List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recent Visitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !visits?.length ? (
            <p className="text-muted-foreground">No visits recorded</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Page</th>
                    <th className="text-left py-2 px-2">Visitor</th>
                    <th className="text-left py-2 px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 100).map((visit) => (
                    <tr key={visit.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <span className="font-mono text-xs">{visit.page_url}</span>
                      </td>
                      <td className="py-2 px-2">
                        {visit.user_id ? (
                          <Badge variant="secondary" className="gap-1">
                            <Users className="w-3 h-3" />
                            {visit.profiles?.display_name || "User"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Guest</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {format(parseISO(visit.visited_at), "MMM d, h:mm a")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visits.length > 100 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing first 100 of {visits.length} visits
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}