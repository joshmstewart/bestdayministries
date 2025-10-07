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
import { Link } from "react-router-dom";

const donationSchema = z.object({
  amount: z.number().min(5, "Minimum donation is $5"),
  email: z.string().email("Invalid email address"),
});

export const DonationForm = () => {
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("monthly");
  const [amount, setAmount] = useState<string>("25");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [coverStripeFee, setCoverStripeFee] = useState(true);

  useEffect(() => {
    checkAuthAndLoadEmail();
  }, []);

  const checkAuthAndLoadEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setEmail(user.email);
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
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          toast.error("Please allow pop-ups to complete checkout");
        } else {
          toast.success("Opening checkout in new tab...");
        }
      }
    } catch (error) {
      console.error("Error creating donation:", error);
      toast.error("Failed to start donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = ["10", "25", "50", "100"];
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
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                variant={amount === preset ? "default" : "outline"}
                onClick={() => setAmount(preset)}
                className="w-full"
              >
                ${preset}
              </Button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="pl-7"
              min="5"
              step="1"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
          <p className="text-xs text-muted-foreground">
            We'll send your receipt to this email address
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
      </CardContent>
    </Card>
  );
};
