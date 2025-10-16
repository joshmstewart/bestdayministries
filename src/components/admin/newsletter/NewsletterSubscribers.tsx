import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export const NewsletterSubscribers = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["newsletter-subscriber-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true });

      const { count: active } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      return { total, active };
    },
  });

  const filteredSubscribers = subscribers?.filter((sub) =>
    sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.location_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.location_state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (!subscribers) return;

    const headers = ["Email", "Status", "City", "State", "Country", "Timezone", "Subscribed At"];
    const csvContent = [
      headers.join(","),
      ...subscribers.map((sub) =>
        [
          sub.email,
          sub.status,
          sub.location_city || "",
          sub.location_state || "",
          sub.location_country || "",
          sub.timezone || "",
          format(new Date(sub.subscribed_at), "yyyy-MM-dd HH:mm:ss"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge>Active</Badge>;
      case "unsubscribed":
        return <Badge variant="secondary">Unsubscribed</Badge>;
      case "bounced":
        return <Badge variant="destructive">Bounced</Badge>;
      case "complained":
        return <Badge variant="destructive">Complained</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
            <p className="text-3xl font-bold">{stats?.active || 0}</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Growth Rate</p>
            <p className="text-3xl font-bold">
              {stats?.total ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading subscribers...</div>
      ) : filteredSubscribers?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No subscribers found
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Timezone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSubscribers?.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{subscriber.email}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(subscriber.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      {subscriber.location_city && subscriber.location_state
                        ? `${subscriber.location_city}, ${subscriber.location_state}`
                        : subscriber.location_country || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{subscriber.timezone || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(subscriber.subscribed_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};