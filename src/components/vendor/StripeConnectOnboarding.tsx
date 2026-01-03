import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StripeConnectOnboardingProps {
  vendorId: string;
}

export const StripeConnectOnboarding = ({ vendorId }: StripeConnectOnboardingProps) => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [managingAccount, setManagingAccount] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    onboardingComplete?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }>({ connected: false });

  const checkStatus = async () => {
    try {
      setChecking(true);
      const { data, error } = await supabase.functions.invoke(
        "check-stripe-connect-status"
      );

      if (error) throw error;
      
      setStatus(data);
    } catch (error: any) {
      console.error("Error checking Stripe status:", error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-connect-account"
      );

      if (error) throw error;

      if (data.onboardingUrl) {
        // Open Stripe onboarding in new tab
        window.open(data.onboardingUrl, "_blank");
        toast({
          title: "Stripe Onboarding",
          description: "Complete the setup in the new tab, then refresh this page.",
        });
      } else {
        // Already has account, just refresh status
        await checkStatus();
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to connect Stripe account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageAccount = async () => {
    try {
      setManagingAccount(true);
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-login-link"
      );

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    } finally {
      setManagingAccount(false);
    }
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Connect Status
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payments from orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.connected ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to connect a Stripe account to receive payments from customers.
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect Stripe Account
            </Button>
          </>
        ) : !status.onboardingComplete ? (
          <>
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your Stripe account setup is incomplete. Please complete the onboarding process.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Onboarding
              </Button>
              <Button variant="outline" onClick={checkStatus} disabled={checking}>
                Refresh Status
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your Stripe account is fully connected and ready to receive payments!
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Charges Enabled</div>
                <div className={status.chargesEnabled ? "text-green-600" : "text-red-600"}>
                  {status.chargesEnabled ? "✓ Yes" : "✗ No"}
                </div>
              </div>
              <div>
                <div className="font-medium">Payouts Enabled</div>
                <div className={status.payoutsEnabled ? "text-green-600" : "text-red-600"}>
                  {status.payoutsEnabled ? "✓ Yes" : "✗ No"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleManageAccount} disabled={managingAccount}>
                {managingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Stripe Account
              </Button>
              <Button variant="outline" onClick={checkStatus} disabled={checking}>
                Refresh Status
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};