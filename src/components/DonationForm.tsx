import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { trackDonationStart } from "@/lib/analytics";

const donationSchema = z.object({
  amount: z.number().min(5, "Minimum donation is $5"),
  email: z.string().email("Invalid email address"),
});

export const DonationForm = () => {
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("monthly");
  const [amount, setAmount] = useState<string>("30");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedButton, setSelectedButton] = useState<"30" | "other">("30");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [coverStripeFee, setCoverStripeFee] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthAndLoadEmail();
  }, []);

  const checkAuthAndLoadEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setEmail(user.email);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  };

  const calculateTotal = () => {
    const baseAmount = parseFloat(amount) || 0;
    if (!coverStripeFee) return baseAmount;
    // Stripe fee: 2.9% + $0.30
    const total = (baseAmount + 0.30) / 0.971;
    return total;
  };

  const handleDonation = async () => {
    try {
      setLoading(true);

      if (!acceptedTerms) {
        toast.error("Please accept the Terms of Service and Privacy Policy to continue");
        setLoading(false);
        return;
      }

      const validation = donationSchema.safeParse({
        amount: parseFloat(amount),
        email: email.trim(),
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Record terms acceptance if user is logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.functions.invoke("record-terms-acceptance", {
            body: {
              termsVersion: "1.0",
              privacyVersion: "1.0",
            },
          });
        }
      } catch (termsError) {
        console.error("Error recording terms acceptance:", termsError);
      }

      // Track donation start in Google Analytics
      trackDonationStart(frequency === "monthly" ? "monthly_donation" : "one_time_donation", parseFloat(amount));

      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          amount: parseFloat(amount),
          frequency,
          email: email.trim(),
          coverStripeFee,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.url) {
        toast.success("Redirecting to secure checkout...");
        
        // Use setTimeout to ensure toast shows before redirect
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
      } else {
        console.error('No URL in response data:', data);
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error("Error creating donation:", error);
      toast.error("Failed to start donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();
  const stripeFee = total - parseFloat(amount || "0");

  return (
    <Card className="border-2 shadow-xl max-w-2xl mx-auto">
      <CardContent className="p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black flex items-center justify-center gap-2 mb-2">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            Make a Donation
          </h2>
          <p className="text-muted-foreground">
            Support our mission with a one-time or recurring donation
          </p>
        </div>

        {/* Frequency Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Donation Type</Label>
          <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as "one-time" | "monthly")} className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFrequency("monthly")}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                frequency === "monthly" 
                  ? "border-primary bg-primary/10 shadow-md" 
                  : "border-border bg-background hover:border-muted-foreground/30"
              }`}
            >
              <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  frequency === "monthly" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Heart className={`w-5 h-5 ${frequency === "monthly" ? "fill-current" : ""}`} />
                </div>
                <div>
                  <div className={`font-bold ${frequency === "monthly" ? "text-primary" : "text-muted-foreground"}`}>
                    Monthly
                  </div>
                  <div className="text-xs text-muted-foreground">Recurring</div>
                </div>
              </div>
              {frequency === "monthly" && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFrequency("one-time")}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                frequency === "one-time" 
                  ? "border-secondary bg-secondary/10 shadow-md" 
                  : "border-border bg-background hover:border-muted-foreground/30"
              }`}
            >
              <RadioGroupItem value="one-time" id="one-time" className="sr-only" />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  frequency === "one-time" 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-bold ${frequency === "one-time" ? "text-secondary" : "text-muted-foreground"}`}>
                    One-Time
                  </div>
                  <div className="text-xs text-muted-foreground">Single gift</div>
                </div>
              </div>
              {frequency === "one-time" && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          </RadioGroup>
        </div>

        {/* Amount Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Amount</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={selectedButton === "30" ? "default" : "outline"}
              onClick={() => {
                setSelectedButton("30");
                setAmount("30");
              }}
              className="w-full"
            >
              $30
            </Button>
            <Button
              variant={selectedButton === "other" ? "default" : "outline"}
              onClick={() => {
                setSelectedButton("other");
                document.getElementById("custom-amount-input")?.focus();
              }}
              className="w-full"
            >
              Other Amount
            </Button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="custom-amount-input"
              type="number"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount(e.target.value);
              }}
              onFocus={() => setSelectedButton("other")}
              placeholder="Enter amount"
              className="pl-7"
              min="5"
              step="1"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">Your Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={isLoggedIn}
            required
          />
          {isLoggedIn ? (
            <p className="text-xs text-muted-foreground">
              Receipts will be sent to this email address.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              We'll send your receipt here. Create an account later with this email to view all your receipts.{" "}
              <button 
                type="button"
                onClick={() => navigate("/auth?redirect=/support")}
                className="text-primary hover:underline font-medium"
              >
                Have an account? Log in
              </button>
            </p>
          )}
        </div>

        {/* Cover Stripe Fee */}
        <div className="flex items-start space-x-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
          <Checkbox
            id="cover-fee"
            checked={coverStripeFee}
            onCheckedChange={(checked) => setCoverStripeFee(checked as boolean)}
          />
          <div className="flex-1">
            <Label htmlFor="cover-fee" className="font-semibold cursor-pointer">
              Cover processing fees (${stripeFee.toFixed(2)})
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Help us keep 100% of your donation by covering the ${stripeFee.toFixed(2)} Stripe processing fee
            </p>
          </div>
        </div>

        {/* Terms Acceptance */}
        <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
            I agree to the{" "}
            <Link to="/terms" className="text-primary hover:underline" target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary hover:underline" target="_blank">
              Privacy Policy
            </Link>
          </Label>
        </div>

        {/* Total */}
        <div className="p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total {frequency === "monthly" && "per month"}:</span>
            <span className="text-2xl font-black text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleDonation}
          disabled={loading || !acceptedTerms}
          className="w-full h-12 text-lg shadow-warm hover:shadow-glow transition-all hover:scale-105"
          size="lg"
        >
          {loading ? "Processing..." : `Donate ${frequency === "monthly" ? "Monthly" : "Now"}`}
        </Button>

        {/* Tax & Legal Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1 pt-2">
          <p>
            Best Day Ministries is a church under section 508(c)(1)(A) of the Internal Revenue Code. 
            Your donation may be tax-deductible to the extent allowed by law.
          </p>
          <p className="font-medium">
            100% of your donation goes directly to support our mission {coverStripeFee ? '(processing fees covered)' : '(minus processing fees)'}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
