import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DonationDebugResult {
  donationId: string;
  fields: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_checkout_session_id: string | null;
    amount: number;
    frequency: string;
    created_at: string;
  };
  strategyChecks: {
    strategy1: { passes: boolean; reason: string };
    strategy2: { passes: boolean; reason: string };
    strategy3: { passes: boolean; reason: string };
  };
  stripeLookups: {
    checkoutSession: { attempted: boolean; found: boolean; data?: any; error?: string };
    subscription: { attempted: boolean; found: boolean; data?: any; error?: string };
    customerSearch: { attempted: boolean; found: boolean; data?: any; error?: string };
  };
  recommendedAction: string;
}

export const DonationDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DonationDebugResult[]>([]);
  const { toast } = useToast();

  const runDiagnostics = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Fetch pending donations
      const { data: donations, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!donations || donations.length === 0) {
        toast({
          title: "No Pending Donations",
          description: "There are no pending donations to debug.",
        });
        setLoading(false);
        return;
      }

      // Call edge function to run diagnostics
      const { data: diagnosticData, error: diagnosticError } = await supabase.functions.invoke(
        'debug-donation-reconciliation',
        {
          body: { donations }
        }
      );

      if (diagnosticError) throw diagnosticError;

      setResults(diagnosticData.results || []);

      toast({
        title: "Diagnostics Complete",
        description: `Analyzed ${donations.length} pending donation(s)`,
      });
    } catch (error: any) {
      console.error('Diagnostic error:', error);
      toast({
        title: "Diagnostic Failed",
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
          <CardTitle>Donation Reconciliation Debugger</CardTitle>
          <CardDescription>
            Diagnose why pending donations aren't being reconciled with Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Diagnostics
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={result.donationId} className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-lg">
                  Donation {index + 1}: {result.donationId.substring(0, 8)}...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fields */}
                <div>
                  <h4 className="font-semibold mb-2">Database Fields:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted p-3 rounded">
                    <div>
                      <span className="font-medium">Customer ID:</span>{" "}
                      {result.fields.stripe_customer_id || <span className="text-muted-foreground">null</span>}
                    </div>
                    <div>
                      <span className="font-medium">Subscription ID:</span>{" "}
                      {result.fields.stripe_subscription_id || <span className="text-muted-foreground">null</span>}
                    </div>
                    <div>
                      <span className="font-medium">Checkout Session:</span>{" "}
                      {result.fields.stripe_checkout_session_id || <span className="text-muted-foreground">null</span>}
                    </div>
                    <div>
                      <span className="font-medium">Amount:</span> ${result.fields.amount.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Frequency:</span> {result.fields.frequency}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(result.fields.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Strategy Checks */}
                <div>
                  <h4 className="font-semibold mb-2">Strategy Condition Checks:</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      {result.strategyChecks.strategy1.passes ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <span className="font-medium">Strategy 1 (Checkout Session):</span>{" "}
                        {result.strategyChecks.strategy1.reason}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      {result.strategyChecks.strategy2.passes ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <span className="font-medium">Strategy 2 (Subscription ID):</span>{" "}
                        {result.strategyChecks.strategy2.reason}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      {result.strategyChecks.strategy3.passes ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      )}
                      <div>
                        <span className="font-medium">Strategy 3 (Customer Search):</span>{" "}
                        {result.strategyChecks.strategy3.reason}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stripe Lookups */}
                <div>
                  <h4 className="font-semibold mb-2">Stripe Lookup Results:</h4>
                  <div className="space-y-3">
                    {result.stripeLookups.checkoutSession.attempted && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {result.stripeLookups.checkoutSession.found ? (
                            <Badge variant="default">Found</Badge>
                          ) : (
                            <Badge variant="destructive">Not Found</Badge>
                          )}
                          <span className="font-medium">Checkout Session Lookup</span>
                        </div>
                        {result.stripeLookups.checkoutSession.error && (
                          <div className="text-red-500 text-xs">
                            Error: {result.stripeLookups.checkoutSession.error}
                          </div>
                        )}
                        {result.stripeLookups.checkoutSession.data && (
                          <pre className="text-xs mt-2 overflow-auto max-h-32">
                            {JSON.stringify(result.stripeLookups.checkoutSession.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {result.stripeLookups.subscription.attempted && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {result.stripeLookups.subscription.found ? (
                            <Badge variant="default">Found</Badge>
                          ) : (
                            <Badge variant="destructive">Not Found</Badge>
                          )}
                          <span className="font-medium">Subscription Lookup</span>
                        </div>
                        {result.stripeLookups.subscription.error && (
                          <div className="text-red-500 text-xs">
                            Error: {result.stripeLookups.subscription.error}
                          </div>
                        )}
                        {result.stripeLookups.subscription.data && (
                          <pre className="text-xs mt-2 overflow-auto max-h-32">
                            {JSON.stringify(result.stripeLookups.subscription.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {result.stripeLookups.customerSearch.attempted && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          {result.stripeLookups.customerSearch.found ? (
                            <Badge variant="default">Found</Badge>
                          ) : (
                            <Badge variant="destructive">Not Found</Badge>
                          )}
                          <span className="font-medium">Customer Search (Strategy 3)</span>
                        </div>
                        {result.stripeLookups.customerSearch.error && (
                          <div className="text-red-500 text-xs">
                            Error: {result.stripeLookups.customerSearch.error}
                          </div>
                        )}
                        {result.stripeLookups.customerSearch.data && (
                          <pre className="text-xs mt-2 overflow-auto max-h-32">
                            {JSON.stringify(result.stripeLookups.customerSearch.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="border-t pt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Recommended Action:</h4>
                      <p className="text-sm text-muted-foreground">{result.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
