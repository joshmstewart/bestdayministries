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

const donationSchema = z.object({
  amount: z.number().min(5, "Minimum donation is $5"),
  email: z.string().email("Invalid email address"),
});

export const DonationForm = () => {
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("monthly");
  const [amount, setAmount] = useState<string>("");
  const [selectedButton, setSelectedButton] = useState<"30" | "other" | null>(null);
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

      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          amount: parseFloat(amount),
          frequency,
          email: email.trim(),
          coverStripeFee,
        },
      });

      if (error) throw error;

      if (data.url) {
        toast.success("Redirecting to secure checkout...");
        window.location.href = data.url;
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
          <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as "one-time" | "monthly")} className="grid grid-cols-2 gap-4">
            <Card className={`cursor-pointer transition-all ${frequency === "monthly" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
              <CardContent className="p-4 text-center" onClick={() => setFrequency("monthly")}>
                <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
                <Label htmlFor="monthly" className="cursor-pointer">
                  <Heart className="w-8 h-8 text-primary mx-auto mb-2 fill-primary" />
                  <div className="font-bold">Monthly</div>
                  <div className="text-xs text-muted-foreground">Recurring support</div>
                </Label>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all ${frequency === "one-time" ? "border-secondary ring-2 ring-secondary/20" : "border-border"}`}>
              <CardContent className="p-4 text-center" onClick={() => setFrequency("one-time")}>
                <RadioGroupItem value="one-time" id="one-time" className="sr-only" />
                <Label htmlFor="one-time" className="cursor-pointer">
                  <Sparkles className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <div className="font-bold">One-Time</div>
                  <div className="text-xs text-muted-foreground">Single donation</div>
                </Label>
              </CardContent>
            </Card>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => setSelectedButton("other")}
              placeholder="Enter amount"
              className="pl-7"
              min="5"
              step="1"
            />
          </div>
        </div>

        {/* Login Prompt for Non-Logged-In Users */}
        {!isLoggedIn && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">Already have an account?</p>
                <p className="text-xs text-muted-foreground">
                  Log in to track your donations, view receipts, and manage your giving in one place.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/auth?redirect=/support")}
                  className="mt-2"
                >
                  Log In
                </Button>
              </div>
            </div>
          </div>
        )}

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
          <p className="text-xs text-muted-foreground">
            {isLoggedIn 
              ? "This email is linked to your account and will be used to track your donation. Receipts will be sent here." 
              : "Don't have an account? You can donate as a guest and create one later to view your donation receipts with the same email."}
          </p>
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
