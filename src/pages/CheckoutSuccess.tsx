import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, ShoppingBag, ArrowLeft, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCartSession } from "@/hooks/useCartSession";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { sessionId: guestSessionId, isAuthenticated, isLoading: authLoading, userId } = useCartSession();
  
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [debugLogId, setDebugLogId] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [failureDetails, setFailureDetails] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);
  const maxPolls = 10; // Poll for up to 30 seconds (10 x 3s)

  const sessionId = searchParams.get("session_id");
  const orderIdParam = searchParams.get("order_id");

  useEffect(() => {
    // Wait for auth state to be determined before verifying payment
    if (authLoading) return;

    if (!sessionId || !orderIdParam) {
      setFailureMessage("Missing payment session information.");
      setStatus("failed");
      return;
    }

    setOrderId(orderIdParam);
    // Pass current auth state to avoid stale closures
    verifyPayment(isAuthenticated, guestSessionId);
  }, [sessionId, orderIdParam, authLoading, isAuthenticated, guestSessionId]);

  useEffect(() => {
    // Polling logic for pending payments
    if (status === "pending" && pollCount < maxPolls) {
      const timer = setTimeout(() => {
        verifyPayment(isAuthenticated, guestSessionId);
        setPollCount((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, pollCount, isAuthenticated, guestSessionId]);

  const verifyPayment = async (isAuth: boolean, guestSessId: string | null) => {
    try {
      // Build request body - include guest_session_id for guest checkout cart clearing
      const body: { session_id: string; order_id: string; guest_session_id?: string } = {
        session_id: sessionId!,
        order_id: orderIdParam!,
      };

      // If not authenticated, include the guest session ID
      if (!isAuth && guestSessId) {
        body.guest_session_id = guestSessId;
      }

      const { data, error } = await supabase.functions.invoke("verify-marketplace-payment", {
        body,
      });

      if (error) {
        // If the function returned JSON with debug_log_id but a non-2xx status,
        // supabase-js exposes it on error.context (Response).
        let parsed: any = null;
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === "function") {
            parsed = await ctx.json();
          }
        } catch {
          // ignore
        }

        const message = parsed?.error || parsed?.message || error.message || "Payment verification failed";
        setFailureMessage(message);
        setFailureDetails(parsed);
        if (parsed?.debug_log_id) setDebugLogId(parsed.debug_log_id);

        console.error("Verification error:", { error, parsed });
        setStatus("failed");
        return;
      }

      const isVerifiedSuccess =
        !!data?.success &&
        ["completed", "processing", "shipped", "refunded"].includes(String(data.status));

      if (isVerifiedSuccess) {
        setStatus("success");
        toast({
          title: "Order confirmed!",
          description: "Your payment was successful.",
        });
      } else if (data.status === "pending") {
        setStatus("pending");
      } else {
        setStatus("failed");
        setFailureMessage(data.error || data.message || "We couldn't verify your payment.");
        setFailureDetails(data);
        // Capture debug log ID if provided
        if (data.debug_log_id) {
          setDebugLogId(data.debug_log_id);
        }
      }
    } catch (err) {
      console.error("Verification error:", err);
      setFailureMessage(err instanceof Error ? err.message : "Payment verification failed");
      setFailureDetails(null);
      setStatus("failed");
    }
  };

  const copyDebugId = () => {
    if (debugLogId) {
      navigator.clipboard.writeText(debugLogId);
      toast({
        title: "Copied",
        description: "Debug reference ID copied to clipboard.",
      });
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
                <CardTitle className="mt-4">Verifying Payment...</CardTitle>
                <CardDescription>Please wait while we confirm your order.</CardDescription>
              </>
            )}
            
            {status === "pending" && (
              <>
                <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
                <CardTitle className="mt-4">Processing Payment...</CardTitle>
                <CardDescription>
                  Your payment is being processed. This may take a moment.
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Attempt {pollCount + 1} of {maxPolls}
                  </span>
                </CardDescription>
              </>
            )}
            
            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <CardTitle className="mt-4">Order Confirmed!</CardTitle>
                <CardDescription>
                  Thank you for your purchase. Your order has been placed successfully.
                </CardDescription>
              </>
            )}
            
            {status === "failed" && (
              <>
                <XCircle className="h-16 w-16 text-destructive mx-auto" />
                <CardTitle className="mt-4">Payment Issue</CardTitle>
                <CardDescription>
                  {failureMessage || "We couldn't verify your payment. Please check your order history or contact support."}

                   {debugLogId && (
                     <div className="mt-3 flex flex-col items-center justify-center gap-2">
                       <div className="flex items-center justify-center gap-2">
                         <span className="text-xs text-muted-foreground">Reference: {debugLogId.slice(0, 8)}...</span>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-6 w-6"
                           onClick={copyDebugId}
                           title="Copy full reference ID"
                         >
                           <Copy className="h-3 w-3" />
                         </Button>
                       </div>
                     </div>
                   )}

                   {failureDetails && (
                     <div className="mt-3 w-full">
                       <details className="w-full text-left">
                         <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                           View technical details
                         </summary>
                         <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
{JSON.stringify(failureDetails, null, 2)}
                         </pre>
                       </details>
                     </div>
                   )}
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {orderId && status === "success" && (
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{orderId}</p>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              {status === "success" && isAuthenticated && (
                <Button asChild className="w-full">
                  <Link to="/orders">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    View Order History
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/marketplace">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Shop
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
