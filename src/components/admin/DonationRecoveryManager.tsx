import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, XCircle, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BackfillResult {
  receipt_id: string;
  created_donation_id: string | null;
  sponsor_email: string;
  amount: number;
  status: string;
}

interface ReceiptGenerationResult {
  donation_id: string;
  created_receipt_id: string | null;
  donor_email: string;
  amount: number;
  status: string;
}

interface RecoveryResult {
  chargeId: string;
  customerId: string;
  email: string | null;
  amount: number;
  donationCreated: boolean;
  receiptGenerated: boolean;
  receiptSent: boolean;
  error?: string;
}

interface RecoverySummary {
  total: number;
  successful: number;
  donationsCreated: number;
  receiptsGenerated: number;
  receiptsSent: number;
  failed: number;
}

export function DonationRecoveryManager() {
  const [csvData, setCsvData] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecoveryResult[] | null>(null);
  const [summary, setSummary] = useState<RecoverySummary | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [stripeMode, setStripeMode] = useState<"live" | "test">("live");
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResults, setBackfillResults] = useState<BackfillResult[] | null>(null);
  const [receiptGenLoading, setReceiptGenLoading] = useState(false);
  const [receiptGenResults, setReceiptGenResults] = useState<ReceiptGenerationResult[] | null>(null);
  const { toast } = useToast();

  const handleRecoverAll = async () => {
    try {
      setBackfillLoading(true);
      setBackfillResults(null);

      const { data, error } = await supabase.functions.invoke('recover-all-missing-donations', {
        body: { mode: 'live' }
      });
      
      if (error) throw error;

      if (data?.success) {
        const results = data.results.map((r: any) => ({
          receipt_id: r.receiptId,
          created_donation_id: r.donationId,
          sponsor_email: r.email,
          amount: r.amount,
          status: r.donationCreated ? 'created' : (r.error ? `error: ${r.error}` : 'existing')
        }));
        
        setBackfillResults(results);
        toast({
          title: "Recovery Complete",
          description: `Created ${data.summary.created} donations. ${data.summary.alreadyExists} already existed. ${data.summary.errors} errors.`,
        });
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleBackfillOrphanedReceipts = async () => {
    try {
      setBackfillLoading(true);
      setBackfillResults(null);

      const { data, error } = await supabase.rpc('backfill_missing_donations');
      
      if (error) throw error;

      setBackfillResults(data || []);
      
      const successCount = data?.filter((r: BackfillResult) => r.status === 'created').length || 0;
      const errorCount = data?.filter((r: BackfillResult) => r.status.startsWith('error')).length || 0;

      toast({
        title: "Backfill Complete",
        description: `Created ${successCount} donation records. ${errorCount} errors.`,
      });
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast({
        title: "Backfill Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleGenerateMissingReceipts = async () => {
    try {
      setReceiptGenLoading(true);
      setReceiptGenResults(null);

      const { data, error } = await supabase.rpc('generate_missing_receipts');
      
      if (error) throw error;

      setReceiptGenResults(data || []);
      
      const successCount = data?.filter((r: ReceiptGenerationResult) => r.status === 'created').length || 0;
      const errorCount = data?.filter((r: ReceiptGenerationResult) => r.status.startsWith('error')).length || 0;

      toast({
        title: "Receipt Generation Complete",
        description: `Created ${successCount} receipts. ${errorCount} errors.`,
      });
    } catch (error: any) {
      console.error('Receipt generation error:', error);
      toast({
        title: "Receipt Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReceiptGenLoading(false);
    }
  };

  const parseCsvData = (csv: string) => {
    const lines = csv.trim().split("\n");
    if (lines.length === 0) return [];
    
    // Parse CSV handling quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    
    const transactions = lines.slice(1).map(line => {
      const values = parseCSVLine(line).map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      
      return {
        charge_id: obj["charge_id"] || obj["Charge ID"] || obj["id"],
        amount: obj["amount"] || obj["Amount"] ? parseFloat(obj["amount"] || obj["Amount"]) : undefined,
        created: obj["created"] || obj["Created"],
        currency: obj["currency"] || obj["Currency"],
        description: obj["description"] || obj["Description"],
      };
    }).filter(t => t.charge_id); // Filter out empty rows

    return transactions;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      toast({
        title: "File Loaded",
        description: `${file.name} has been loaded successfully`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const handleRecover = async () => {
    try {
      setLoading(true);
      setResults(null);
      setSummary(null);

      const transactions = parseCsvData(csvData);
      
      if (transactions.length === 0) {
        toast({
          title: "No Data",
          description: "Please paste valid CSV data",
          variant: "destructive",
        });
        return;
      }

      console.log("Recovering donations for transactions:", transactions);

      const { data, error } = await supabase.functions.invoke(
        "recover-missing-donations",
        {
          body: { transactions, mode: stripeMode },
        }
      );

      if (error) throw error;

      setResults(data.results);
      setSummary(data.summary);

      toast({
        title: "Recovery Complete",
        description: `${data.summary.successful} of ${data.summary.total} donations recovered successfully`,
      });
    } catch (error) {
      console.error("Recovery error:", error);
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Quick Backfill: Orphaned Receipts
          </CardTitle>
          <CardDescription>
            Automatically create missing donation records for receipts that have Stripe transaction IDs but no linked donation.
            This fixes cases where webhooks created receipts but failed to create the donation record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleRecoverAll}
              disabled={backfillLoading}
              size="lg"
              className="h-auto flex-col items-start text-left py-4 px-4"
            >
              <div className="font-semibold mb-1">
                {backfillLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" />Processing...</>
                ) : (
                  "Recover All (Recommended)"
                )}
              </div>
              <div className="text-xs font-normal opacity-80">
                Finds all missing donations and fetches data from Stripe
              </div>
            </Button>
            
            <Button
              onClick={handleBackfillOrphanedReceipts}
              disabled={backfillLoading}
              variant="outline"
              size="lg"
              className="h-auto flex-col items-start text-left py-4 px-4"
            >
              <div className="font-semibold mb-1">
                {backfillLoading ? "Processing..." : "Backfill from Receipts"}
              </div>
              <div className="text-xs font-normal opacity-80">
                Creates donations for orphaned receipts
              </div>
            </Button>
            
            <Button
              onClick={handleGenerateMissingReceipts}
              disabled={receiptGenLoading}
              variant="outline"
              size="lg"
              className="h-auto flex-col items-start text-left py-4 px-4"
            >
              <div className="font-semibold mb-1">
                {receiptGenLoading ? "Generating..." : "Generate from Donations"}
              </div>
              <div className="text-xs font-normal opacity-80">
                Creates receipts for donations without receipts
              </div>
            </Button>
          </div>

          {backfillResults && backfillResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    Created {backfillResults.filter(r => r.status === 'created').length} donations
                  </span>
                </div>
                {backfillResults.some(r => r.status.startsWith('error')) && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span>{backfillResults.filter(r => r.status.startsWith('error')).length} errors</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {backfillResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {result.status === 'created' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{result.sponsor_email}</div>
                      <div className="text-sm text-muted-foreground">
                        ${result.amount.toFixed(2)} • Receipt: {result.receipt_id.slice(0, 8)}...
                      </div>
                      {result.created_donation_id && (
                        <div className="text-xs text-green-600">
                          Donation: {result.created_donation_id.slice(0, 8)}...
                        </div>
                      )}
                      {result.status.startsWith('error') && (
                        <div className="text-xs text-red-600 mt-1">
                          {result.status}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backfillResults && backfillResults.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No orphaned receipts found. All receipts have corresponding donation records.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Quick Generate: Missing Receipts
          </CardTitle>
          <CardDescription>
            Automatically create receipt records for donations that exist in the database but have no corresponding receipt.
            This fixes cases where donations were created but receipt generation failed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateMissingReceipts}
              disabled={receiptGenLoading}
            >
              {receiptGenLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Missing Receipts
            </Button>
            <span className="text-sm text-muted-foreground">
              This will scan for donations without receipts and create their receipt records
            </span>
          </div>

          {receiptGenResults && receiptGenResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">
                    Created {receiptGenResults.filter(r => r.status === 'created').length} receipts
                  </span>
                </div>
                {receiptGenResults.some(r => r.status.startsWith('error')) && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span>{receiptGenResults.filter(r => r.status.startsWith('error')).length} errors</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {receiptGenResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {result.status === 'created' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{result.donor_email}</div>
                      <div className="text-sm text-muted-foreground">
                        ${result.amount.toFixed(2)} • Donation: {result.donation_id.slice(0, 8)}...
                      </div>
                      {result.created_receipt_id && (
                        <div className="text-xs text-green-600">
                          Receipt: {result.created_receipt_id.slice(0, 8)}...
                        </div>
                      )}
                      {result.status.startsWith('error') && (
                        <div className="text-xs text-red-600 mt-1">
                          {result.status}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {receiptGenResults && receiptGenResults.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No donations missing receipts found. All donations have corresponding receipt records.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donation Recovery Tool</CardTitle>
          <CardDescription>
            Recover missing donations by charge ID. Upload a Stripe export or paste CSV data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Stripe Export:</strong> Export "Itemized transactions" from Stripe's Payments Analytics. 
              The tool automatically extracts charge IDs and retrieves all details from Stripe.
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex-1">
              <label className="text-sm font-medium block mb-2">
                Stripe Mode
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={stripeMode === "live" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStripeMode("live")}
                  className="flex-1"
                >
                  Live Mode
                </Button>
                <Button
                  type="button"
                  variant={stripeMode === "test" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStripeMode("test")}
                  className="flex-1"
                >
                  Test Mode
                </Button>
              </div>
            </div>
            <div className="flex-1 text-sm text-muted-foreground">
              <p className="font-medium mb-1">Current: {stripeMode === "live" ? "Live" : "Test"}</p>
              <p className="text-xs">
                {stripeMode === "live" 
                  ? "Using real customer data and charges" 
                  : "Using test data from Stripe test mode"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">
              Upload Stripe CSV Export
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {fileName && (
              <p className="text-sm text-muted-foreground">
                Loaded: {fileName}
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or paste CSV data</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              CSV Data
            </label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder={`"charge_id","customer_id","amount","created","currency"\n"ch_3SL5KqIZCv5wsm2Y2bajO5GD","cus_123","51524","2025-10-22 16:56:29","usd"`}
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Before running:</strong> This will create donation records, generate receipts, and send emails. 
              Make sure you've reviewed the CSV data and confirmed these transactions are missing from the database.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleRecover} 
            disabled={loading || !csvData.trim()}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Recover Missing Donations
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Processed</div>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{summary.donationsCreated}</div>
                <div className="text-sm text-muted-foreground">Donations Created</div>
              </div>
              <div className="p-4 bg-purple-500/10 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{summary.receiptsGenerated}</div>
                <div className="text-sm text-muted-foreground">Receipts Generated</div>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{summary.receiptsSent}</div>
                <div className="text-sm text-muted-foreground">Emails Sent</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {result.receiptSent ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : result.error ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {result.email || result.customerId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${result.amount.toFixed(2)} • Charge: {result.chargeId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Customer: {result.customerId}
                    </div>
                    <div className="flex gap-2 mt-1 text-xs">
                      {result.donationCreated && (
                        <span className="text-green-600">✓ Donation</span>
                      )}
                      {result.receiptGenerated && (
                        <span className="text-green-600">✓ Receipt</span>
                      )}
                      {result.receiptSent && (
                        <span className="text-green-600">✓ Email</span>
                      )}
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
