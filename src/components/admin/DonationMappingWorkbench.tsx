import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Copy, Loader2, RefreshCw } from "lucide-react";

const getTzOffsetString = (tz: string) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(
    new Date()
  );
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart?.value ?? "UTC";
};

type StripeMode = "test" | "live";

type SnapshotItemType =
  | "charge"
  | "invoice"
  | "subscription"
  | "checkout_session"
  | "payment_intent";

type SnapshotItem = {
  type: SnapshotItemType;
  id: string;
  created?: string;
  amount?: number;
  currency?: string;
  status?: string;
  customer_id?: string;
  payment_intent_id?: string;
  invoice_id?: string;
  subscription_id?: string;
  order_id?: string;
  metadata?: Record<string, any>;
  raw: any;
};

type SnapshotResponse = {
  email: string;
  stripeMode: StripeMode;
  date: string; // YYYY-MM-DD (interpreted as UTC)
  window: { start: string; end: string };
  customerIds: string[];
  stripe: {
    items: SnapshotItem[];
  };
  database: {
    profiles: any[];
    donations: any[];
    sponsorships: any[];
    receipts: any[];
    orders: any[];
    orderItems: any[];
    donationHistoryCache: any[];
    activeSubscriptionsCache: any[];
  };
  links: {
    byPaymentIntentId: Record<string, string[]>;
    byInvoiceId: Record<string, string[]>;
    byOrderId: Record<string, string[]>;
    clusters: string[][];
  };
};

type Group = {
  id: string;
  label: string;
  itemIds: string[]; // `${type}:${id}`
};

const itemKey = (it: Pick<SnapshotItem, "type" | "id">) => `${it.type}:${it.id}`;

const TIMEZONES = [
  "America/Phoenix",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

export const DonationMappingWorkbench = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [timezone, setTimezone] = useState<string>("America/Phoenix");
  const [stripeMode, setStripeMode] = useState<StripeMode>("live");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupLabel, setGroupLabel] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);

  const sortedItems = useMemo(() => {
    const items = snapshot?.stripe.items || [];
    return [...items].sort((a, b) => {
      const ta = a.created ? new Date(a.created).getTime() : 0;
      const tb = b.created ? new Date(b.created).getTime() : 0;
      return tb - ta;
    });
  }, [snapshot]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      charge: 0,
      invoice: 0,
      subscription: 0,
      checkout_session: 0,
      payment_intent: 0,
    };
    for (const it of snapshot?.stripe.items || []) counts[it.type] = (counts[it.type] || 0) + 1;
    return counts;
  }, [snapshot]);

  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const addGroupFromSelection = () => {
    const ids = Array.from(selected);
    if (!ids.length) {
      toast({ title: "Select at least one item", variant: "destructive" });
      return;
    }

    const label = groupLabel.trim() || `Group ${groups.length + 1}`;
    const id = crypto.randomUUID();

    setGroups((prev) => [...prev, { id, label, itemIds: ids }]);
    setGroupLabel("");
    clearSelection();
  };

  const copyToClipboard = async (text: string, okTitle = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast({ title: okTitle, description: "Copied to clipboard." });
  };

  const loadSnapshot = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date required", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSnapshot(null);
    setSelected(new Set());
    setGroups([]);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("donation-mapping-snapshot", {
        body: { email: normalizedEmail, date, stripe_mode: stripeMode, timezone },
      });
      if (error) throw error;
      setSnapshot(data);
    } catch (e: any) {
      toast({ title: "Snapshot error", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const exportPayload = useMemo(() => {
    if (!snapshot) return null;
    return {
      snapshot,
      groups,
      exportedAt: new Date().toISOString(),
      notes: "These groups were created manually in the admin Donation Mapping Workbench.",
    };
  }, [snapshot, groups]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Donation Mapping Workbench (by date)</CardTitle>
          <CardDescription>
            Enter an email + date and this will load ALL Stripe + database records for that day in the chosen timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>

            <div className="w-[170px]">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="w-[180px]">
              <Label>Timezone ({getTzOffsetString(timezone)})</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[120px]">
              <Label>Stripe Mode</Label>
              <Select value={stripeMode} onValueChange={(v) => setStripeMode(v as StripeMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadSnapshot} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Load
            </Button>

            {exportPayload && (
              <Button
                variant="outline"
                onClick={() => copyToClipboard(JSON.stringify(exportPayload, null, 2), "Export copied")}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy export JSON
              </Button>
            )}
          </div>

          {snapshot && (
            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="text-muted-foreground">Customers</div>
                <div className="font-mono text-xs break-all whitespace-pre-wrap">{snapshot.customerIds.join("\n")}</div>
              </div>
              {(
                [
                  ["Charges", summary.charge],
                  ["Invoices", summary.invoice],
                  ["Sessions", summary.checkout_session],
                  ["PaymentIntents", summary.payment_intent],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-md bg-muted p-3 text-sm">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="text-2xl font-semibold">{value}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {snapshot && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Manual Groups</CardTitle>
            <CardDescription>
              Select any Stripe items below, then add a group. These groups are included in the export JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <Label>Group label (optional)</Label>
                <Input value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} placeholder="e.g. Order #123" />
              </div>
              <Button onClick={addGroupFromSelection}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Add group from selection ({selected.size})
              </Button>
              <Button variant="outline" onClick={clearSelection}>
                Clear selection
              </Button>
            </div>

            {groups.length === 0 ? (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{g.label}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGroups((prev) => prev.filter((x) => x.id !== g.id))}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="mt-2 font-mono text-xs whitespace-pre-wrap break-all text-muted-foreground">
                      {g.itemIds.join("\n")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {snapshot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Everything (Stripe + DB)</CardTitle>
            <CardDescription>
              Checkboxes are for grouping. Use the accordions to inspect raw objects + metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="stripe-items">
                <AccordionTrigger>Stripe items ({snapshot.stripe.items.length})</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {sortedItems.map((it) => {
                      const key = itemKey(it);
                      return (
                        <div key={key} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected.has(key)}
                                onChange={() => toggleSelected(key)}
                              />
                              <Badge variant="outline">{it.type}</Badge>
                              <span className="font-mono text-xs break-all">{it.id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {it.order_id && <Badge variant="destructive">order_id</Badge>}
                              {it.status && <Badge variant="secondary">{it.status}</Badge>}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(JSON.stringify(it.raw, null, 2), "Raw item copied")}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy raw
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
                            <div className="text-muted-foreground">created</div>
                            <div className="font-mono break-all">{it.created || "—"}</div>
                            <div className="text-muted-foreground">amount</div>
                            <div className="font-mono break-all">{it.amount ?? "—"}</div>
                            <div className="text-muted-foreground">payment_intent</div>
                            <div className="font-mono break-all">{it.payment_intent_id || "—"}</div>
                            <div className="text-muted-foreground">invoice</div>
                            <div className="font-mono break-all">{it.invoice_id || "—"}</div>
                            <div className="text-muted-foreground">subscription</div>
                            <div className="font-mono break-all">{it.subscription_id || "—"}</div>
                            <div className="text-muted-foreground">order_id</div>
                            <div className="font-mono break-all">{it.order_id || "—"}</div>
                          </div>

                          <div className="mt-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">metadata</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[160px]">
                              {JSON.stringify(it.metadata || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="db">
                <AccordionTrigger>Database records</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(
                      [
                        ["profiles", snapshot.database.profiles],
                        ["donations", snapshot.database.donations],
                        ["sponsorships", snapshot.database.sponsorships],
                        ["receipts", snapshot.database.receipts],
                        ["orders", snapshot.database.orders],
                        ["orderItems", snapshot.database.orderItems],
                        ["donationHistoryCache", snapshot.database.donationHistoryCache],
                        ["activeSubscriptionsCache", snapshot.database.activeSubscriptionsCache],
                      ] as const
                    ).map(([label, rows]) => (
                      <div key={label} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{label}</div>
                          <Badge variant="secondary">{rows.length}</Badge>
                        </div>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                          {JSON.stringify(rows, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="links">
                <AccordionTrigger>Auto links (PI / invoice / order_id)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-md border p-3">
                        <div className="font-medium">byPaymentIntentId</div>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                          {JSON.stringify(snapshot.links.byPaymentIntentId, null, 2)}
                        </pre>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="font-medium">byInvoiceId</div>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                          {JSON.stringify(snapshot.links.byInvoiceId, null, 2)}
                        </pre>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="font-medium">byOrderId</div>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                          {JSON.stringify(snapshot.links.byOrderId, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="rounded-md border p-3">
                      <div className="font-medium">clusters</div>
                      <div className="text-xs text-muted-foreground">
                        Suggested groups (connected components across payment_intent + invoice + order_id).
                      </div>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                        {JSON.stringify(snapshot.links.clusters, null, 2)}
                      </pre>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
