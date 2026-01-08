import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Upload, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

export const NewsletterSubscribers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error("File is empty");
        return;
      }

      // Parse header to find relevant columns
      const headerCols = lines[0].split(",").map(col => col.trim().replace(/^["']|["']$/g, "").toLowerCase());
      
      // Find column indices
      const emailColIndices = headerCols
        .map((col, idx) => col.includes("email") && !col.includes("status") ? idx : -1)
        .filter(idx => idx !== -1);
      
      const cityColIdx = headerCols.findIndex(col => col.includes("city"));
      const stateColIdx = headerCols.findIndex(col => col.includes("state") || col.includes("province"));
      const countryColIdx = headerCols.findIndex(col => col.includes("country"));

      const hasHeader = emailColIndices.length > 0;
      const startIndex = hasHeader ? 1 : 0;
      
      interface SubscriberData {
        email: string;
        city?: string;
        state?: string;
        country?: string;
        timezone?: string;
      }
      
      // Map US states to timezones
      const stateTimezones: Record<string, string> = {
        // Eastern
        CT: "America/New_York", DE: "America/New_York", FL: "America/New_York", GA: "America/New_York",
        IN: "America/New_York", KY: "America/New_York", ME: "America/New_York", MD: "America/New_York",
        MA: "America/New_York", MI: "America/New_York", NH: "America/New_York", NJ: "America/New_York",
        NY: "America/New_York", NC: "America/New_York", OH: "America/New_York", PA: "America/New_York",
        RI: "America/New_York", SC: "America/New_York", VT: "America/New_York", VA: "America/New_York",
        WV: "America/New_York", DC: "America/New_York",
        // Central
        AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago",
        KS: "America/Chicago", LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago",
        MO: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
        SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
        // Mountain
        AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver",
        NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
        // Pacific
        CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
        // Other
        AK: "America/Anchorage", HI: "Pacific/Honolulu",
      };

      // Map Canadian provinces to timezones
      const provinceTimezones: Record<string, string> = {
        ON: "America/Toronto", QC: "America/Montreal", BC: "America/Vancouver",
        AB: "America/Edmonton", MB: "America/Winnipeg", SK: "America/Regina",
        NS: "America/Halifax", NB: "America/Moncton", NL: "America/St_Johns",
        PE: "America/Halifax", YT: "America/Whitehorse", NT: "America/Yellowknife", NU: "America/Iqaluit",
      };

      const deriveTimezone = (state?: string, country?: string): string | undefined => {
        if (!state) return undefined;
        const stateUpper = state.toUpperCase().trim();
        
        // Check US states
        if (stateTimezones[stateUpper]) return stateTimezones[stateUpper];
        
        // Check Canadian provinces
        if (provinceTimezones[stateUpper]) return provinceTimezones[stateUpper];
        
        // Try full state names
        const stateNameMap: Record<string, string> = {
          CALIFORNIA: "CA", TEXAS: "TX", FLORIDA: "FL", "NEW YORK": "NY", COLORADO: "CO",
          WASHINGTON: "WA", OREGON: "OR", ARIZONA: "AZ", NEVADA: "NV", UTAH: "UT",
          ONTARIO: "ON", QUEBEC: "QC", "BRITISH COLUMBIA": "BC", ALBERTA: "AB",
        };
        const abbrev = stateNameMap[stateUpper];
        if (abbrev) {
          return stateTimezones[abbrev] || provinceTimezones[abbrev];
        }
        
        return undefined;
      };
      
      const subscriberData: SubscriberData[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(",").map(col => col.trim().replace(/^["']|["']$/g, ""));
        
        // Get location data if columns exist
        const city = cityColIdx >= 0 ? cols[cityColIdx] || undefined : undefined;
        const state = stateColIdx >= 0 ? cols[stateColIdx] || undefined : undefined;
        const country = countryColIdx >= 0 ? cols[countryColIdx] || undefined : undefined;
        const timezone = deriveTimezone(state, country);
        
        if (hasHeader) {
          for (const colIdx of emailColIndices) {
            const email = cols[colIdx];
            if (email && email.includes("@")) {
              subscriberData.push({ email: email.toLowerCase(), city, state, country, timezone });
            }
          }
        } else {
          const email = cols.find(col => col.includes("@"));
          if (email) {
            subscriberData.push({ email: email.toLowerCase(), city, state, country, timezone });
          }
        }
      }

      if (subscriberData.length === 0) {
        toast.error("No valid emails found in file");
        return;
      }

      // Get existing emails to avoid duplicates
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("email");
      
      const existingEmails = new Set(existing?.map(e => e.email.toLowerCase()) || []);
      const newSubscribers = subscriberData.filter(sub => !existingEmails.has(sub.email));

      if (newSubscribers.length === 0) {
        toast.info("All emails already exist in the list");
        return;
      }

      // Insert in batches of 100
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < newSubscribers.length; i += batchSize) {
        const batch = newSubscribers.slice(i, i + batchSize).map(sub => ({
          email: sub.email,
          status: "active" as const,
          source: "bulk_import",
          location_city: sub.city || null,
          location_state: sub.state || null,
          location_country: sub.country || null,
          timezone: sub.timezone || null,
        }));

        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert(batch);

        if (error) throw error;
        inserted += batch.length;
      }

      toast.success(`Added ${inserted} new subscribers`, {
        description: subscriberData.length - newSubscribers.length > 0 
          ? `${subscriberData.length - newSubscribers.length} duplicates skipped`
          : undefined
      });

      queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter-subscriber-stats"] });
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Failed to upload subscribers");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.txt"
          onChange={handleBulkUpload}
          className="hidden"
        />
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Bulk Import
        </Button>
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