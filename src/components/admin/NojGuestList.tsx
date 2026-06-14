import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Award, Search, Download, Users, DollarSign, Loader2, Settings, Save, Archive, ArchiveRestore, Eye, EyeOff, Printer, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_NOJ_TICKET_CAP, getTicketsFromDesignation } from "@/lib/nojTickets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NojGuest {
  id: string;
  donor_email: string | null;
  donor_id: string | null;
  contact_name: string | null;
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
  const [ticketPrices, setTicketPrices] = useState<Record<string, number>>({ general: 60, kids: 40, bestie: 40, "little-ones": 0 });
  const [savingPrices, setSavingPrices] = useState(false);
  const [ticketCap, setTicketCap] = useState<number>(DEFAULT_NOJ_TICKET_CAP);
  const [savingCap, setSavingCap] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [includePending, setIncludePending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: "archive" | "unarchive"; ids: string[] }>({ open: false, action: "archive", ids: [] });

  useEffect(() => {
    loadGuests();
    loadPrices();
    loadCap();
  }, []);

  const loadPrices = async () => {
    const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "noj_ticket_prices").maybeSingle();
    if (data?.setting_value && typeof data.setting_value === "object") {
      setTicketPrices(prev => ({ ...prev, ...(data.setting_value as Record<string, number>) }));
    }
  };

  const loadCap = async () => {
    const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "noj_ticket_cap").maybeSingle();
    const v = data?.setting_value as any;
    if (typeof v === "number") setTicketCap(v);
    else if (typeof v === "string") setTicketCap(parseInt(v, 10) || DEFAULT_NOJ_TICKET_CAP);
  };

  const savePrices = async () => {
    setSavingPrices(true);
    const { error } = await supabase.from("app_settings").update({ setting_value: ticketPrices as any, updated_at: new Date().toISOString() }).eq("setting_key", "noj_ticket_prices");
    setSavingPrices(false);
    if (error) { toast.error("Failed to save prices"); return; }
    toast.success("Ticket prices updated");
  };

  const saveCap = async () => {
    setSavingCap(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ setting_key: "noj_ticket_cap", setting_value: ticketCap as any, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
    setSavingCap(false);
    if (error) { toast.error("Failed to save cap"); return; }
    toast.success(`Ticket cap set to ${ticketCap}`);
  };

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("donations")
        .select("id, donor_email, donor_id, contact_name, amount, status, designation, created_at, stripe_mode")
        .like("designation", "A Night of Joy%")
        .order("created_at", { ascending: false });

      if (error) throw error;

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

  const handleArchive = async (ids: string[], action: "archive" | "unarchive") => {
    setArchiving(true);
    const newStatus = action === "archive" ? "archived" : "completed";
    
    const { error } = await supabase
      .from("donations")
      .update({ status: newStatus })
      .in("id", ids);

    setArchiving(false);
    setConfirmDialog({ open: false, action: "archive", ids: [] });
    
    if (error) {
      toast.error(`Failed to ${action} tickets`);
      return;
    }
    
    toast.success(`${ids.length} ticket${ids.length > 1 ? "s" : ""} ${action}d`);
    setSelectedIds(new Set());
    loadGuests();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (list: NojGuest[]) => {
    const allSelected = list.every(g => selectedIds.has(g.id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        list.forEach(g => next.delete(g.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        list.forEach(g => next.add(g.id));
        return next;
      });
    }
  };

  // Tickets include "Event Tickets" (paid combos) or individual tier names (free registrations)
  const TIER_KEYWORDS = ['Event Tickets', 'General Admission', 'Kids', 'Besties', 'Little Ones'];
  const isTicket = (g: NojGuest) => TIER_KEYWORDS.some(kw => g.designation?.includes(kw));
  const isSponsor = (g: NojGuest) => !isTicket(g);

  // Filter archived unless toggled
  const visibleGuests = showArchived ? guests : guests.filter(g => g.status !== "archived");
  const archivedCount = guests.filter(g => g.status === "archived").length;

  const tickets = visibleGuests.filter(isTicket);
  const sponsors = visibleGuests.filter(isSponsor);

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

  // Stats exclude archived and test
  const confirmedTickets = guests.filter(t => isTicket(t) && (t.status === "completed" || t.status === "active") && t.stripe_mode !== "test");
  const confirmedSponsors = guests.filter(s => isSponsor(s) && (s.status === "completed" || s.status === "active") && s.stripe_mode !== "test");
  const totalRevenue = [...confirmedTickets, ...confirmedSponsors].reduce((sum, g) => sum + g.amount, 0);

  // Tickets-sold count: combos + free registrations (admin "Tickets Sold" stat)
  const getTicketQty = (designation: string | null) => {
    if (!designation) return 1;
    const paidMatches = designation.matchAll(/(\d+)×/g);
    const paidTotal = [...paidMatches].reduce((sum, m) => sum + parseInt(m[1]), 0);
    if (paidTotal > 0) return paidTotal;
    const freeMatch = designation.match(/×(\d+)/);
    return freeMatch ? parseInt(freeMatch[1]) : 1;
  };
  const totalTicketCount = confirmedTickets.reduce((sum, t) => sum + getTicketQty(t.designation), 0);

  // Cap-tracking: includes sponsor-tier included tickets too
  const totalClaimedAgainstCap = [...confirmedTickets, ...confirmedSponsors].reduce(
    (sum, g) => sum + getTicketsFromDesignation(g.designation), 0
  );
  const remainingTickets = Math.max(0, ticketCap - totalClaimedAgainstCap);

  const exportCsv = (list: NojGuest[], filename: string) => {
    const headers = ["Name/Email", "Amount", "Type", "Status", "Date", "Mode"];
    const rows = list.map(g => [
      g.profile_name || g.contact_name || g.donor_email || "Unknown",
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

  const escapeHtml = (s: string) =>
    String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // Build flat check-in list: one row per attending seat, sorted A→Z by name.
  // Includes confirmed live tickets + confirmed sponsors with included tickets. Excludes test/archived/pending.
  interface CheckInRow {
    name: string;
    email: string;
    seat: string; // e.g. "1 of 2"
    type: string; // designation cleaned up
    notes: string;
  }
  const buildCheckInRows = (): CheckInRow[] => {
    const eligible = guests.filter(g => {
      if (g.stripe_mode === "test") return false;
      if (g.status === "completed" || g.status === "active") return true;
      if (includePending && g.status === "pending") return true;
      return false;
    });
    const rows: CheckInRow[] = [];
    eligible.forEach(g => {
      const qty = getTicketsFromDesignation(g.designation) || (isTicket(g) ? getTicketQty(g.designation) : 0);
      if (qty <= 0) return;
      const name = g.profile_name || g.contact_name || g.donor_email || "Unknown";
      const email = g.donor_email || "";
      const type = (g.designation || "").replace("A Night of Joy – ", "").replace(/\s*\(.*$/, "").trim() || "Ticket";
      const pendingNote = g.status === "pending" ? "PENDING — confirm payment" : "";
      for (let i = 1; i <= qty; i++) {
        rows.push({
          name,
          email,
          seat: qty > 1 ? `${i} of ${qty}` : "",
          type,
          notes: pendingNote,
        });
      }
    });
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return rows;
  };


  const exportCheckInCsv = () => {
    const rows = buildCheckInRows();
    const headers = ["Checked In", "Name", "Email", "Seat", "Ticket Type", "Notes"];
    const csvRows = rows.map(r => ["", r.name, r.email, r.seat, r.type, r.notes]);
    const csv = [headers, ...csvRows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noj-checkin-list-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} attendees`);
  };

  const printCheckInList = () => {
    const rows = buildCheckInRows();
    if (rows.length === 0) {
      toast.error("No confirmed attendees to print");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up blocked — allow pop-ups to print");
      return;
    }
    const dateStr = format(new Date(), "EEEE, MMMM d, yyyy");
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>A Night of Joy — Check-In List</title>
<style>
  @page { size: letter; margin: 0.5in; }
  body { font-family: -apple-system, system-ui, sans-serif; color: #111; margin: 0; padding: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: middle; }
  th { background: #f3f3f3; }
  .cb { width: 28px; text-align: center; }
  .box { display: inline-block; width: 16px; height: 16px; border: 1.5px solid #111; border-radius: 2px; }
  .seat { width: 70px; white-space: nowrap; color: #555; }
  .type { width: 140px; color: #444; }
  .notes { width: 120px; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  @media print { .noprint { display: none; } }
  .noprint { margin-bottom: 12px; }
  button { padding: 8px 14px; font-size: 14px; cursor: pointer; }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Print</button></div>
<h1>A Night of Joy — Check-In List</h1>
<div class="sub">Printed ${dateStr} · ${rows.length} attendee${rows.length === 1 ? "" : "s"}</div>
<table>
  <thead><tr>
    <th class="cb">✓</th><th>Name</th><th class="seat">Seat</th><th class="type">Ticket Type</th><th class="notes">Notes</th>
  </tr></thead>
  <tbody>
    ${rows.map(r => `<tr>
      <td class="cb"><span class="box"></span></td>
      <td><strong>${escapeHtml(r.name)}</strong>${r.email ? `<br/><span style="color:#777;font-size:11px">${escapeHtml(r.email)}</span>` : ""}</td>
      <td class="seat">${escapeHtml(r.seat)}</td>
      <td class="type">${escapeHtml(r.type)}</td>
      <td class="notes"></td>
    </tr>`).join("")}
  </tbody>
</table>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };


  const selectedInCurrentView = (list: NojGuest[]) => list.filter(g => selectedIds.has(g.id));

  const GuestTable = ({ list }: { list: NojGuest[] }) => {
    const filtered = filteredGuests(list);
    const allSelected = filtered.length > 0 && filtered.every(g => selectedIds.has(g.id));
    
    return (
      <>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selected = [...selectedIds];
                const hasArchived = selected.some(id => guests.find(g => g.id === id)?.status === "archived");
                setConfirmDialog({
                  open: true,
                  action: hasArchived ? "unarchive" : "archive",
                  ids: selected,
                });
              }}
              disabled={archiving}
            >
              {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Archive className="h-3.5 w-3.5 mr-1" />}
              {[...selectedIds].some(id => guests.find(g => g.id === id)?.status === "archived") ? "Unarchive" : "Archive"} Selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleSelectAll(filtered)}
                />
              </TableHead>
              <TableHead>Name / Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No guests found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(g => (
                <TableRow key={g.id} className={g.status === "archived" ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(g.id)}
                      onCheckedChange={() => toggleSelect(g.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {g.profile_name || g.contact_name || g.donor_email || "Unknown"}
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
                        g.status === "archived"
                          ? "outline"
                          : g.status === "completed" || g.status === "active"
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
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    g.stripe_mode === "live"
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                  }`}
                >
                  {g.stripe_mode === "live" ? "LIVE" : "TEST"}
                </Badge>
              </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={g.status === "archived" ? "Unarchive" : "Archive"}
                      onClick={() => setConfirmDialog({
                        open: true,
                        action: g.status === "archived" ? "unarchive" : "archive",
                        ids: [g.id],
                      })}
                    >
                      {g.status === "archived" ? (
                        <ArchiveRestore className="h-4 w-4" />
                      ) : (
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </>
    );
  };

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <Card className={remainingTickets <= 50 ? "border-amber-500" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Ticket className="h-4 w-4" />
              Remaining
            </div>
            <div className={`text-2xl font-bold ${remainingTickets === 0 ? "text-destructive" : remainingTickets <= 50 ? "text-amber-600" : ""}`}>
              {remainingTickets}
            </div>
            <div className="text-xs text-muted-foreground">{totalClaimedAgainstCap} of {ticketCap} claimed</div>
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

      {/* Ticket Cap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" /> Ticket Cap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="ticket-cap" className="text-xs">Max tickets (counts paid + free + sponsor-included)</Label>
              <Input
                id="ticket-cap"
                type="number"
                min={1}
                value={ticketCap}
                onChange={e => setTicketCap(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button onClick={saveCap} disabled={savingCap || ticketCap < 1} size="sm">
              {savingCap ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Save Cap</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-4 w-4" /> Ticket Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: "general", label: "General (13+)" },
              { id: "kids", label: "Kids (6–12)" },
              { id: "bestie", label: "Besties" },
              { id: "little-ones", label: "Little Ones (5 & under)" },
            ].map(tier => (
              <div key={tier.id}>
                <Label className="text-xs">{tier.label}</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={ticketPrices[tier.id] ?? 0}
                    onChange={e => setTicketPrices(prev => ({ ...prev, [tier.id]: Number(e.target.value) }))}
                    className="pl-6 h-9"
                  />
                </div>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={savePrices} disabled={savingPrices} className="mt-3">
            {savingPrices ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Prices
          </Button>
        </CardContent>
      </Card>

      {/* Search & Export & Archive Toggle */}
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
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showArchived ? "Hide" : "Show"} Archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={printCheckInList}
          title="Print a paper check-in list with checkboxes"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Check-In List
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCheckInCsv}
          title="Download a check-in spreadsheet (one row per attendee)"
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Check-In CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(visibleGuests, "noj-guest-list.csv")}
        >
          <Download className="h-4 w-4 mr-2" />
          Full Export
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All ({visibleGuests.length})
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
          <GuestTable list={visibleGuests} />
        </TabsContent>
        <TabsContent value="tickets">
          <GuestTable list={tickets} />
        </TabsContent>
        <TabsContent value="sponsors">
          <GuestTable list={sponsors} />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "archive" ? "Archive" : "Unarchive"} {confirmDialog.ids.length} ticket{confirmDialog.ids.length > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "archive"
                ? "Archived tickets will be hidden from the main view but can be shown again with the toggle."
                : "This will restore the ticket(s) to completed status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchive(confirmDialog.ids, confirmDialog.action)}
              disabled={archiving}
            >
              {archiving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {confirmDialog.action === "archive" ? "Archive" : "Unarchive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
