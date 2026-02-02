import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const CANADIAN_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
  "Quebec", "Saskatchewan", "Yukon"
];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "New Zealand", "Ireland",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czech Republic", "Portugal", "Greece",
  "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Japan", "South Korea",
  "Singapore", "Philippines", "Thailand", "Vietnam", "India", "South Africa", "Other"
];

interface NewsletterSignupProps {
  compact?: boolean;
  redirectOnSuccess?: boolean;
}

export const NewsletterSignup = ({ compact = false, redirectOnSuccess = false }: NewsletterSignupProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [consent, setConsent] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  const getStateOptions = () => {
    if (country === "United States") return US_STATES;
    if (country === "Canada") return CANADIAN_PROVINCES;
    return [];
  };

  const showStateDropdown = country === "United States" || country === "Canada";

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Get timezone from browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Check for active session to link user_id
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from("newsletter_subscribers").insert({
        email,
        user_id: session?.user?.id || null,
        location_city: city || null,
        location_state: state || null,
        location_country: country || null,
        timezone,
        source: compact ? "widget" : "website_signup",
      });

      if (error) throw error;

      // Trigger welcome email
      try {
        await supabase.functions.invoke("send-automated-campaign", {
          body: {
            trigger_event: "newsletter_signup",
            recipient_email: email,
            trigger_data: {
              source: compact ? "widget" : "website_signup",
            },
          },
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't throw - subscription was successful
      }
    },
    onSuccess: () => {
      toast.success("Successfully subscribed to newsletter!");
      setEmail("");
      setCity("");
      setState("");
      setCountry("");
      setConsent(false);
      
      if (redirectOnSuccess) {
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("This email is already subscribed");
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    },
  });

  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Stay Updated</h3>
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => subscribeMutation.mutate()}
            disabled={!email || subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? "..." : "Subscribe"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Get our monthly newsletter with updates and stories
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Join Our Newsletter</h2>
        <p className="text-muted-foreground">
          Stay connected with Best Day Ministries. Get monthly updates, inspiring stories, and event invitations.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {!showLocation ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowLocation(true)}
            className="w-full"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Add Location (Optional)
          </Button>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Help us understand where our community is growing (optional)
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[100]">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Denver"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">
                    {country === "United States" ? "State" : country === "Canada" ? "Province" : "State/Province/Region"}
                  </Label>
                  {showStateDropdown ? (
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder={country === "United States" ? "Select state" : "Select province"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-[100] max-h-[300px]">
                        {getStateOptions().map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="state"
                      placeholder="Region"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-2 pt-2">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked as boolean)}
          />
          <label
            htmlFor="consent"
            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to receive email updates from Best Day Ministries. I can unsubscribe at any time.
          </label>
        </div>

        <Button
          onClick={() => subscribeMutation.mutate()}
          disabled={!email || !consent || subscribeMutation.isPending}
          className="w-full"
          size="lg"
        >
          {subscribeMutation.isPending ? "Subscribing..." : "Subscribe to Newsletter"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          We respect your privacy. Your information will never be shared with third parties.
        </p>
      </div>
    </Card>
  );
};