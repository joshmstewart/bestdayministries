import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, DollarSign, Calendar, MessageSquare, ShoppingCart, TrendingUp } from "lucide-react";

interface AnalyticsData {
  userGrowth: Array<{ month: string; users: number }>;
  sponsorshipRevenue: Array<{ month: string; revenue: number; count: number }>;
  eventAttendance: Array<{ month: string; events: number; attendees: number }>;
  postEngagement: Array<{ month: string; posts: number; comments: number }>;
  orderStats: Array<{ month: string; orders: number; revenue: number }>;
  roleDistribution: Array<{ name: string; value: number }>;
  topMetrics: {
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    avgOrderValue: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--burnt-orange))', 'hsl(var(--mustard))'];

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: [],
    sponsorshipRevenue: [],
    eventAttendance: [],
    postEngagement: [],
    orderStats: [],
    roleDistribution: [],
    topMetrics: {
      totalRevenue: 0,
      totalOrders: 0,
      activeUsers: 0,
      avgOrderValue: 0,
    },
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [
        userGrowthData,
        sponsorshipData,
        eventData,
        postData,
        orderData,
        roleData,
      ] = await Promise.all([
        fetchUserGrowth(),
        fetchSponsorshipRevenue(),
        fetchEventAttendance(),
        fetchPostEngagement(),
        fetchOrderStats(),
        fetchRoleDistribution(),
      ]);

      const topMetrics = await fetchTopMetrics();

      setAnalytics({
        userGrowth: userGrowthData,
        sponsorshipRevenue: sponsorshipData,
        eventAttendance: eventData,
        postEngagement: postData,
        orderStats: orderData,
        roleDistribution: roleData,
        topMetrics,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowth = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .order("created_at", { ascending: true });

    if (!data) return [];

    const monthlyData = new Map<string, number>();
    data.forEach((profile) => {
      const month = new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      monthlyData.set(month, (monthlyData.get(month) || 0) + 1);
    });

    let cumulative = 0;
    return Array.from(monthlyData.entries()).map(([month, count]) => {
      cumulative += count;
      return { month, users: cumulative };
    });
  };

  const fetchSponsorshipRevenue = async () => {
    const { data } = await supabase
      .from("sponsorships")
      .select("amount, started_at, status")
      .eq("status", "active");

    if (!data) return [];

    const monthlyData = new Map<string, { revenue: number; count: number }>();
    data.forEach((sponsorship) => {
      const month = new Date(sponsorship.started_at || new Date()).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { revenue: 0, count: 0 };
      monthlyData.set(month, {
        revenue: current.revenue + Number(sponsorship.amount),
        count: current.count + 1,
      });
    });

    return Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      revenue: stats.revenue,
      count: stats.count,
    }));
  };

  const fetchEventAttendance = async () => {
    const { data: events } = await supabase
      .from("events")
      .select("id, created_at");

    const { data: attendees } = await supabase
      .from("event_attendees")
      .select("created_at");

    if (!events) return [];

    const monthlyData = new Map<string, { events: number; attendees: number }>();
    
    events.forEach((event) => {
      const month = new Date(event.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { events: 0, attendees: 0 };
      monthlyData.set(month, { ...current, events: current.events + 1 });
    });

    attendees?.forEach((attendee) => {
      const month = new Date(attendee.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { events: 0, attendees: 0 };
      monthlyData.set(month, { ...current, attendees: current.attendees + 1 });
    });

    return Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      events: stats.events,
      attendees: stats.attendees,
    }));
  };

  const fetchPostEngagement = async () => {
    const { data: posts } = await supabase
      .from("discussion_posts")
      .select("created_at");

    const { data: comments } = await supabase
      .from("discussion_comments")
      .select("created_at");

    if (!posts) return [];

    const monthlyData = new Map<string, { posts: number; comments: number }>();
    
    posts.forEach((post) => {
      const month = new Date(post.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { posts: 0, comments: 0 };
      monthlyData.set(month, { ...current, posts: current.posts + 1 });
    });

    comments?.forEach((comment) => {
      const month = new Date(comment.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { posts: 0, comments: 0 };
      monthlyData.set(month, { ...current, comments: current.comments + 1 });
    });

    return Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      posts: stats.posts,
      comments: stats.comments,
    }));
  };

  const fetchOrderStats = async () => {
    const { data } = await supabase
      .from("orders")
      .select("created_at, total_amount");

    if (!data) return [];

    const monthlyData = new Map<string, { orders: number; revenue: number }>();
    data.forEach((order) => {
      const month = new Date(order.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      const current = monthlyData.get(month) || { orders: 0, revenue: 0 };
      monthlyData.set(month, {
        orders: current.orders + 1,
        revenue: current.revenue + Number(order.total_amount),
      });
    });

    return Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      orders: stats.orders,
      revenue: stats.revenue,
    }));
  };

  const fetchRoleDistribution = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role");

    if (!data) return [];

    const roleCount = new Map<string, number>();
    data.forEach((item) => {
      roleCount.set(item.role, (roleCount.get(item.role) || 0) + 1);
    });

    return Array.from(roleCount.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  const fetchTopMetrics = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("total_amount");

    const { data: sponsorships } = await supabase
      .from("sponsorships")
      .select("amount")
      .eq("status", "active");

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const totalOrders = orders?.length || 0;
    const orderRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    const sponsorshipRevenue = sponsorships?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
    const totalRevenue = orderRevenue + sponsorshipRevenue;

    return {
      totalRevenue,
      totalOrders,
      activeUsers: activeUsers || 0,
      avgOrderValue: totalOrders > 0 ? orderRevenue / totalOrders : 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.topMetrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Orders + Sponsorships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.topMetrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${analytics.topMetrics.avgOrderValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.topMetrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Total registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.userGrowth.length > 0
                ? `+${analytics.userGrowth[analytics.userGrowth.length - 1]?.users || 0}`
                : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Total users</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Over Time</CardTitle>
              <CardDescription>Cumulative user registrations by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sponsorship Revenue</CardTitle>
              <CardDescription>Monthly sponsorship revenue and count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.sponsorshipRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.3)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary) / 0.3)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Activity</CardTitle>
              <CardDescription>Events created and attendees registered by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.eventAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="events" fill="hsl(var(--accent))" />
                  <Bar dataKey="attendees" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discussion Engagement</CardTitle>
              <CardDescription>Posts and comments activity by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.postEngagement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="posts" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke="hsl(var(--accent))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Statistics</CardTitle>
              <CardDescription>Order volume and revenue by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.orderStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="hsl(var(--burnt-orange))" />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--mustard))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Distribution</CardTitle>
              <CardDescription>Breakdown of users by role</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.roleDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.roleDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
