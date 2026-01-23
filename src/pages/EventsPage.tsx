import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { cn } from "@/lib/utils";
import { EventDetailDialog } from "@/components/EventDetailDialog";
import { LocationLink } from "@/components/LocationLink";
import { useRoleImpersonation, type UserRole } from "@/hooks/useRoleImpersonation";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ShareIconButton } from "@/components/ShareButtons";
import { SEOHead } from "@/components/SEOHead";

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
  is_active: boolean;
  is_public: boolean;
  visible_to_roles?: string[];
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  aspect_ratio?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  event_dates?: EventDate[];
  link_url?: string | null;
  link_label?: string | null;
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDisplayDate, setSelectedDisplayDate] = useState<Date | null>(null);
  const [selectedAllDates, setSelectedAllDates] = useState<Date[]>([]);
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const [linkedEvent, setLinkedEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, [isImpersonating]); // Reload when impersonation changes
  
  // Check for linked event ID in URL and load it
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId) {
      loadLinkedEvent(eventId);
    }
  }, [searchParams]);

  const loadEvents = async () => {
    setLoading(true);
    
    // Get current user and their role
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = null;
    
    if (user) {
      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Use effective role (impersonated if active)
      // Filter vendor role (migrated to supporter)
      const dbRole = roleData?.role === 'vendor' ? 'supporter' : roleData?.role;
      userRole = getEffectiveRole(dbRole as UserRole);
    }
    
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_dates(id, event_date)
      `)
      .eq("is_active", true)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
    } else {
      // Filter events based on effective user role
      const filteredEvents = (data || []).filter(event => {
        // Check if user's role is in visible_to_roles
        return event.visible_to_roles?.includes(userRole);
      });
      
      setEvents(filteredEvents as Event[]);
    }
    setLoading(false);
  };
  
  const loadLinkedEvent = async (eventId: string) => {
    // Load the specific event even if it's past
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_dates(id, event_date)
      `)
      .eq("id", eventId)
      .eq("is_active", true)
      .single();
    
    if (error) {
      console.error("Error loading linked event:", error);
      return;
    }
    
    if (data) {
      setLinkedEvent(data as Event);
      // Auto-open the event detail dialog
      const allDates = getAllEventDates(data as Event);
      setSelectedEvent(data as Event);
      setSelectedDisplayDate(allDates[0] || new Date(data.event_date));
      setSelectedAllDates(allDates);
    }
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

  // Create individual cards for each date
  interface EventDateCard {
    event: Event;
    displayDate: Date;
    allDates: Date[];
  }

  const upcomingEventCards: EventDateCard[] = [];
  const pastEventCards: EventDateCard[] = [];

  events.forEach(event => {
    const allDates = getAllEventDates(event);
    
    allDates.forEach(date => {
      const card: EventDateCard = {
        event,
        displayDate: date,
        allDates
      };
      
      const now = new Date();
      const isUpcoming = date >= now;
      
      if (isUpcoming) {
        upcomingEventCards.push(card);
      } else {
        // Show all past events in the Past Events section
        pastEventCards.push(card);
      }
    });
  });
  
  // Add linked event to appropriate section if it's not already there
  if (linkedEvent && !events.some(e => e.id === linkedEvent.id)) {
    const allDates = getAllEventDates(linkedEvent);
    allDates.forEach(date => {
      const card: EventDateCard = {
        event: linkedEvent,
        displayDate: date,
        allDates
      };
      
      const now = new Date();
      const isUpcoming = date >= now;
      
      if (isUpcoming) {
        upcomingEventCards.push(card);
      } else {
        // Always show linked past events
        pastEventCards.push(card);
      }
    });
  }

  // Sort by date
  upcomingEventCards.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
  pastEventCards.sort((a, b) => b.displayDate.getTime() - a.displayDate.getTime());

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Community Events | Joy House Community"
        description="Join us for exciting events and activities in our community. Connect with adults with special needs and their families."
      />
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              Community <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Events</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join us for exciting events and activities in our community
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              <p className="text-muted-foreground mt-4">Loading events...</p>
            </div>
          ) : (
            <>
              {/* Upcoming Events */}
              {upcomingEventCards.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-3xl font-bold">Upcoming Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingEventCards.map((card, idx) => {
                      const { event, displayDate, allDates } = card;
                      return (
                        <Card 
                          key={`${event.id}-${displayDate.getTime()}`} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedEvent(event);
                            setSelectedDisplayDate(displayDate);
                            setSelectedAllDates(allDates);
                          }}
                        >
                          {event.image_url && (
                            <AspectRatio 
                              ratio={(() => {
                                const ratio = event.aspect_ratio || '9:16';
                                const [w, h] = ratio.split(':').map(Number);
                                return w / h;
                              })()} 
                              className="w-full overflow-hidden"
                            >
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </AspectRatio>
                          )}
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold flex-1">{event.title}</h3>
                              <TextToSpeech text={`${event.title}. ${event.description}`} />
                            </div>
                            
                            {/* Primary display date for this card */}
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <div className="flex items-center gap-2 text-foreground font-semibold">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                {format(displayDate, "PPPP")}
                              </div>
                              <div className="flex items-center gap-2 text-foreground mt-1">
                                <Clock className="w-4 h-4 text-primary" />
                                {format(displayDate, "p")}
                              </div>
                            </div>

                            {event.is_recurring && (
                              <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                Recurring {event.recurrence_type === "custom" ? `every ${event.recurrence_interval}` : event.recurrence_type}
                              </span>
                            )}
                            
                            <p className="text-muted-foreground">
                              {event.description}
                            </p>

                            {event.is_public && (
                              <div className="pt-2">
                                <ShareIconButton
                                  title={event.title}
                                  description={event.description}
                                  url={`${window.location.origin}/events?eventId=${event.id}`}
                                  hashtags={['JoyHouse', 'CommunityEvent']}
                                />
                              </div>
                            )}

                            {/* Show all dates if there are multiple */}
                            {allDates.length > 1 && (
                              <div className="space-y-2 pt-2 border-t">
                                <div className="text-xs font-semibold text-muted-foreground">All Event Dates:</div>
                                <div className="space-y-1">
                                  {allDates.map((date, dateIdx) => {
                                    const isPast = date < new Date();
                                    const isCurrent = date.getTime() === displayDate.getTime();
                                    return (
                                      <div
                                        key={dateIdx}
                                        className={cn(
                                          "flex items-center gap-2 text-xs p-1.5 rounded",
                                          isCurrent && "bg-primary/20 font-semibold",
                                          !isCurrent && isPast && "opacity-50 line-through",
                                          !isCurrent && !isPast && "opacity-70"
                                        )}
                                      >
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(date, "MMM d, yyyy")} at {format(date, "p")}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {event.location && (
                              <div className="pt-2 border-t">
                                <LocationLink location={event.location} className="text-foreground" />
                              </div>
                            )}

                            {event.audio_url && (
                              <AudioPlayer src={event.audio_url} />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Past Events */}
              {pastEventCards.length > 0 && (
                <section className="space-y-6">
                  <h2 className="text-3xl font-bold">Past Events</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastEventCards.map((card, idx) => {
                      const { event, displayDate, allDates } = card;
                      return (
                        <Card 
                          key={`${event.id}-${displayDate.getTime()}`} 
                          className="overflow-hidden opacity-75 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedEvent(event);
                            setSelectedDisplayDate(displayDate);
                            setSelectedAllDates(allDates);
                          }}
                        >
                          {event.image_url && (
                            <AspectRatio 
                              ratio={(() => {
                                const ratio = event.aspect_ratio || '9:16';
                                const [w, h] = ratio.split(':').map(Number);
                                return w / h;
                              })()} 
                              className="w-full overflow-hidden"
                            >
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover grayscale"
                              />
                            </AspectRatio>
                          )}
                          <CardContent className="p-6 space-y-4">
                            <div>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Past Event
                              </span>
                              <h3 className="text-xl font-bold mt-2">{event.title}</h3>
                            </div>
                            
                            {/* Primary display date for this card */}
                            <div className="bg-muted/50 p-3 rounded-lg opacity-60">
                              <div className="flex items-center gap-2 line-through">
                                <CalendarIcon className="w-4 h-4" />
                                {format(displayDate, "PPP")}
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground text-sm">
                              {event.description}
                            </p>

                            {/* Show all dates if there are multiple */}
                            {allDates.length > 1 && (
                              <div className="space-y-2 pt-2 border-t">
                                <div className="text-xs font-semibold text-muted-foreground">All Event Dates:</div>
                                <div className="space-y-1">
                                  {allDates.map((date, dateIdx) => {
                                    const isCurrent = date.getTime() === displayDate.getTime();
                                    return (
                                      <div
                                        key={dateIdx}
                                        className={cn(
                                          "flex items-center gap-2 text-xs p-1.5 rounded opacity-60 line-through",
                                          isCurrent && "bg-muted/50 font-semibold"
                                        )}
                                      >
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(date, "MMM d, yyyy")}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {event.location && (
                              <div className="pt-2 border-t">
                                <LocationLink location={event.location} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {upcomingEventCards.length === 0 && pastEventCards.length === 0 && (
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
      
      <EventDetailDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
            setSelectedDisplayDate(null);
            setSelectedAllDates([]);
          }
        }}
        displayDate={selectedDisplayDate || undefined}
        allDates={selectedAllDates}
      />
    </div>
  );
}
