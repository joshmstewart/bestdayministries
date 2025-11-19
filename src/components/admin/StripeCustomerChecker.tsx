import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function StripeCustomerChecker() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const checkCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-customer', {
        body: { customerId: 'cus_TB1AVUVN93Nhdf' }
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: "Stripe Check Complete",
        description: `Found ${data.subscriptions.active} active subscription(s)`,
      });
    } catch (error: any) {
      console.error('Error checking Stripe customer:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check Stripe Customer: cus_TB1AVUVN93Nhdf</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkCustomer} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Check Stripe Records
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Subscriptions</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Total: {results.subscriptions.total} | Active: {results.subscriptions.active}
              </p>
              {results.subscriptions.details.map((sub: any) => (
                <div key={sub.id} className="border-t pt-2 mt-2">
                  <p className="font-mono text-xs">{sub.id}</p>
                  <p className="text-sm">Status: <span className="font-semibold">{sub.status}</span></p>
                  <p className="text-sm">Amount: ${(sub.amount / 100).toFixed(2)} {sub.currency.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(sub.created).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Payment Intents</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Total: {results.payment_intents.total} | Succeeded: {results.payment_intents.succeeded}
              </p>
              {results.payment_intents.details.slice(0, 5).map((pi: any) => (
                <div key={pi.id} className="border-t pt-2 mt-2">
                  <p className="font-mono text-xs">{pi.id}</p>
                  <p className="text-sm">Status: <span className="font-semibold">{pi.status}</span></p>
                  <p className="text-sm">Amount: ${(pi.amount / 100).toFixed(2)} {pi.currency.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(pi.created).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Charges</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Total: {results.charges.total} | Succeeded: {results.charges.succeeded}
              </p>
              {results.charges.details.slice(0, 5).map((charge: any) => (
                <div key={charge.id} className="border-t pt-2 mt-2">
                  <p className="font-mono text-xs">{charge.id}</p>
                  <p className="text-sm">Status: <span className="font-semibold">{charge.status}</span></p>
                  <p className="text-sm">Amount: ${(charge.amount / 100).toFixed(2)} {charge.currency.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Created: {new Date(charge.created).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
