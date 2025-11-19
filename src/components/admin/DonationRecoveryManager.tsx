import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, XCircle, Database, Clock } from "lucide-react";
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

interface ReconcileResult {
  donationId: string;
  oldStatus: string;
  newStatus: string;
  stripeObjectId: string | null;
  stripeStatus: string | null;
  action: 'activated' | 'completed' | 'cancelled' | 'skipped' | 'error';
  error?: string;
}

interface ReconcileSummary {
  total: number;
  activated: number;
  completed: number;
  cancelled: number;
  skipped: number;
  errors: number;
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
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResults, setReconcileResults] = useState<ReconcileResult[] | null>(null);
  const [reconcileSummary, setReconcileSummary] = useState<ReconcileSummary | null>(null);
  const { toast } = useToast();

  const handleReconcileDonations = async () => {
    try {
      setReconcileLoading(true);
      setReconcileResults(null);
      setReconcileSummary(null);

      const { data, error } = await supabase.functions.invoke('reconcile-donations-from-stripe', {
        body: { 
          mode: stripeMode,
          limit: 500 
        }
      });
      
      if (error) throw error;

      if (data?.success) {
        setReconcileResults(data.results);
        setReconcileSummary(data.summary);
        toast({
          title: "Reconciliation Complete",
          description: `Activated: ${data.summary.activated}, Completed: ${data.summary.completed}, Cancelled: ${data.summary.cancelled}, Skipped: ${data.summary.skipped}, Errors: ${data.summary.errors}`,
        });
      }
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast({
        title: "Reconciliation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm('This will scan all donations and mark duplicates based on Stripe IDs. Continue?')) {
      return;
    }

    try {
      setReconcileLoading(true);

      const { data, error } = await supabase.functions.invoke('cleanup-duplicate-donations');
      
      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Cleanup Complete",
          description: `Kept Active: ${data.summary.keptActive}, Marked Duplicate: ${data.summary.markedDuplicate}`,
        });
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setReconcileLoading(false);
    }
  };

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
            Reconcile Pending Donations with Stripe
          </CardTitle>
          <CardDescription>
            Automatically fix all pending donations by checking their actual status in Stripe. 
            This will activate completed subscriptions, mark successful one-time payments as completed, 
            and identify duplicate database entries. Duplicate donations will be marked and can be archived 
            or deleted from the transactions manager. Runs hourly via scheduled job.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Stripe Mode:</label>
              <select 
                value={stripeMode}
                onChange={(e) => setStripeMode(e.target.value as "live" | "test")}
                className="border rounded px-3 py-1.5 text-sm"
                disabled={reconcileLoading}
              >
                <option value="live">Live</option>
                <option value="test">Test</option>
              </select>
            </div>
            <Button
              onClick={handleReconcileDonations}
              disabled={reconcileLoading}
              size="lg"
            >
              {reconcileLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reconciling...</>
              ) : (
                "Reconcile Now"
              )}
            </Button>
            <Button
              onClick={handleCleanupDuplicates}
              disabled={reconcileLoading}
              variant="outline"
              size="lg"
            >
              {reconcileLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cleaning...</>
              ) : (
                "Clean Up Duplicates"
              )}
            </Button>
          </div>

          {reconcileSummary && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{reconcileSummary.activated}</div>
                  <div className="text-xs text-green-600 dark:text-green-500">Activated</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{reconcileSummary.completed}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">Completed</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">{reconcileSummary.cancelled}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-500">Cancelled</div>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{reconcileSummary.skipped}</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-500">Skipped</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{reconcileSummary.errors}</div>
                  <div className="text-xs text-red-600 dark:text-red-500">Errors</div>
                </div>
              </div>

              {reconcileResults && reconcileResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {reconcileResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {result.action === 'activated' && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {result.action === 'completed' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        {result.action === 'cancelled' && <XCircle className="w-4 h-4 text-gray-600" />}
                        {result.action === 'skipped' && <Clock className="w-4 h-4 text-yellow-600" />}
                        {result.action === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          Donation: {result.donationId.slice(0, 8)}...
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.oldStatus} → {result.newStatus}
                        </div>
                        {result.stripeObjectId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Stripe: {result.stripeObjectId.slice(0, 20)}... ({result.stripeStatus})
                          </div>
                        )}
                        {result.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
