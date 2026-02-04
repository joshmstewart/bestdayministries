import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Monitor, Smartphone, Tablet, HelpCircle, AlertTriangle } from "lucide-react";

interface EmailClientData {
  email_client: string;
  device_type: string;
  event_count: number;
  opens: number;
  clicks: number;
  fallback_used_count: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B9D", "#B8860B", "#9370DB"];

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'desktop': return <Monitor className="h-4 w-4" />;
    case 'mobile': return <Smartphone className="h-4 w-4" />;
    case 'tablet': return <Tablet className="h-4 w-4" />;
    default: return <HelpCircle className="h-4 w-4" />;
  }
};

export const EmailClientStats = () => {
  const { data: clientStats, isLoading } = useQuery({
    queryKey: ["email-client-stats"],
    queryFn: async () => {
      // Query raw analytics data and aggregate client-side
      const { data, error } = await supabase
        .from("newsletter_analytics")
        .select("email_client, device_type, event_type, layout_fallback_used")
        .not("email_client", "is", null);

      if (error) throw error;

      // Aggregate by email client
      const clientMap = new Map<string, { opens: number; clicks: number; total: number; fallbackCount: number }>();
      const deviceMap = new Map<string, number>();
      let totalFallbacks = 0;
      let totalEvents = 0;

      data?.forEach((row: any) => {
        const client = row.email_client || "Unknown";
        const device = row.device_type || "unknown";
        
        if (!clientMap.has(client)) {
          clientMap.set(client, { opens: 0, clicks: 0, total: 0, fallbackCount: 0 });
        }
        const clientData = clientMap.get(client)!;
        clientData.total++;
        
        if (row.event_type === "opened") clientData.opens++;
        if (row.event_type === "clicked") clientData.clicks++;
        if (row.layout_fallback_used) {
          clientData.fallbackCount++;
          totalFallbacks++;
        }
        
        deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
        totalEvents++;
      });

      const byClient = Array.from(clientMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const byDevice = Array.from(deviceMap.entries())
        .map(([name, value]) => ({ name, value }));

      return {
        byClient,
        byDevice,
        totalFallbacks,
        totalEvents,
        fallbackRate: totalEvents > 0 ? ((totalFallbacks / totalEvents) * 100).toFixed(1) : "0",
      };
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading email client statistics...</div>;
  }

  if (!clientStats || clientStats.byClient.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No email client data available yet. This data is collected when subscribers open or click emails.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Layout Fallback Alert */}
      {clientStats.totalFallbacks > 0 && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">Layout Fallbacks Detected</p>
              <p className="text-sm text-muted-foreground">
                {clientStats.totalFallbacks} emails ({clientStats.fallbackRate}%) used simpler layouts due to rendering issues.
                This typically happens with older email clients or complex HTML content.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Clients Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Email Clients</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clientStats.byClient}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
              >
                {clientStats.byClient.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Device Types Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Device Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clientStats.byDevice}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {clientStats.byDevice.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Engagement by Client */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Engagement by Email Client</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clientStats.byClient}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="opens" name="Opens" fill="hsl(var(--primary))" />
            <Bar dataKey="clicks" name="Clicks" fill="hsl(var(--secondary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Detailed Client Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Email Client</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Total Events</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Opens</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Clicks</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Fallbacks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clientStats.byClient.map((client, index) => (
                <tr key={index} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-center text-sm">{client.total}</td>
                  <td className="px-4 py-3 text-center text-sm">{client.opens}</td>
                  <td className="px-4 py-3 text-center text-sm">{client.clicks}</td>
                  <td className="px-4 py-3 text-center text-sm">
                    {client.fallbackCount > 0 ? (
                      <span className="text-yellow-600">{client.fallbackCount}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
