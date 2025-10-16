import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Mail, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Receipt {
  id: string;
  bestie_name: string;
  amount: number;
  frequency: string;
  transaction_date: string;
  receipt_number: string;
  tax_year: number;
  sent_at: string;
  stripe_mode: string;
}

export const DonationHistory = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [generatingYear, setGeneratingYear] = useState<number | null>(null);
  const [generatingReceipts, setGeneratingReceipts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        console.log('No user id found');
        return;
      }

      console.log('Loading receipts for user:', user.email);

      // Query receipts - RLS ensures users only see their own
      const { data, error } = await supabase
        .from('sponsorship_receipts')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        setReceipts([]);
        return;
      }
      
      console.log('Receipts loaded:', data?.length || 0);
      setReceipts(data || []);
    } catch (error) {
      console.error('Unexpected error loading receipts:', error);
      setReceipts([]);
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

  const generateMissingReceipts = async () => {
    setGeneratingReceipts(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-missing-receipts');

      if (error) throw error;

      toast({
        title: "Receipts Generated",
        description: data.message || `Generated ${data.receiptsGenerated} receipt(s)`,
      });

      // Force reload receipts - clear state first to ensure fresh load
      setReceipts([]);
      setLoading(true);
      await loadReceipts();
    } catch (error: any) {
      console.error('Error generating receipts:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate receipts",
        variant: "destructive",
      });
    } finally {
      setGeneratingReceipts(false);
    }
  };

  const downloadIndividualReceipt = async (receipt: Receipt) => {
    try {
      // Fetch receipt settings and org info
      const { data: settings } = await supabase
        .from('receipt_settings')
        .select('*')
        .single();

      const { data: appSettings } = await supabase
        .rpc('get_public_app_settings')
        .returns<Array<{ setting_key: string; setting_value: any }>>();

      const logoSetting = appSettings?.find((s) => s.setting_key === 'logo_url');
      const logoUrl = logoSetting?.setting_value as string || '';

      // Generate HTML receipt
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Donation Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { max-width: 200px; margin-bottom: 20px; }
            .receipt-number { font-size: 14px; color: #666; margin: 10px 0; }
            .details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
            .details td:first-child { font-weight: bold; width: 200px; }
            .amount { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; margin: 30px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
            <h1>Donation Receipt</h1>
            <div class="receipt-number">Receipt #${receipt.receipt_number}</div>
            <div class="receipt-number">Date: ${new Date(receipt.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          
          <div class="amount">$${receipt.amount.toFixed(2)}</div>
          
          <div class="details">
            <table>
              <tr>
                <td>Organization:</td>
                <td>${settings?.organization_name || 'Best Day Ministries'}</td>
              </tr>
              <tr>
                <td>Bestie Sponsored:</td>
                <td>${receipt.bestie_name}</td>
              </tr>
              <tr>
                <td>Donation Type:</td>
                <td>${receipt.frequency === 'monthly' ? 'Monthly Recurring' : 'One-Time'}</td>
              </tr>
              <tr>
                <td>Tax Year:</td>
                <td>${receipt.tax_year}</td>
              </tr>
              ${settings?.organization_ein ? `
              <tr>
                <td>Tax ID (EIN):</td>
                <td>${settings.organization_ein}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div class="footer">
            <p><strong>Tax Deduction Notice:</strong></p>
            <p>This receipt confirms your donation. No goods or services were provided in exchange for this contribution. Please retain this receipt for your tax records.</p>
            ${settings?.organization_address ? `<p><strong>Organization Address:</strong> ${settings.organization_address}</p>` : ''}
            ${settings?.website_url ? `<p><strong>Website:</strong> ${settings.website_url}</p>` : ''}
            ${settings?.receipt_message ? `<p>${settings.receipt_message}</p>` : ''}
          </div>
        </body>
        </html>
      `;

      // Download the receipt
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.receipt_number}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Receipt Downloaded",
        description: `Receipt #${receipt.receipt_number} has been downloaded`,
      });
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const filteredReceipts = selectedYear === "all"
    ? receipts 
    : receipts.filter(r => r.tax_year.toString() === selectedYear);

  const availableYears = Array.from(
    new Set(receipts.map(r => r.tax_year))
  ).sort((a, b) => b - a);

  const yearlyTotals = receipts.reduce((acc, receipt) => {
    const year = receipt.tax_year;
    if (!acc[year]) {
      acc[year] = { count: 0, total: 0 };
    }
    acc[year].count++;
    acc[year].total += Number(receipt.amount);
    return acc;
  }, {} as Record<number, { count: number; total: number }>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading donation history...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Show generate button even if no receipts exist yet
  if (receipts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation Receipts</CardTitle>
              <CardDescription>
                No receipts found. Generate receipts for your existing sponsorships.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateMissingReceipts}
              disabled={generatingReceipts}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generatingReceipts ? 'animate-spin' : ''}`} />
              Generate Receipts
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Receipt History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donation Receipts</CardTitle>
              <CardDescription>
                View and download all your donation receipts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateMissingReceipts}
                disabled={generatingReceipts}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generatingReceipts ? 'animate-spin' : ''}`} />
                Generate Missing Receipts
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
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No donation receipts found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bestie</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      {new Date(receipt.transaction_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {receipt.bestie_name}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(receipt.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={receipt.frequency === 'monthly' ? 'default' : 'secondary'}>
                        {receipt.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {receipt.receipt_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant={receipt.stripe_mode === 'test' ? 'secondary' : 'default'}>
                        {receipt.stripe_mode === 'test' ? 'Test' : 'Live'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{receipt.tax_year}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadIndividualReceipt(receipt)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
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