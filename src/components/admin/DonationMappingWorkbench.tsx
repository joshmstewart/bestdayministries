import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Copy, Loader2, RefreshCw, PlusCircle, AlertCircle, CheckCircle2, FileText, Database, Receipt } from "lucide-react";

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

type CombinedTransaction = {
  id: string;
  stripe_mode: string;
  email: string;
  amount: number;
  frequency: string;
  status: string;
  transaction_date: string;
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  stripe_subscription_id?: string;
  donation_id?: string;
  receipt_id?: string;
  merged_metadata?: Record<string, any>;
};

type SnapshotResponse = {
  email: string;
  stripeMode: StripeMode;
  date: string;
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
    combinedTransactions: CombinedTransaction[];
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
  itemIds: string[];
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
  const [creatingDonation, setCreatingDonation] = useState<string | null>(null);
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

  // Get Stripe items for a group
  const getGroupStripeItems = (group: Group) => {
    if (!snapshot) return [];
    return snapshot.stripe.items.filter((it) => group.itemIds.includes(itemKey(it)));
  };

  // Check group status - what records exist for these Stripe items
  const getGroupStatus = (group: Group) => {
    if (!snapshot) return { hasCombined: false, hasDonation: false, hasReceipt: false };
    
    const stripeItems = getGroupStripeItems(group);
    const invoiceIds = stripeItems.filter(i => i.type === 'invoice').map(i => i.id);
    const piIds = stripeItems.map(i => i.payment_intent_id).filter(Boolean);
    
    const combinedTransactions = snapshot.database.combinedTransactions || [];
    const donations = snapshot.database.donations || [];
    const receipts = snapshot.database.receipts || [];
    
    // Check for combined transaction
    const hasCombined = combinedTransactions.some(ct => 
      invoiceIds.includes(ct.stripe_invoice_id || '') || 
      piIds.includes(ct.stripe_payment_intent_id || '')
    );
    
    // Check for donation (by subscription or PI)
    const subscriptionIds = stripeItems.map(i => i.subscription_id).filter(Boolean);
    const hasDonation = donations.some(d => 
      piIds.includes(d.stripe_payment_intent_id) || 
      subscriptionIds.includes(d.stripe_subscription_id)
    );
    
    // Check for receipt (by invoice id or transaction_id pattern)
    const hasReceipt = receipts.some(r => 
      invoiceIds.includes(r.transaction_id) ||
      piIds.some(pi => r.transaction_id?.includes(pi))
    );
    
    return { hasCombined, hasDonation, hasReceipt };
  };

  // Create donation from Stripe data
  const createDonationFromStripe = async (group: Group) => {
    if (!snapshot) return;
    
    const stripeItems = getGroupStripeItems(group);
    if (stripeItems.length === 0) {
      toast({ title: "No Stripe items in group", variant: "destructive" });
      return;
    }

    setCreatingDonation(group.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-donation-from-stripe", {
        body: {
          stripeItems: stripeItems.map((it) => ({ type: it.type, id: it.id, raw: it.raw })),
          email: snapshot.email,
          stripeMode: snapshot.stripeMode,
        },
      });

      if (error) {
        // Try to get more details from the error
        const errorMessage = error.message || "Unknown error";
        toast({ 
          title: "Error creating donation", 
          description: errorMessage,
          variant: "destructive" 
        });
        return;
      }

      if (data?.success) {
        const actionMsg = data.action === 'already_exists' 
          ? 'Combined transaction already exists'
          : data.existingDonation 
            ? 'Created receipt & combined transaction for existing donation'
            : 'Created donation, receipt & combined transaction';
        
        toast({ 
          title: "Success!", 
          description: actionMsg
        });
        // Reload snapshot to show the new record
        await loadSnapshot();
      } else {
        toast({ 
          title: "Failed to create donation", 
          description: data?.error || "Unknown error",
          variant: "destructive" 
        });
      }
    } catch (e: any) {
      toast({ title: "Error creating donation", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setCreatingDonation(null);
    }
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
      // Ensure combinedTransactions exists
      if (data?.database && !data.database.combinedTransactions) {
        data.database.combinedTransactions = [];
      }
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

  const combinedTransactions = snapshot?.database.combinedTransactions || [];

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
            <div className="grid gap-3 md:grid-cols-6">
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
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm">
                <div className="text-muted-foreground">Combined</div>
                <div className="text-2xl font-semibold text-primary">{combinedTransactions.length}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combined Transactions - The unified view */}
      {snapshot && combinedTransactions.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Combined Transactions ({combinedTransactions.length})
            </CardTitle>
            <CardDescription>
              These are the unified transaction records that combine invoice + charge + payment_intent into one event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {combinedTransactions.map((ct) => (
                <div key={ct.id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold">${ct.amount.toFixed(2)}</div>
                      <Badge variant="outline">{ct.frequency}</Badge>
                      <Badge variant="secondary">{ct.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {new Date(ct.transaction_date).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mt-3 grid gap-2 md:grid-cols-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Invoice: </span>
                      <span className="font-mono">{ct.stripe_invoice_id || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PI: </span>
                      <span className="font-mono">{ct.stripe_payment_intent_id || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Charge: </span>
                      <span className="font-mono">{ct.stripe_charge_id || '—'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    {ct.donation_id && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Donation linked
                      </div>
                    )}
                    {ct.receipt_id && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Receipt className="h-3.5 w-3.5" />
                        Receipt linked
                      </div>
                    )}
                    {ct.stripe_subscription_id && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <FileText className="h-3.5 w-3.5" />
                        Subscription: {ct.stripe_subscription_id.substring(0, 12)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {snapshot && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Manual Groups</CardTitle>
            <CardDescription>
              Select any Stripe items below, then add a group. Click "Create from Stripe" to merge them into a combined transaction.
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
              <div className="text-sm text-muted-foreground">No groups yet. Select Stripe items below and create a group.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => {
                  const status = getGroupStatus(g);
                  const allComplete = status.hasCombined && status.hasDonation && status.hasReceipt;
                  
                  return (
                    <div key={g.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium">{g.label}</div>
                          
                          {/* Status badges */}
                          {status.hasCombined ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Combined
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              No Combined Record
                            </Badge>
                          )}
                          
                          {status.hasDonation ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Donation
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              No Donation
                            </Badge>
                          )}
                          
                          {status.hasReceipt ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Receipt
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              No Receipt
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!allComplete && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => createDonationFromStripe(g)}
                              disabled={creatingDonation === g.id}
                            >
                              {creatingDonation === g.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                              )}
                              Create from Stripe
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setGroups((prev) => prev.filter((x) => x.id !== g.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 font-mono text-xs whitespace-pre-wrap break-all text-muted-foreground">
                        {g.itemIds.join("\n")}
                      </div>
                    </div>
                  );
                })}
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
                        ["combinedTransactions", snapshot.database.combinedTransactions],
                        ["orders", snapshot.database.orders],
                        ["orderItems", snapshot.database.orderItems],
                        ["donationHistoryCache", snapshot.database.donationHistoryCache],
                        ["activeSubscriptionsCache", snapshot.database.activeSubscriptionsCache],
                      ] as const
                    ).map(([label, rows]) => (
                      <div key={label} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{label}</div>
                          <Badge variant="secondary">{rows?.length || 0}</Badge>
                        </div>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-[260px]">
                          {JSON.stringify(rows || [], null, 2)}
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
