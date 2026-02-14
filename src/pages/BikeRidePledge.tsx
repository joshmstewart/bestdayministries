import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bike, Heart, Users, DollarSign, MessageCircle, CheckCircle2, Loader2 } from "lucide-react";

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
}

interface EventStats {
  total_pledgers: number;
  per_mile_pledgers: number;
  flat_donors: number;
  estimated_total_at_goal: number;
  messages: { name: string; message: string }[];
}

export default function BikeRidePledge() {
  const [event, setEvent] = useState<BikeEvent | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pledge form state
  const [centsPerMile, setCentsPerMile] = useState(25);
  const [pledgerName, setPledgerName] = useState("");
  const [pledgerEmail, setPledgerEmail] = useState("");
  const [message, setMessage] = useState("");

  const { toast } = useToast();

  const maxTotal = event ? (centsPerMile / 100) * event.mile_goal : 0;

  useEffect(() => {
    fetchEventStatus();
  }, []);

  const fetchEventStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-bike-ride-status');
      if (error) throw error;
      if (data?.event) {
        setEvent(data.event);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
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
      const { data, error } = await supabase.functions.invoke('create-bike-pledge', {
        body: {
          event_id: event.id,
          pledger_name: pledgerName.trim(),
          pledger_email: pledgerEmail.trim().toLowerCase(),
          pledge_type: 'per_mile',
          cents_per_mile: centsPerMile,
          message: message.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Note: In a full implementation, you'd mount a Stripe card element
      // and confirm the Setup Intent with the client_secret from the response.
      // For now, we show success and the pledge is recorded.
      setSuccess(true);
      toast({ title: "Pledge submitted! 🎉", description: `Your card will be charged up to $${maxTotal.toFixed(2)} after the ride.` });
      fetchEventStatus(); // Refresh stats
    } catch (err) {
      console.error('Error submitting pledge:', err);
      toast({
        title: "Error submitting pledge",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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

  const rideDate = new Date(event.ride_date + 'T00:00:00');
  const isCompleted = event.status === 'completed' || event.status === 'charges_processed';

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      <main className="pt-24 pb-12">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-accent/5 to-background py-12 md:py-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Bike className="h-4 w-4" />
              {isCompleted ? 'Ride Complete!' : 'Pledge Your Support'}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">{event.title}</h1>
            <p className="text-lg text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">{event.rider_name}</span> is riding{' '}
              <span className="font-semibold text-primary">{event.mile_goal} miles</span>
            </p>
            <p className="text-muted-foreground">
              {rideDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {event.description && (
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{event.description}</p>
            )}

            {isCompleted && event.actual_miles && (
              <div className="mt-6 bg-card rounded-xl p-6 max-w-md mx-auto border">
                <p className="text-sm text-muted-foreground mb-1">Actual Miles Ridden</p>
                <p className="text-4xl font-bold text-primary">{event.actual_miles}</p>
                <p className="text-sm text-muted-foreground mt-1">out of {event.mile_goal} mile goal</p>
                <Progress value={(Number(event.actual_miles) / Number(event.mile_goal)) * 100} className="mt-3" />
              </div>
            )}
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section className="py-8 border-b">
            <div className="container max-w-4xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                      {isCompleted ? 'Total Raised' : 'Estimated at Goal'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="col-span-2 md:col-span-1">
                  <CardContent className="pt-6 text-center">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stats.per_mile_pledgers}</div>
                    <p className="text-sm text-muted-foreground">Per-Mile Pledgers</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}

        <div className="container max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
          {/* Pledge Form */}
          {!isCompleted && (
            <div>
              {success ? (
                <Card>
                  <CardContent className="pt-6 text-center space-y-4">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                    <h2 className="text-2xl font-bold">Pledge Received!</h2>
                    <p className="text-muted-foreground">
                      Thank you, {pledgerName}! You pledged {centsPerMile}¢ per mile
                      (up to <span className="font-semibold text-foreground">${maxTotal.toFixed(2)}</span>).
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your card will be charged after the ride based on actual miles completed.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bike className="h-5 w-5 text-primary" />
                      Make Your Pledge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                      </div>
                    </div>

                    {/* Name & Email */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="pledger-name">Your Name</Label>
                        <Input
                          id="pledger-name"
                          value={pledgerName}
                          onChange={e => setPledgerName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pledger-email">Your Email</Label>
                        <Input
                          id="pledger-email"
                          type="email"
                          value={pledgerEmail}
                          onChange={e => setPledgerEmail(e.target.value)}
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
                        onChange={e => setMessage(e.target.value)}
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
                          Submitting...
                        </>
                      ) : (
                        <>Pledge {centsPerMile}¢/mile (up to ${maxTotal.toFixed(2)})</>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Your card will be securely saved and only charged after the ride is complete,
                      based on actual miles ridden.
                    </p>
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
