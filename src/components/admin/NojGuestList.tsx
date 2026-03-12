import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Award, Search, Download, Users, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface NojGuest {
  id: string;
  donor_email: string | null;
  donor_id: string | null;
  amount: number;
  status: string;
  designation: string | null;
  created_at: string;
  stripe_mode: string;
  profile_name?: string;
}

export function NojGuestList() {
  const [guests, setGuests] = useState<NojGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("id, donor_email, donor_id, amount, status, designation, created_at, stripe_mode")
        .like("designation", "A Night of Joy%")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile names for guests with donor_id
      const donorIds = (data || []).filter(g => g.donor_id).map(g => g.donor_id!);
      let profileMap: Record<string, string> = {};
      
      if (donorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", donorIds);
        
        (profiles || []).forEach(p => {
          profileMap[p.id] = p.display_name || p.email || "Unknown";
        });
      }

      const enriched = (data || []).map(g => ({
        ...g,
        profile_name: g.donor_id ? profileMap[g.donor_id] : undefined,
      }));

      setGuests(enriched);
    } catch (err) {
      console.error("Failed to load NOJ guests:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tickets include "Event Tickets" (paid combos) or individual tier names (free registrations)
  const TIER_KEYWORDS = ['Event Tickets', 'General Admission', 'Kids', 'Besties', 'Little Ones'];
  const isTicket = (g: NojGuest) => TIER_KEYWORDS.some(kw => g.designation?.includes(kw));
  const isSponsor = (g: NojGuest) => !isTicket(g);

  const tickets = guests.filter(isTicket);
  const sponsors = guests.filter(isSponsor);

  const filteredGuests = (list: NojGuest[]) =>
    list.filter(g => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        g.donor_email?.toLowerCase().includes(s) ||
        g.profile_name?.toLowerCase().includes(s) ||
        g.designation?.toLowerCase().includes(s)
      );
    });

  const confirmedTickets = tickets.filter(t => (t.status === "completed" || t.status === "active") && t.stripe_mode !== "test");
  const confirmedSponsors = sponsors.filter(s => (s.status === "completed" || s.status === "active") && s.stripe_mode !== "test");
  const totalRevenue = [...confirmedTickets, ...confirmedSponsors].reduce((sum, g) => sum + g.amount, 0);

  // Parse ticket quantity from designations:
  //   Free: "A Night of Joy – Little Ones (5 & under) (×2)" → captures ×2
  //   Paid: "A Night of Joy – Event Tickets (2× General, 1× Kids)" → sums all N× patterns
  const getTicketQty = (designation: string | null) => {
    if (!designation) return 1;
    // Check for "N× Tier" pattern (paid combo): sum all quantities
    const paidMatches = designation.matchAll(/(\d+)×/g);
    const paidTotal = [...paidMatches].reduce((sum, m) => sum + parseInt(m[1]), 0);
    if (paidTotal > 0) return paidTotal;
    // Check for "(×N)" pattern (free single-tier)
    const freeMatch = designation.match(/×(\d+)/);
    return freeMatch ? parseInt(freeMatch[1]) : 1;
  };
  const totalTicketCount = confirmedTickets.reduce((sum, t) => sum + getTicketQty(t.designation), 0);

  const exportCsv = (list: NojGuest[], filename: string) => {
    const headers = ["Name/Email", "Amount", "Type", "Status", "Date", "Mode"];
    const rows = list.map(g => [
      g.profile_name || g.donor_email || "Unknown",
      `$${g.amount.toFixed(2)}`,
      g.designation || "",
      g.status,
      format(new Date(g.created_at), "M/d/yy h:mm a"),
      g.stripe_mode,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const GuestTable = ({ list }: { list: NojGuest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name / Email</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Mode</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No guests found
            </TableCell>
          </TableRow>
        ) : (
          list.map(g => (
            <TableRow key={g.id}>
              <TableCell className="font-medium">
                {g.profile_name || g.donor_email || "Unknown"}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {g.designation?.replace("A Night of Joy – ", "") || "—"}
                </span>
              </TableCell>
              <TableCell>${g.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    g.status === "completed" || g.status === "active"
                      ? "default"
                      : g.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                  className="capitalize"
                >
                  {g.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(g.created_at), "M/d/yy h:mm a")}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {g.stripe_mode}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Ticket className="h-4 w-4" />
              Tickets Sold
            </div>
            <div className="text-2xl font-bold">{totalTicketCount}</div>
            <div className="text-xs text-muted-foreground">{confirmedTickets.length} order{confirmedTickets.length !== 1 ? "s" : ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Award className="h-4 w-4" />
              Sponsors
            </div>
            <div className="text-2xl font-bold">{confirmedSponsors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Total Guests
            </div>
            <div className="text-2xl font-bold">{totalTicketCount + confirmedSponsors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Revenue
            </div>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(guests, "noj-guest-list.csv")}
        >
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({guests.length})
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="h-3.5 w-3.5 mr-1.5" />
            Tickets ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="sponsors">
            <Award className="h-3.5 w-3.5 mr-1.5" />
            Sponsors ({sponsors.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <GuestTable list={filteredGuests(guests)} />
        </TabsContent>
        <TabsContent value="tickets">
          <GuestTable list={filteredGuests(tickets)} />
        </TabsContent>
        <TabsContent value="sponsors">
          <GuestTable list={filteredGuests(sponsors)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
