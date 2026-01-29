import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Heart, Home, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackDonationComplete } from "@/lib/analytics";

const SponsorshipSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(true);
  const [sponsorshipDetails, setSponsorshipDetails] = useState<{
    amount: string;
    frequency: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const verificationInProgress = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      navigate("/sponsor-bestie");
      return;
    }
    verifyPayment();
    checkAuthStatus();
  }, [sessionId, navigate]);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleReturnHome = () => {
    navigate(isAuthenticated ? "/community" : "/");
  };

  const verifyPayment = async () => {
    if (verificationInProgress.current) {
      return;
    }
    
    verificationInProgress.current = true;
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-sponsorship-payment', {
        body: { session_id: sessionId }
      });

      if (error) {
        console.error('Verification error:', error);
        throw error;
      }

      setSponsorshipDetails({
        amount: data.amount,
        frequency: data.frequency,
      });

      // Track sponsorship completion in Google Analytics
      trackDonationComplete(
        data.frequency === "monthly" ? "monthly_sponsorship" : "one_time_sponsorship",
        parseFloat(data.amount)
      );
      
      // Send confirmation emails AFTER payment is verified (not before checkout)
      // This prevents emails being sent for abandoned checkouts
      await sendConfirmationEmails(data.email, data.frequency, data.amount, data.bestieName);
      
      toast.success('Sponsorship confirmed!');
    } catch (error) {
      console.error('Error verifying payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to verify payment: ${errorMessage}. Please contact support with your session ID.`);
    } finally {
      setVerifying(false);
      // Delay reset to prevent rapid re-triggers
      setTimeout(() => {
        verificationInProgress.current = false;
      }, 2000);
    }
  };

  const sendConfirmationEmails = async (email: string, frequency: string, amount: string, bestieName?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Send sponsorship confirmation email with duplicate prevention (handled by edge function)
      await supabase.functions.invoke("send-automated-campaign", {
        body: {
          trigger_event: "subscription_created",
          recipient_email: email,
          recipient_user_id: user?.id,
          trigger_data: {
            frequency,
            amount,
            bestie_name: bestieName || 'a Bestie',
          },
        },
      });

      // Check if user is subscribed to newsletter, if so send welcome email
      const { data: subscriber } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email)
        .eq("status", "active")
        .maybeSingle();

      if (subscriber) {
        await supabase.functions.invoke("send-automated-campaign", {
          body: {
            trigger_event: "newsletter_signup",
            recipient_email: email,
            recipient_user_id: user?.id,
          },
        });
      }
    } catch (emailError) {
      console.error("Error sending confirmation emails:", emailError);
      // Don't fail the success page if emails fail to send
    }
  };

  const copySessionId = async () => {
    if (sessionId) {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      toast.success('Session ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 shadow-2xl">
          <CardContent className="p-12 text-center space-y-6">
            {verifying ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto animate-pulse">
                  <Heart className="w-16 h-16 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    Confirming Your Sponsorship...
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Please wait while we process your payment
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto animate-bounce-slow">
                  <CheckCircle2 className="w-16 h-16 text-primary" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    Thank You!
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Your {sponsorshipDetails?.frequency === 'monthly' ? 'monthly' : 'one-time'} sponsorship 
                    of ${sponsorshipDetails?.amount} has been confirmed
                  </p>
                </div>

                <div className="bg-gradient-card p-6 rounded-xl border-2 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Heart className="w-6 h-6 fill-primary" />
                    <span className="font-bold text-lg">You're making a difference!</span>
                  </div>
                  <p className="text-muted-foreground">
                    Your generosity directly supports a Bestie's journey of growth, creativity, and community engagement. 
                    You'll receive a confirmation email with all the details shortly.
                  </p>
                </div>
              </>
            )}

            <div className="pt-6 space-y-3">
              <Button
                onClick={handleReturnHome}
                size="lg"
                className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
              >
                <Home className="w-5 h-5 mr-2" />
                Return Home
              </Button>
              <Button
                onClick={() => navigate("/sponsor-bestie")}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Heart className="w-5 h-5 mr-2" />
                Sponsor Another Bestie
              </Button>
            </div>

            <div className="pt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">Session ID</p>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <code className="text-xs flex-1 overflow-x-auto whitespace-nowrap">
                  {sessionId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copySessionId}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SponsorshipSuccess;
