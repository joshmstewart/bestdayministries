import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, subDays, parseISO } from "date-fns";
import { Users, Eye, Clock, Search, RefreshCw, ChevronUp, ChevronDown, BarChart3 } from "lucide-react";

interface UserStats {
  userId: string;
  displayName: string;
  totalPageViews: number;
  uniquePages: number;
  sessionCount: number;
  lastActive: string;
  topPages: { page: string; count: number }[];
}

interface UserSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  pageViews: number;
  pages: string[];
}

type SortField = "displayName" | "totalPageViews" | "sessionCount" | "lastActive";
type SortDirection = "asc" | "desc";

export function UserActivityAnalytics() {
  const [dateRange, setDateRange] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastActive");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  // Fetch all logged-in user page visits with pagination
  const { data: userStats, isLoading, refetch } = useQuery({
    queryKey: ["user-activity-analytics", dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), dateRange);
      const pageSize = 1000;
      const allVisits: Array<{
        user_id: string;
        page_url: string;
        session_id: string;
        visited_at: string;
      }> = [];

      // Paginate to get all visits
      for (let offset = 0; offset < 100000; offset += pageSize) {
        const { data, error } = await supabase
          .from("page_visits")
          .select("user_id, page_url, session_id, visited_at")
          .not("user_id", "is", null)
          .gte("visited_at", startDate.toISOString())
          .order("visited_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allVisits.push(...data);
        if (data.length < pageSize) break;
      }

      // Get unique user IDs
      const userIds = [...new Set(allVisits.map(v => v.user_id).filter(Boolean))] as string[];
      
      // Fetch profiles
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map(p => [p.id, p.display_name || "Unknown User"])
          );
        }
      }

      // Aggregate stats per user
      const userMap = new Map<string, {
        pageViews: number;
        pages: Map<string, number>;
        sessions: Set<string>;
        lastActive: string;
      }>();

      allVisits.forEach(visit => {
        if (!visit.user_id) return;
        
        if (!userMap.has(visit.user_id)) {
          userMap.set(visit.user_id, {
            pageViews: 0,
            pages: new Map(),
            sessions: new Set(),
            lastActive: visit.visited_at,
          });
        }

        const user = userMap.get(visit.user_id)!;
        user.pageViews++;
        user.pages.set(visit.page_url, (user.pages.get(visit.page_url) || 0) + 1);
        if (visit.session_id) user.sessions.add(visit.session_id);
        if (visit.visited_at > user.lastActive) {
          user.lastActive = visit.visited_at;
        }
      });

      // Convert to array
      const stats: UserStats[] = Array.from(userMap.entries()).map(([userId, data]) => {
        const topPages = Array.from(data.pages.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([page, count]) => ({ page, count }));

        return {
          userId,
          displayName: profilesMap[userId] || "Unknown User",
          totalPageViews: data.pageViews,
          uniquePages: data.pages.size,
          sessionCount: data.sessions.size,
          lastActive: data.lastActive,
          topPages,
        };
      });

      return stats;
    },
  });

  // Fetch user sessions for detail view
  const { data: userSessions } = useQuery({
    queryKey: ["user-sessions", selectedUser?.userId, dateRange],
    enabled: !!selectedUser && showUserDetail,
    queryFn: async () => {
      if (!selectedUser) return [];
      
      const startDate = subDays(new Date(), dateRange);
      const pageSize = 1000;
      const allVisits: Array<{
        page_url: string;
        session_id: string;
        visited_at: string;
      }> = [];

      for (let offset = 0; offset < 10000; offset += pageSize) {
        const { data, error } = await supabase
          .from("page_visits")
          .select("page_url, session_id, visited_at")
          .eq("user_id", selectedUser.userId)
          .gte("visited_at", startDate.toISOString())
          .order("visited_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allVisits.push(...data);
        if (data.length < pageSize) break;
      }

      // Group by session
      const sessionMap = new Map<string, {
        visits: Array<{ page: string; time: string }>;
      }>();

      allVisits.forEach(visit => {
        const sessionId = visit.session_id || "unknown";
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, { visits: [] });
        }
        sessionMap.get(sessionId)!.visits.push({
          page: visit.page_url,
          time: visit.visited_at,
        });
      });

      const sessions: UserSession[] = Array.from(sessionMap.entries())
        .map(([sessionId, data]) => {
          const sortedVisits = data.visits.sort((a, b) => 
            new Date(a.time).getTime() - new Date(b.time).getTime()
          );
          return {
            sessionId,
            startTime: sortedVisits[0]?.time || "",
            endTime: sortedVisits[sortedVisits.length - 1]?.time || "",
            pageViews: sortedVisits.length,
            pages: sortedVisits.map(v => v.page),
          };
        })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      return sessions;
    },
  });

  // Filter and sort
  const filteredStats = (userStats || [])
    .filter(u => 
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "displayName":
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case "totalPageViews":
          comparison = a.totalPageViews - b.totalPageViews;
          break;
        case "sessionCount":
          comparison = a.sessionCount - b.sessionCount;
          break;
        case "lastActive":
          comparison = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? 
      <ChevronDown className="w-4 h-4 inline" /> : 
      <ChevronUp className="w-4 h-4 inline" />;
  };

  // Summary stats
  const totalUsers = userStats?.length || 0;
  const totalPageViews = userStats?.reduce((sum, u) => sum + u.totalPageViews, 0) || 0;
  const avgPageViewsPerUser = totalUsers > 0 ? Math.round(totalPageViews / totalUsers) : 0;
  const totalSessions = userStats?.reduce((sum, u) => sum + u.sessionCount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Active Users</span>
            </div>
            <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Page Views</span>
            </div>
            <p className="text-2xl font-bold">{totalPageViews.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Views/User</span>
            </div>
            <p className="text-2xl font-bold">{avgPageViewsPerUser.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Sessions</span>
            </div>
            <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Activity ({filteredStats.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredStats.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No user activity found for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("displayName")}
                    >
                      User <SortIcon field="displayName" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort("totalPageViews")}
                    >
                      Page Views <SortIcon field="totalPageViews" />
                    </TableHead>
                    <TableHead className="text-right">Unique Pages</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort("sessionCount")}
                    >
                      Sessions <SortIcon field="sessionCount" />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("lastActive")}
                    >
                      Last Active <SortIcon field="lastActive" />
                    </TableHead>
                    <TableHead>Top Pages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((user) => (
                    <TableRow 
                      key={user.userId} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserDetail(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{user.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {user.totalPageViews.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {user.uniquePages}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {user.sessionCount}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(parseISO(user.lastActive), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.topPages.slice(0, 3).map((p, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {p.page.length > 20 ? p.page.slice(0, 20) + "..." : p.page}
                              <span className="ml-1 text-muted-foreground">({p.count})</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedUser?.displayName}'s Activity
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 overflow-y-auto flex-1">
              {/* User summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Page Views</p>
                  <p className="text-xl font-bold">{selectedUser.totalPageViews}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Unique Pages</p>
                  <p className="text-xl font-bold">{selectedUser.uniquePages}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Sessions</p>
                  <p className="text-xl font-bold">{selectedUser.sessionCount}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Last Active</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(selectedUser.lastActive), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>

              {/* Top pages */}
              <div>
                <h4 className="font-medium mb-2">Most Visited Pages</h4>
                <div className="space-y-1">
                  {selectedUser.topPages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                      <span className="font-mono text-sm">{p.page}</span>
                      <Badge variant="secondary">{p.count} views</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sessions */}
              <div>
                <h4 className="font-medium mb-2">Recent Sessions</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {userSessions?.slice(0, 20).map((session, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          {session.startTime && format(parseISO(session.startTime), "MMM d, h:mm a")}
                        </span>
                        <Badge variant="outline">{session.pageViews} pages</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {session.pages.slice(0, 5).map((page, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {page.length > 30 ? page.slice(0, 30) + "..." : page}
                          </Badge>
                        ))}
                        {session.pages.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{session.pages.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
