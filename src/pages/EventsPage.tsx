import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { cn } from "@/lib/utils";

interface EventDate {
  id: string;
  event_date: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  audio_url: string | null;
  event_date: string;
  location: string | null;
  max_attendees: number | null;
  expires_after_date: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  event_dates?: EventDate[];
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_dates(id, event_date)
      `)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  // Helper function to get all dates for an event (sorted)
  const getAllEventDates = (event: Event): Date[] => {
    const dates = [new Date(event.event_date)];
    if (event.event_dates) {
      dates.push(...event.event_dates.map(d => new Date(d.event_date)));
    }
    return dates.sort((a, b) => a.getTime() - b.getTime());
  };

  // Helper function to check if event has any future dates
  const hasUpcomingDates = (event: Event): boolean => {
    const allDates = getAllEventDates(event);
    return allDates.some(date => date >= new Date());
  };

  // Helper function to check if all dates are past
  const allDatesPast = (event: Event): boolean => {
    const allDates = getAllEventDates(event);
    return allDates.every(date => date < new Date());
  };

  const upcomingEvents = events.filter(
    (event) => hasUpcomingDates(event)
  );

  const pastEvents = events.filter(
    (event) => !event.expires_after_date && allDatesPast(event)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/community")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
            <div className="flex-1 text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-foreground">
                Community <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Events</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join us for exciting events and activities in our community
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              <p className="text-muted-foreground mt-4">Loading events...</p>
            </div>
          ) : (
            <>
              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-3xl font-bold">Upcoming Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEvents.map((event) => (
                      <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {event.image_url && (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold flex-1">{event.title}</h3>
                            <TextToSpeech text={`${event.title}. ${event.description}`} />
                          </div>
                          {event.is_recurring && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Recurring {event.recurrence_type === "custom" ? `every ${event.recurrence_interval}` : event.recurrence_type}
                            </span>
                          )}
                          
                          <p className="text-muted-foreground">
                            {event.description}
                          </p>

                          <div className="space-y-3">
                            <div className="font-semibold text-sm">Event Dates:</div>
                            <div className="space-y-2">
                              {getAllEventDates(event).map((date, idx) => {
                                const isPast = date < new Date();
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex items-center gap-2 text-sm p-2 rounded-md",
                                      isPast ? "opacity-50 bg-muted/50" : "bg-primary/10"
                                    )}
                                  >
                                    <CalendarIcon className="w-4 h-4" />
                                    <div className="flex-1">
                                      <div className={isPast ? "line-through" : "font-medium"}>
                                        {format(date, "PPPP")}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs mt-1">
                                        <Clock className="w-3 h-3" />
                                        {format(date, "p")}
                                      </div>
                                    </div>
                                    <span className={cn(
                                      "text-xs px-2 py-1 rounded-full",
                                      isPast 
                                        ? "bg-muted text-muted-foreground" 
                                        : "bg-primary text-primary-foreground"
                                    )}>
                                      {isPast ? "Passed" : "Upcoming"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-foreground pt-2 border-t">
                                <MapPin className="w-4 h-4 text-primary" />
                                {event.location}
                              </div>
                            )}
                          </div>

                          {event.audio_url && (
                            <AudioPlayer src={event.audio_url} />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-3xl font-bold">Past Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEvents.map((event) => (
                      <Card key={event.id} className="overflow-hidden opacity-75">
                        {event.image_url && (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-48 object-cover grayscale"
                          />
                        )}
                        <CardContent className="p-6 space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              Past Event
                            </span>
                            <h3 className="text-xl font-bold mt-2">{event.title}</h3>
                          </div>
                          
                          <p className="text-muted-foreground text-sm">
                            {event.description}
                          </p>

                          <div className="space-y-3">
                            <div className="font-semibold text-sm">Event Dates:</div>
                            <div className="space-y-2">
                              {getAllEventDates(event).map((date, idx) => {
                                const isPast = date < new Date();
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex items-center gap-2 text-sm p-2 rounded-md opacity-60",
                                      "bg-muted/50"
                                    )}
                                  >
                                    <CalendarIcon className="w-4 h-4" />
                                    <div className="flex-1 line-through">
                                      {format(date, "PPP")}
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                      Passed
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length === 0 && pastEvents.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                    <p className="text-muted-foreground">
                      Check back soon for upcoming community events!
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
