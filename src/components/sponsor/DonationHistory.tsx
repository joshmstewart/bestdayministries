import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Mail, Calendar, RefreshCw, ExternalLink, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CachedDonation {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  designation: string;
  donation_date: string;
  receipt_url: string | null;
  stripe_subscription_id: string | null;
}

interface CachedSubscription {
  id: string;
  amount: number;
  designation: string;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string;
}

interface SyncStatus {
  last_synced_at: string | null;
  sync_status: string;
}

export const DonationHistory = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [donations, setDonations] = useState<CachedDonation[]>([]);
  const [subscriptions, setSubscriptions] = useState<CachedSubscription[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [generatingYear, setGeneratingYear] = useState<number | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const { toast } = useToast();
  
  // Prevent double-fetch in React StrictMode
  const hasFetchedRef = useRef(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  // Load from cache
  const loadCachedData = useCallback(async () => {
    if (!userEmail) return;

    try {
      console.log('[DonationHistory] Loading from cache...');
      
      // Load cached donations
      const { data: donationsData, error: donationsError } = await supabase
        .from("donation_history_cache")
        .select("*")
        .order("donation_date", { ascending: false });

      if (donationsError) {
        console.error('[DonationHistory] Cache error:', donationsError);
        throw donationsError;
      }
      
      console.log('[DonationHistory] Loaded', donationsData?.length, 'cached donations');
      setDonations(donationsData || []);

      // Load cached subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from("active_subscriptions_cache")
        .select("*");

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // Load sync status
      const { data: statusData } = await supabase
        .from("donation_sync_status")
        .select("last_synced_at, sync_status")
        .eq("user_email", userEmail)
        .maybeSingle();

      setSyncStatus(statusData);

    } catch (error: any) {
      console.error('[DonationHistory] Error loading cached data:', error);
      toast({
        title: "Error",
        description: "Failed to load donation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userEmail, toast]);

  // Sync from Stripe API
  const syncFromStripe = async () => {
    if (!userEmail) return;
    
    setSyncing(true);
    try {
      console.log('[DonationHistory] Syncing from Stripe...');
      const { data, error } = await supabase.functions.invoke("sync-donation-history");
      
      if (error) throw error;
      
      console.log('[DonationHistory] Sync result:', data);
      toast({
        title: "Synced",
        description: `Synced ${data.donationsSynced} donations from Stripe`,
      });
      
      // Reload cached data
      await loadCachedData();
    } catch (error: any) {
      console.error('[DonationHistory] Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync from Stripe",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (userEmail && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadCachedData();
    }
  }, [userEmail, loadCachedData]);

  // Auto-sync if no data or stale (older than 1 hour)
  useEffect(() => {
    if (loading || syncing || !userEmail) return;
    
    // No cached data - need to sync
    if (donations.length === 0) {
      console.log('[DonationHistory] No cached data, triggering sync...');
      syncFromStripe();
      return;
    }
    
    // Check if data is stale
    if (syncStatus?.last_synced_at) {
      const lastSync = new Date(syncStatus.last_synced_at);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (lastSync < hourAgo) {
        console.log('[DonationHistory] Data is stale, triggering sync...');
        syncFromStripe();
      }
    }
  }, [loading, donations.length, syncStatus, userEmail, syncing]);

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
  const filteredDonations = selectedYear === "all"
    ? donations 
    : donations.filter(d => new Date(d.donation_date).getFullYear().toString() === selectedYear);

  const availableYears = Array.from(
    new Set(donations.map(d => new Date(d.donation_date).getFullYear()))
  ).sort((a, b) => b - a);

  const yearlyTotals = donations.reduce((acc, donation) => {
    const year = new Date(donation.donation_date).getFullYear();
    if (!acc[year]) {
      acc[year] = { count: 0, total: 0 };
    }
    acc[year].count++;
    acc[year].total += Number(donation.amount);
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

  if (donations.length === 0 && !syncing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>
                No donations found. Click refresh to sync from Stripe.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncFromStripe}
              disabled={syncing}
            >
              {syncing ? (
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
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div>
          {syncStatus?.last_synced_at && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Last synced: {format(new Date(syncStatus.last_synced_at), "MMM d, yyyy h:mm a")}
            </p>
          )}
        </div>
        <Button 
          variant="outline" 
          onClick={syncFromStripe} 
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
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
                <div key={sub.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{sub.designation}</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${sub.amount.toFixed(2)}/mo
                  </div>
                  {sub.current_period_end && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Next: {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                    </div>
                  )}
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

      {/* Donation History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>
                All donations synced from Stripe
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
          {filteredDonations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donations found for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      {format(new Date(donation.donation_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {donation.designation}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(donation.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={donation.frequency === 'monthly' ? 'default' : 'secondary'}>
                        {donation.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {donation.receipt_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(donation.receipt_url!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Receipt
                        </Button>
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
