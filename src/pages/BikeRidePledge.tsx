import { useState, useEffect } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bike, Heart, Users, DollarSign, MessageCircle, CheckCircle2, Loader2, CreditCard, MapPin, Navigation, ExternalLink, Image as ImageIcon, Mountain, Clock, Flag, Trophy, ArrowLeft } from "lucide-react";
import { BikeRouteMap } from "@/components/BikeRouteMap";

interface BikeEvent {
  id: string;
  title: string;
  description: string | null;
  rider_name: string;
  ride_date: string;
  mile_goal: number;
  actual_miles: number | null;
  status: string;
  cover_image_url: string | null;
  start_location: string | null;
  end_location: string | null;
  route_map_image_url: string | null;
  race_url: string | null;
  route_waypoints: any[] | null;
  elevation_gain_ft: number | null;
  difficulty_rating: string | null;
  ridewithgps_url: string | null;
  aid_stations: any[] | null;
  key_climbs: string[] | null;
  start_time: string | null;
  registration_url: string | null;
  finish_description: string | null;
  route_description: string | null;
  rider_bio: string | null;
  rider_image_url: string | null;
  race_logo_url: string | null;
}

interface ScenicPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  is_default: boolean;
}

interface EventStats {
  total_pledgers: number;
  per_mile_pledgers: number;
  flat_donors: number;
  estimated_total_at_goal: number;
  messages: { name: string; message: string }[];
}

// Inner form that has access to Stripe context
function PledgeCardForm({
  clientSecret,
  pledgerName,
  maxTotal,
  centsPerMile,
  onSuccess,
}: {
  clientSecret: string;
  pledgerName: string;
  maxTotal: number;
  centsPerMile: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfirmCard = async () => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setConfirming(true);
    setCardError(null);

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: pledgerName },
        },
      });

      if (error) {
        setCardError(error.message || "Card verification failed");
        toast({
          title: "Card Error",
          description: error.message || "Please check your card details.",
          variant: "destructive",
        });
      } else if (setupIntent?.status === "succeeded") {
        try {
          await supabase.functions.invoke("confirm-bike-pledge", {
            body: { setup_intent_id: setupIntent.id },
          });
        } catch (confirmErr) {
          console.error("Error confirming pledge (non-fatal):", confirmErr);
        }
        toast({
          title: "Pledge Confirmed! 🎉",
          description: `Your card is saved. You'll be charged up to $${maxTotal.toFixed(2)} after the ride.`,
        });
        onSuccess();
      }
    } catch (err) {
      console.error("Error confirming card:", err);
      setCardError("An unexpected error occurred. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-primary" />
          Card Details
        </Label>
        <div className="border rounded-md p-4 bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "hsl(var(--foreground))",
                  "::placeholder": { color: "hsl(var(--muted-foreground))" },
                },
                invalid: { color: "hsl(var(--destructive))" },
              },
            }}
          />
        </div>
        {cardError && (
          <p className="text-sm text-destructive mt-2">{cardError}</p>
        )}
      </div>

      <Button
        onClick={handleConfirmCard}
        disabled={confirming || !stripe}
        className="w-full"
        size="lg"
      >
        {confirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Verifying Card...
          </>
        ) : (
          <>Confirm Pledge — {centsPerMile}¢/mile (up to ${maxTotal.toFixed(2)})</>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your card is saved securely with Stripe. You will only be charged after the ride
        is complete, based on actual miles ridden.
      </p>
    </div>
  );
}

const difficultyColor = (rating: string) => {
  switch (rating) {
    case "Easy": return "bg-green-500/10 text-green-700 border-green-500/30";
    case "Moderate": return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
    case "Challenging": return "bg-orange-500/10 text-orange-700 border-orange-500/30";
    case "Epic": return "bg-red-500/10 text-red-700 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function BikeRidePledge() {
  const { eventSlug: routeEventSlug } = useParams<{ eventSlug: string }>();
  const [googleMapsKey, setGoogleMapsKey] = useState<string>("");
  const [event, setEvent] = useState<BikeEvent | null>(null);
  const [scenicPhotos, setScenicPhotos] = useState<ScenicPhoto[]>([]);
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Stripe state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "card">("form");

  // Pledge form state
  const [centsPerMile, setCentsPerMile] = useState(25);
  const [pledgerName, setPledgerName] = useState("");
  const [pledgerEmail, setPledgerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [coverFees, setCoverFees] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setPledgerEmail(user.email);
      }
    });
  }, []);

  const [searchParams] = useSearchParams();
  const forceTestMode = searchParams.get("test") === "true";

  const { toast } = useToast();

  const maxTotalBase = event ? (centsPerMile / 100) * event.mile_goal : 0;
  const calculateFeeTotal = (amount: number) => Math.round(((amount + 0.30) / 0.971) * 100) / 100;
  const maxTotal = coverFees && maxTotalBase > 0 ? calculateFeeTotal(maxTotalBase) : maxTotalBase;
  const feeDiff = coverFees && maxTotalBase > 0 ? +(maxTotal - maxTotalBase).toFixed(2) : 0;

  useEffect(() => {
    fetchEventStatus();
    fetchStripeKey();
    fetchGoogleMapsKey();
  }, []);

  const fetchStripeKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-stripe-publishable-key", {
        body: forceTestMode ? { force_test_mode: true } : undefined,
      });
      if (error) throw error;
      if (data?.publishable_key) {
        setStripePromise(loadStripe(data.publishable_key));
      }
    } catch (err) {
      console.error("Error fetching Stripe key:", err);
    }
  };

  const fetchGoogleMapsKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-google-places-key");
      if (!error && data?.apiKey) {
        setGoogleMapsKey(data.apiKey);
      }
    } catch (err) {
      console.error("Error fetching Google Maps key:", err);
    }
  };

  const fetchEventStatus = async () => {
    try {
      const body: any = {};
      if (forceTestMode) body.force_test_mode = true;
      if (routeEventSlug) body.event_slug = routeEventSlug;
      
      const { data, error } = await supabase.functions.invoke("get-bike-ride-status", {
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      if (error) throw error;
      if (data?.event) {
        setEvent(data.event);
        setStats(data.stats);
        if (data.event.id) {
          const { data: photos } = await supabase
            .from("bike_ride_scenic_photos")
            .select("id, image_url, caption, is_default")
            .eq("event_id", data.event.id)
            .order("display_order");
          setScenicPhotos(photos || []);
        }
      }
    } catch (err) {
      console.error("Error fetching event:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPledge = async () => {
    if (!event || !pledgerName.trim() || !pledgerEmail.trim()) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-bike-pledge", {
        body: {
          event_id: event.id,
          pledger_name: pledgerName.trim(),
          pledger_email: pledgerEmail.trim().toLowerCase(),
          pledge_type: "per_mile",
          cents_per_mile: centsPerMile,
          message: message.trim() || undefined,
          force_test_mode: forceTestMode,
          cover_stripe_fee: coverFees,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.client_secret) {
        setClientSecret(data.client_secret);
        setStep("card");
      }
    } catch (err) {
      console.error("Error submitting pledge:", err);
      toast({
        title: "Error submitting pledge",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardSuccess = () => {
    setSuccess(true);
    setStep("form");
    setClientSecret(null);
    fetchEventStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <UnifiedHeader />
        <main className="pt-24 container max-w-2xl mx-auto px-4 py-12 text-center">
          <Bike className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Active Ride</h1>
          <p className="text-muted-foreground">Check back soon for the next bike ride fundraiser!</p>
        </main>
        <Footer />
      </div>
    );
  }

  const rideDate = new Date(event.ride_date + "T00:00:00");
  const isCompleted = event.status === "completed" || event.status === "charges_processed";

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-12">
        {/* Back link */}
        <div className="container max-w-4xl mx-auto px-4 mb-4">
          <Link to="/bike-rides" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            All Bike Rides
          </Link>
        </div>
        {/* Hero Section */}
        {(() => {
          const heroPhoto = scenicPhotos.find(p => p.is_default);
          return (
            <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background py-12 md:py-16 overflow-hidden">
              {heroPhoto && (
                <div className="absolute inset-0">
                  <img src={heroPhoto.image_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90" />
                </div>
              )}
              <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
                {(event as any).race_logo_url && (
                  <div className="mb-5">
                    <img
                      src={(event as any).race_logo_url}
                      alt={`${event.title} logo`}
                      className="h-20 md:h-28 max-w-[280px] md:max-w-[360px] mx-auto object-contain drop-shadow-lg"
                    />
                  </div>
                )}
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4 backdrop-blur-sm">
                  <Bike className="h-4 w-4" />
                  {isCompleted ? "Ride Complete!" : "Pledge Your Support"}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-3">{event.title}</h1>
                <p className="text-lg text-muted-foreground mb-2">
                  <span className="font-semibold text-foreground">{event.rider_name}</span> is riding{" "}
                  <span className="font-semibold text-primary">{event.mile_goal} miles</span>
                </p>
                <p className="text-muted-foreground">
                  {rideDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {event.start_time && ` · ${event.start_time}`}
                </p>
                {event.description && (
                  <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{event.description}</p>
                )}

                {!isCompleted && (
                  <Button
                    size="lg"
                    className="mt-6"
                    onClick={() => document.getElementById('pledge-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Heart className="h-5 w-5 mr-2" />
                    Pledge Your Support
                  </Button>
                )}

                {isCompleted && event.actual_miles && (
                  <div className="mt-6 bg-card/80 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto border">
                    <p className="text-sm text-muted-foreground mb-1">Actual Miles Ridden</p>
                    <p className="text-4xl font-bold text-primary">{event.actual_miles}</p>
                    <p className="text-sm text-muted-foreground mt-1">out of {event.mile_goal} mile goal</p>
                    <Progress value={(Number(event.actual_miles) / Number(event.mile_goal)) * 100} className="mt-3" />
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Challenge Stats Badges */}
        {(event.elevation_gain_ft || event.difficulty_rating || event.key_climbs?.length) && (
          <section className="py-6 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {event.difficulty_rating && (
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold ${difficultyColor(event.difficulty_rating)}`}>
                    <Mountain className="h-4 w-4" />
                    {event.difficulty_rating}
                  </div>
                )}
                {event.elevation_gain_ft && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                    <Mountain className="h-4 w-4" />
                    {event.elevation_gain_ft.toLocaleString()} ft elevation
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                  <Bike className="h-4 w-4" />
                  {event.mile_goal} miles
                </div>
                {event.key_climbs && event.key_climbs.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm font-medium text-accent-foreground">
                    <Flag className="h-4 w-4" />
                    {event.key_climbs.length} major climb{event.key_climbs.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        {stats && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.total_pledgers}</div>
                    <p className="text-sm text-muted-foreground">Supporters</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">${stats.estimated_total_at_goal.toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted ? "Total Raised" : "Estimated at Goal"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Rider Bio */}
        {(event.rider_bio || event.rider_image_url) && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <h2 className="text-xl font-bold mb-4 text-center">Meet the Rider</h2>
              <div className="flex flex-col md:flex-row items-center gap-6 max-w-2xl mx-auto">
                {event.rider_image_url && (
                  <img
                    src={event.rider_image_url}
                    alt={event.rider_name}
                    className="h-32 w-32 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
                  />
                )}
                {event.rider_bio && (
                  <p className="text-muted-foreground text-center md:text-left">{event.rider_bio}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Inline CTA after rider bio — only if rider bio section actually rendered */}
        {!isCompleted && (event.rider_name && (event.rider_image_url || event.rider_bio)) && (
          <div className="container max-w-4xl mx-auto px-4 py-3 text-center">
            <button
              onClick={() => document.getElementById('pledge-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
            >
              <Heart className="h-3.5 w-3.5" />
              Ready to pledge? Jump to the form
            </button>
          </div>
        )}

        {/* Race Link */}
        {(event.race_url || event.registration_url) && (
          <section className="py-4 border-b">
            <div className="container max-w-4xl mx-auto px-4 text-center flex items-center justify-center gap-4 flex-wrap">
              {event.race_url && (
                <a
                  href={event.race_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Official Race Page
                </a>
              )}
              {event.registration_url && (
                <a
                  href={event.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Register for the Race
                </a>
              )}
            </div>
          </section>
        )}

        {/* Key Climbs & Route Description */}
        {(event.key_climbs?.length || event.route_description) && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Mountain className="h-5 w-5 text-primary" />
                The Challenge
              </h2>
              {event.route_description && (
                <p className="text-muted-foreground mb-4">{event.route_description}</p>
              )}
              {event.key_climbs && event.key_climbs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.key_climbs.map((climb, i) => (
                    <Badge key={i} variant="outline" className="text-sm py-1.5 px-3">
                      <Mountain className="h-3 w-3 mr-1.5" />
                      {climb}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Aid Stations / Milestones Timeline */}
        {event.aid_stations && event.aid_stations.length > 0 && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Course Milestones
              </h2>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
                <div className="space-y-4">
                  {/* Start */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10">
                      <Navigation className="h-4 w-4 text-white" />
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-sm">START — Mile 0</p>
                      {event.start_location && <p className="text-xs text-muted-foreground">{event.start_location}</p>}
                      {event.start_time && <p className="text-xs text-muted-foreground">{event.start_time}</p>}
                    </div>
                  </div>
                  {/* Aid stations */}
                  {event.aid_stations.map((station: any, i: number) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center flex-shrink-0 z-10">
                        <Flag className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="pt-1">
                        <p className="font-semibold text-sm">{station.name} — Mile {station.mile}</p>
                        {station.services && <p className="text-xs text-muted-foreground">{station.services}</p>}
                      </div>
                    </div>
                  ))}
                  {/* Finish */}
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 z-10">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div className="pt-1">
                      <p className="font-semibold text-sm">FINISH — Mile {event.mile_goal}</p>
                      {event.end_location && <p className="text-xs text-muted-foreground">{event.end_location}</p>}
                      {event.finish_description && <p className="text-xs text-muted-foreground">{event.finish_description}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Route Map Section */}
        {(event.start_location || event.end_location || event.route_waypoints?.length || event.ridewithgps_url) && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                The Route
              </h2>
              
              {/* Start/End locations */}
              <div className="flex flex-wrap gap-4 mb-4">
                {event.start_location && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Navigation className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">START: </span>
                      <span className="text-sm font-medium">{event.start_location}</span>
                    </div>
                  </div>
                )}
                {event.end_location && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">FINISH: </span>
                      <span className="text-sm font-medium">{event.end_location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Ride With GPS — embed or link based on admin setting */}
              {event.ridewithgps_url ? (() => {
                const embedMode = (event as any).ridewithgps_embed_mode || 'embed';
                if (embedMode === 'embed') {
                  const rwgpsMatch = event.ridewithgps_url!.match(/ridewithgps\.com\/(routes|trips)\/(\d+)/);
                  const rwgpsType = rwgpsMatch?.[1] || 'routes';
                  const rwgpsId = rwgpsMatch?.[2];
                  return rwgpsId ? (
                    <div className="mb-4">
                      <div className="rounded-lg overflow-hidden border">
                        <iframe
                          src={`https://ridewithgps.com/${rwgpsType}/${rwgpsId}/embed`}
                          width="100%"
                          height="500"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          allow="geolocation; fullscreen"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                          title="RideWithGPS Route Map"
                        />
                      </div>
                      <a
                        href={event.ridewithgps_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-xs mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open full route on RideWithGPS
                      </a>
                    </div>
                  ) : null;
                }
                // Link-only mode
                return (
                  <div className="mb-4">
                    <a
                      href={event.ridewithgps_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          View Full Route on RideWithGPS
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Interactive map with elevation, turn-by-turn directions & more
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </a>
                  </div>
                );
              })() : null}

              {/* Google Maps — shown as fallback (no RWGPS) or when admin enables it alongside RWGPS */}
              {googleMapsKey && (!event.ridewithgps_url || (event as any).show_google_map) && (
                <div className="rounded-lg overflow-hidden border">
                  {event.route_waypoints?.length ? (
                    <BikeRouteMap
                      apiKey={googleMapsKey}
                      startLocation={event.start_location || ""}
                      endLocation={event.end_location || ""}
                      waypoints={event.route_waypoints}
                    />
                  ) : (event.start_location || event.end_location) ? (
                    <iframe
                      width="100%"
                      height="400"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${encodeURIComponent(event.start_location || '')}&destination=${encodeURIComponent(event.end_location || event.start_location || '')}&mode=bicycling`}
                      allowFullScreen
                    />
                  ) : null}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Inline CTA after route map */}
        {!isCompleted && (
          <div className="container max-w-4xl mx-auto px-4 py-3 text-center">
            <button
              onClick={() => document.getElementById('pledge-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-colors"
            >
              <Heart className="h-3.5 w-3.5" />
              Support this ride — pledge below
            </button>
          </div>
        )}

        {/* Scenic Photos */}
        {scenicPhotos.filter(p => !p.is_default).length > 0 && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Event Photos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {scenicPhotos.filter(p => !p.is_default).map(photo => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.image_url}
                      alt={photo.caption || "Event photo"}
                      className="rounded-lg border w-full h-40 object-cover"
                    />
                    {photo.caption && (
                      <p className="text-xs text-muted-foreground mt-1 text-center">{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div id="pledge-section" className="container max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8 scroll-mt-24">
          {/* Pledge Form */}
          {!isCompleted && (
            <div>
              {success ? (
                <Card>
                  <CardContent className="pt-6 text-center space-y-4">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                    <h2 className="text-2xl font-bold">Pledge Confirmed!</h2>
                    <p className="text-muted-foreground">
                      Thank you, {pledgerName}! You pledged {centsPerMile}¢ per mile
                      (up to <span className="font-semibold text-foreground">${maxTotal.toFixed(2)}</span>).
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your card is saved and will be charged after the ride based on actual miles completed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="h-5 w-5 text-primary" />
                      {step === "form" ? "Make Your Pledge" : "Enter Card Details"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {step === "form" ? (
                      <>
                        {/* Cents per mile slider */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Cents Per Mile</Label>
                          <div className="text-center">
                            <span className="text-4xl font-bold text-primary">{centsPerMile}¢</span>
                            <span className="text-muted-foreground ml-1">per mile</span>
                          </div>
                          <Slider
                            value={[centsPerMile]}
                            onValueChange={([v]) => setCentsPerMile(v)}
                            min={5}
                            max={500}
                            step={5}
                            className="my-4"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>5¢</span>
                            <span>$5.00</span>
                          </div>
                          <div className="bg-primary/10 rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">Maximum charge at {event.mile_goal} miles:</p>
                            <p className="text-3xl font-bold text-primary">${maxTotal.toFixed(2)}</p>
                            {coverFees && feeDiff > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">(includes ${feeDiff.toFixed(2)} processing fee)</p>
                            )}
                          </div>
                          <div className="flex items-start space-x-2 mt-3">
                            <Checkbox
                              id="cover-fees"
                              checked={coverFees}
                              onCheckedChange={(checked) => setCoverFees(checked === true)}
                            />
                            <label htmlFor="cover-fees" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                              Cover processing fees so 100% of my pledge goes to Best Day Ministries
                            </label>
                          </div>
                        </div>

                        {/* Name & Email */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="pledger-name">Your Name</Label>
                            <Input
                              id="pledger-name"
                              value={pledgerName}
                              onChange={(e) => setPledgerName(e.target.value)}
                              placeholder="John Doe"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pledger-email">Your Email</Label>
                            <Input
                              id="pledger-email"
                              type="email"
                              value={pledgerEmail}
                              onChange={(e) => setPledgerEmail(e.target.value)}
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>

                        {/* Optional message */}
                        <div>
                          <Label htmlFor="pledge-message">Encouragement Message (optional)</Label>
                          <Textarea
                            id="pledge-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="You got this! 🚴"
                            maxLength={500}
                            rows={2}
                          />
                        </div>

                        <Button
                          onClick={handleSubmitPledge}
                          disabled={submitting || !pledgerName.trim() || !pledgerEmail.trim()}
                          className="w-full"
                          size="lg"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Preparing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Continue to Card Details
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          Your card will be securely saved and only charged after the ride is complete,
                          based on actual miles ridden.
                        </p>
                      </>
                    ) : clientSecret && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <div className="space-y-4">
                          <div className="bg-primary/10 rounded-lg p-3 text-center">
                            <p className="text-sm text-muted-foreground">
                              {pledgerName} — {centsPerMile}¢/mile — Max ${maxTotal.toFixed(2)}
                            </p>
                          </div>

                          <PledgeCardForm
                            clientSecret={clientSecret}
                            pledgerName={pledgerName}
                            maxTotal={maxTotal}
                            centsPerMile={centsPerMile}
                            onSuccess={handleCardSuccess}
                          />

                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                              setStep("form");
                              setClientSecret(null);
                            }}
                          >
                            ← Back to pledge details
                          </Button>
                        </div>
                      </Elements>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading payment form...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Messages Wall */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Supporter Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && stats.messages.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {stats.messages.map((msg, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3">
                        <p className="font-medium text-sm">{msg.name}</p>
                        <p className="text-muted-foreground text-sm mt-1">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Be the first to leave a message! 💬
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Finish Line Info */}
            {event.finish_description && !event.aid_stations?.length && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">At the Finish Line</p>
                      <p className="text-sm text-muted-foreground">{event.finish_description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* If completed, show results in left column */}
          {isCompleted && (
            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                <h2 className="text-xl font-bold">Ride Complete!</h2>
                <p className="text-muted-foreground">
                  {event.rider_name} rode <span className="font-bold text-foreground">{event.actual_miles} miles</span>.
                  Thank you to all {stats?.total_pledgers} supporters!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
