import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Mail, Calendar, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  donation_date: string;
  stripe_subscription_id: string | null;
  receipt_url: string | null;
  designation?: string;
}

interface ActiveSubscription {
  stripe_subscription_id: string;
  amount: number;
  status: string;
}

type StripeMode = "live" | "test";

export const DonationHistory = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stripeMode, setStripeMode] = useState<StripeMode>("live");
  const [canChooseStripeMode, setCanChooseStripeMode] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [generatingYear, setGeneratingYear] = useState<number | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const { toast } = useToast();
  const hasFetchedRef = useRef(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      setUserId(user?.id || null);

      if (user?.id) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        setCanChooseStripeMode(roleRow?.role === "admin" || roleRow?.role === "owner");
      }
    };

    getUser();
  }, []);

  // Load donation history DIRECTLY from Stripe (API-first source of truth)
  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (!userId || !userEmail) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("get-donation-history", {
        body: canChooseStripeMode ? { stripe_mode: stripeMode } : {},
      });

      if (error) throw error;

      const usedMode = data?.stripe_mode;
      if (!canChooseStripeMode && (usedMode === "live" || usedMode === "test")) {
        setStripeMode(usedMode);
      }

      const donations = (data?.donations || []) as Array<any>;
      const mappedTransactions: Transaction[] = donations.map((d) => ({
        id: d.id,
        amount: Number(d.amount || 0),
        frequency: d.frequency,
        status: d.status,
        donation_date: d.created_at,
        stripe_subscription_id: d.stripe_subscription_id ?? null,
        receipt_url: d.receipt_url ?? null,
        designation: d.designation,
      }));

      setTransactions(mappedTransactions);

      const subs = (data?.subscriptions || []) as Array<any>;
      const mappedSubs: ActiveSubscription[] = subs
        .filter((s) => s?.status === "active")
        .map((s) => ({
          stripe_subscription_id: s.id,
          amount: Number(s.amount || 0),
          status: s.status,
        }));

      setSubscriptions(mappedSubs);

      if (isRefresh) {
        toast({
          title: "Updated",
          description: `Loaded ${mappedTransactions.length} donations`,
        });
      }
    } catch (error: any) {
      console.error("[DonationHistory] Load error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load donation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userEmail, stripeMode, canChooseStripeMode, toast]);

  const refresh = () => loadTransactions(true);

  // Initial load
  useEffect(() => {
    if (userId && userEmail && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadTransactions(false);
    }
  }, [userId, userEmail, loadTransactions]);

  // Reload when switching stripe mode
  useEffect(() => {
    if (!userId || !userEmail || !hasFetchedRef.current) return;
    loadTransactions(true);
  }, [stripeMode, userId, userEmail, loadTransactions]);

  const generateYearEndSummary = async (year: number, sendEmail: boolean = false) => {
    setGeneratingYear(year);
    try {
      const { data, error } = await supabase.functions.invoke('generate-year-end-summary', {
        body: { taxYear: year, sendEmail }
      });

      if (error) throw error;

      if (!data.summary) {
        toast({
          title: "No Donations",
          description: `No donations found for ${year}`,
          variant: "destructive",
        });
        return;
      }

      if (sendEmail) {
        toast({
          title: "Email Sent",
          description: `Year-end summary for ${year} has been sent to your email`,
        });
      } else {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-summary-${year}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Summary Downloaded",
          description: `Year-end summary for ${year} has been downloaded`,
        });
      }
    } catch (error: any) {
      console.error('Error generating year-end summary:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate year-end summary",
        variant: "destructive",
      });
    } finally {
      setGeneratingYear(null);
    }
  };

  const manageSubscriptions = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-sponsorship', {
        body: {}
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error opening management portal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open management portal",
        variant: "destructive",
      });
    } finally {
      setManagingSubscription(false);
    }
  };

  // Filter by year
  const filteredTransactions = selectedYear === "all"
    ? transactions 
    : transactions.filter(t => new Date(t.donation_date).getFullYear().toString() === selectedYear);

  const availableYears = Array.from(
    new Set(transactions.map(t => new Date(t.donation_date).getFullYear()))
  ).sort((a, b) => b - a);

  const yearlyTotals = transactions.reduce((acc, tx) => {
    const year = new Date(tx.donation_date).getFullYear();
    if (!acc[year]) {
      acc[year] = { count: 0, total: 0 };
    }
    acc[year].count++;
    acc[year].total += Number(tx.amount);
    return acc;
  }, {} as Record<number, { count: number; total: number }>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading donation history...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (transactions.length === 0 && !refreshing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>
                No donations found. Your donations will appear here after they're processed.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Stripe mode: <span className="font-medium">{stripeMode}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canChooseStripeMode && (
            <Select value={stripeMode} onValueChange={(v) => setStripeMode(v as StripeMode)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stripe mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Recurring Donations</CardTitle>
                <CardDescription>
                  Your monthly donations
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={manageSubscriptions}
                disabled={managingSubscription}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Subscriptions
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subscriptions.map(sub => (
                <div key={sub.stripe_subscription_id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">Monthly Donation</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${sub.amount.toFixed(2)}/mo
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year-End Summary Cards */}
      {availableYears.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableYears.map(year => {
            const stats = yearlyTotals[year];
            return (
              <Card key={year}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {year}
                  </CardTitle>
                  <CardDescription>
                    {stats.count} donation{stats.count > 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold text-primary">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(stats.total)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateYearEndSummary(year, false)}
                      disabled={generatingYear === year}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateYearEndSummary(year, true)}
                      disabled={generatingYear === year}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All your donations
              </CardDescription>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donations found for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {format(new Date(tx.donation_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.frequency === 'monthly' ? 'default' : 'secondary'}>
                        {tx.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === 'paid' ? 'default' : 'secondary'}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.receipt_url ? (
                        <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="text-green-600 cursor-pointer hover:bg-green-50">
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Badge>
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
