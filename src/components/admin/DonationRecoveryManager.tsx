import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { toast } = useToast();

  const parseCsvData = (csv: string) => {
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    
    const transactions = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return {
        charge_id: obj["Charge ID"] || obj["charge_id"] || obj["id"],
        amount: obj["Amount"] || obj["amount"] ? parseFloat(obj["Amount"] || obj["amount"]) : undefined,
        created: obj["Created"] || obj["created"],
        currency: obj["Currency"] || obj["currency"],
        description: obj["Description"] || obj["description"],
      };
    });

    return transactions;
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
          body: { transactions, mode: "live" },
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
          <CardTitle>Donation Recovery Tool</CardTitle>
          <CardDescription>
            Recover missing donations by charge ID. This tool retrieves transaction details directly from Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format:</strong> Your CSV must include a column named "Charge ID", "charge_id", or "id" 
              with Stripe charge IDs (starting with "ch_"). The tool will automatically retrieve customer details, 
              amounts, and dates from Stripe.
            </AlertDescription>
          </Alert>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              Stripe Charge CSV Data
            </label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Charge ID,Amount,Created,Currency&#10;ch_3SL5KqIZCv5wsm2Y2bajO5GD,51524,2025-10-22 16:56:29,usd&#10;ch_3SKqA8IZCv5wsm2Y1Tj7CCan,4000,2025-10-22 00:44:25,usd"
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
