import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, Calendar, MapPin, Mountain, Loader2, Trophy, Users } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

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
  elevation_gain_ft: number | null;
  difficulty_rating: string | null;
  is_active: boolean;
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

export default function BikeRides() {
  const [events, setEvents] = useState<BikeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("bike_ride_events")
        .select("id, title, description, rider_name, ride_date, mile_goal, actual_miles, status, cover_image_url, start_location, end_location, elevation_gain_ft, difficulty_rating, is_active")
        .eq("is_active", true)
        .order("ride_date", { ascending: false });

      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const now = new Date();
  const upcoming = events.filter(e => {
    const rideDate = new Date(e.ride_date + "T23:59:59");
    return rideDate >= now && e.status !== "completed" && e.status !== "charges_processed";
  });
  const past = events.filter(e => {
    const rideDate = new Date(e.ride_date + "T23:59:59");
    return rideDate < now || e.status === "completed" || e.status === "charges_processed";
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Bike Ride Fundraisers | Best Day Ministries"
        description="Support our riders by pledging per mile. Every mile makes a difference!"
      />
      <UnifiedHeader />
      <main className="pt-24 pb-12">
        <div className="container max-w-5xl mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Bike className="h-4 w-4" />
              Bike Ride Fundraisers
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Ride for a Cause</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our riders push their limits so we can support adults with intellectual and developmental disabilities. Pledge per mile and every pedal stroke counts!
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <Bike className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bike rides scheduled yet. Check back soon!</p>
            </div>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 mb-8">
                <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5" />
                  Upcoming ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="past" className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Past ({past.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                {upcoming.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No upcoming rides right now.</p>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {upcoming.map(event => (
                      <BikeRideCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past">
                {past.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No past rides yet.</p>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {past.map(event => (
                      <BikeRideCard key={event.id} event={event} isPast />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function BikeRideCard({ event, isPast }: { event: BikeEvent; isPast?: boolean }) {
  const rideDate = new Date(event.ride_date + "T00:00:00");
  const isCompleted = event.status === "completed" || event.status === "charges_processed";

  return (
    <Link to={`/bike-rides/${event.id}`} className="group">
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 h-full">
        {/* Cover Image */}
        <div className="relative h-48 bg-gradient-to-br from-primary/10 via-accent/5 to-muted overflow-hidden">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Bike className="h-16 w-16 text-primary/20" />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute top-3 right-3">
            {isCompleted ? (
              <Badge className="bg-green-600 text-white border-0">
                <Trophy className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge className="bg-primary text-primary-foreground border-0">
                Open for Pledges
              </Badge>
            )}
          </div>
          {/* Difficulty badge */}
          {event.difficulty_rating && (
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className={`${difficultyColor(event.difficulty_rating)} backdrop-blur-sm`}>
                <Mountain className="h-3 w-3 mr-1" />
                {event.difficulty_rating}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="pt-4 pb-5 space-y-3">
          <h2 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
            {event.title}
          </h2>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{event.rider_name}</span> is riding{" "}
            <span className="font-semibold text-primary">{event.mile_goal} miles</span>
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {rideDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {event.elevation_gain_ft && (
              <span className="inline-flex items-center gap-1">
                <Mountain className="h-3.5 w-3.5" />
                {event.elevation_gain_ft.toLocaleString()} ft
              </span>
            )}
            {event.start_location && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {event.start_location}
              </span>
            )}
          </div>

          {isCompleted && event.actual_miles && (
            <div className="bg-green-500/10 rounded-lg px-3 py-2 text-center">
              <p className="text-sm font-semibold text-green-700">
                {event.actual_miles} miles completed!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
