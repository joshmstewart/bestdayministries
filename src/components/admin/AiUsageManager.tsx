import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, TrendingUp } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

type TimeRange = "today" | "7days" | "30days" | "all";

export function AiUsageManager() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");

  const getDateFilter = () => {
    switch (timeRange) {
      case "today":
        return startOfDay(new Date()).toISOString();
      case "7days":
        return subDays(new Date(), 7).toISOString();
      case "30days":
        return subDays(new Date(), 30).toISOString();
      default:
        return null;
    }
  };

  const { data: usageLogs, isLoading } = useQuery({
    queryKey: ["ai-usage-logs", timeRange],
    queryFn: async () => {
      let query = supabase
        .from("ai_gateway_usage_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: summaryData } = useQuery({
    queryKey: ["ai-usage-summary", timeRange],
    queryFn: async () => {
      let query = supabase
        .from("ai_gateway_usage_log")
        .select("function_name, created_at");

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by function name
      const summary: Record<string, number> = {};
      data?.forEach((log) => {
        summary[log.function_name] = (summary[log.function_name] || 0) + 1;
      });

      return Object.entries(summary)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const totalCalls = summaryData?.reduce((acc, item) => acc + item.count, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Gateway Usage</h2>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
          </CardContent>
        </Card>

        {summaryData?.slice(0, 3).map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">{item.name}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.count.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {((item.count / totalCalls) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage by Function */}
      {summaryData && summaryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage by Function</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summaryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{ width: `${(item.count / totalCalls) * 100}%` }}
                      />
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent AI Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLogs?.slice(0, 50).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {format(new Date(log.created_at), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.function_name}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.model || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {(!usageLogs || usageLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No AI usage logged yet. Usage will appear here as edge functions are called.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
