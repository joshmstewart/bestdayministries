import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const RecalculateAmountsTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [beforeAmount, setBeforeAmount] = useState<number | null>(null);
  const [afterAmount, setAfterAmount] = useState<number | null>(null);
  const { toast } = useToast();

  const testRecalculation = async () => {
    setTesting(true);
    setResults(null);
    setBeforeAmount(null);
    setAfterAmount(null);

    try {
      // Get the "before" state for Spetty sponsorship
      console.log("📊 Fetching Spetty sponsorship before recalculation...");
      const { data: beforeData } = await supabase
        .from('sponsorships')
        .select('id, amount, stripe_subscription_id')
        .eq('id', 'd4c65267-08f2-4fed-95fa-8d7ab77bbc5b')
        .single();

      if (beforeData) {
        setBeforeAmount(beforeData.amount);
        console.log("✅ Before amount:", beforeData.amount);
      }

      // Call the recalculation function
      console.log("🔄 Calling recalculate-sponsorship-amounts...");
      const { data, error } = await supabase.functions.invoke('recalculate-sponsorship-amounts');
      
      if (error) {
        throw error;
      }

      console.log("✅ Recalculation complete:", data);
      setResults(data);

      // Wait a moment for the update to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the "after" state
      console.log("📊 Fetching Spetty sponsorship after recalculation...");
      const { data: afterData } = await supabase
        .from('sponsorships')
        .select('id, amount, stripe_subscription_id')
        .eq('id', 'd4c65267-08f2-4fed-95fa-8d7ab77bbc5b')
        .single();

      if (afterData) {
        setAfterAmount(afterData.amount);
        console.log("✅ After amount:", afterData.amount);
      }

      toast({
        title: "Recalculation Complete",
        description: `Updated ${data?.updatedCount || 0} sponsorships`,
      });

    } catch (error: any) {
      console.error("❌ Recalculation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to recalculate amounts",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Sponsorship Recalculation</CardTitle>
        <CardDescription>
          Test the recalculation function on Susan Petty's sponsorship
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Spetty Discrepancy</AlertTitle>
          <AlertDescription>
            Database shows $16.54, but Stripe shows $15.76 was charged.
            <br />
            Sponsorship ID: d4c65267-08f2-4fed-95fa-8d7ab77bbc5b
            <br />
            Stripe ID: sub_1SQv60IZCv5wsm2Y0AhyTmTI
          </AlertDescription>
        </Alert>

        <Button 
          onClick={testRecalculation} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Run Recalculation Test
            </>
          )}
        </Button>

        {(beforeAmount !== null || afterAmount !== null) && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm">Results</h3>
            
            {beforeAmount !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Before:</span>
                <span className="font-mono font-bold text-destructive">
                  ${beforeAmount.toFixed(2)}
                </span>
              </div>
            )}

            {afterAmount !== null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">After:</span>
                <span className="font-mono font-bold text-primary">
                  ${afterAmount.toFixed(2)}
                </span>
              </div>
            )}

            {beforeAmount !== null && afterAmount !== null && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Difference:</span>
                <span className={`font-mono font-bold ${
                  afterAmount === 15.76 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  ${Math.abs(afterAmount - beforeAmount).toFixed(2)}
                </span>
              </div>
            )}

            {afterAmount === 15.76 && (
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Success!</AlertTitle>
                <AlertDescription className="text-green-600">
                  Amount now matches Stripe's charge of $15.76
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm">Function Response</h3>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
