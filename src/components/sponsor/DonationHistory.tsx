import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Mail, Calendar, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Donation {
  id: string;
  amount: number;
  frequency: "one-time" | "monthly";
  status: string;
  created_at: string;
  designation: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  stripe_payment_intent_id?: string;
  invoice_id?: string;
  receipt_url?: string;
}

interface ActiveSubscription {
  id: string;
  amount: number;
  designation: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export const DonationHistory = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [generatingYear, setGeneratingYear] = useState<number | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDonationHistory();
  }, []);

  // API-FIRST APPROACH: Fetch directly from Stripe API, not database
  // This is the source of truth - never rely on webhooks
  const loadDonationHistory = async () => {
    try {
      console.log('[DonationHistory] Fetching from Stripe API...');
      
      const { data, error } = await supabase.functions.invoke('get-donation-history');

      if (error) {
        console.error('[DonationHistory] API error:', error);
        throw error;
      }

      console.log('[DonationHistory] Received:', data?.donations?.length, 'donations');
      setDonations(data?.donations || []);
      setSubscriptions(data?.subscriptions || []);
    } catch (error) {
      console.error('[DonationHistory] Error:', error);
      toast({
        title: "Error",
        description: "Failed to load donation history",
        variant: "destructive",
      });
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

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
        // Download HTML as file
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

  const openStripeReceipt = (donation: Donation) => {
    if (donation.receipt_url) {
      window.open(donation.receipt_url, '_blank');
    } else {
      toast({
        title: "No Receipt Available",
        description: "Stripe receipt not available for this donation",
        variant: "destructive",
      });
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

  // Filter and group by year
  const filteredDonations = selectedYear === "all"
    ? donations 
    : donations.filter(d => new Date(d.created_at).getFullYear().toString() === selectedYear);

  const availableYears = Array.from(
    new Set(donations.map(d => new Date(d.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  const yearlyTotals = donations.reduce((acc, donation) => {
    const year = new Date(donation.created_at).getFullYear();
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
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading donation history from Stripe...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (donations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>
                No donations found. Your donation history is pulled directly from Stripe.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDonationHistory}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                    <Badge variant={sub.cancel_at_period_end ? "destructive" : "default"}>
                      {sub.cancel_at_period_end ? "Canceling" : "Active"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${sub.amount.toFixed(2)}/mo
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Next: {new Date(sub.current_period_end).toLocaleDateString()}
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

      {/* Donation History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation History</CardTitle>
              <CardDescription>
                All donations from Stripe (source of truth)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDonationHistory}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
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
                      {new Date(donation.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
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
                          onClick={() => openStripeReceipt(donation)}
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
