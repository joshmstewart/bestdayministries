import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { EventDetailDialog } from "@/components/EventDetailDialog";
import { LocationLink } from "@/components/LocationLink";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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
}

export default function PublicEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDisplayDate, setSelectedDisplayDate] = useState<Date | null>(null);
  const [selectedAllDates, setSelectedAllDates] = useState<Date[]>([]);
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();

  useEffect(() => {
    loadPublicEvents();
  }, [isImpersonating]); // Reload when impersonation changes

  const loadPublicEvents = async () => {
    setLoading(true);
    
    // Get current user and their role (if logged in)
    const { data: { user } } = await supabase.auth.getUser();
    let userRole = null;
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      // Use effective role (impersonated if active)
      userRole = getEffectiveRole(profile?.role);
    }
    
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_dates(id, event_date)
      `)
      .eq("is_public", true)
      .eq("is_active", true)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error loading events:", error);
    } else {
      console.log('PublicEvents - User:', user?.id, 'UserRole:', userRole);
      
      // Filter events based on effective user role
      const filteredEvents = (data || []).filter(event => {
        // If not logged in, show all public events
        if (!user || !userRole) {
          console.log(`Event "${event.title}" - Not logged in or no role, showing`);
          return true;
        }
        
        // Check if user's role is in visible_to_roles
        const isVisible = event.visible_to_roles?.includes(userRole);
        console.log(`Event "${event.title}" - Visible to roles:`, event.visible_to_roles, 'User role:', userRole, 'Is visible:', isVisible);
        return isVisible;
      });
      
      console.log('PublicEvents - Filtered events count:', filteredEvents.length);
      setEvents(filteredEvents as Event[]);
    }
    setLoading(false);
  };

  const getAllEventDates = (event: Event): Date[] => {
    const dates = [new Date(event.event_date)];
    if (event.event_dates) {
      dates.push(...event.event_dates.map(d => new Date(d.event_date)));
    }
    return dates.sort((a, b) => a.getTime() - b.getTime());
  };

  interface EventDateCard {
    event: Event;
    displayDate: Date;
    allDates: Date[];
  }

  const upcomingEventCards: EventDateCard[] = [];
  const now = new Date();

  events.forEach(event => {
    const allDates = getAllEventDates(event);
    
    allDates.forEach(date => {
      // Check if this date is upcoming
      const isUpcoming = date >= now;
      
      // If expires_after_date is true, only show if the date hasn't passed
      // If expires_after_date is false, show the event even if the date has passed
      const shouldShow = event.expires_after_date ? isUpcoming : true;
      
      if (shouldShow && isUpcoming) {
        upcomingEventCards.push({
          event,
          displayDate: date,
          allDates
        });
      }
    });
  });

  upcomingEventCards.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            <p className="text-muted-foreground mt-4">Loading events...</p>
          </div>
        </div>
      </section>
    );
  }

  if (upcomingEventCards.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Upcoming <span className="bg-gradient-text bg-clip-text text-transparent">Events</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join us for exciting events and activities in our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEventCards.slice(0, 6).map((card) => {
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
                      <TextToSpeech text={`${event.title}. ${event.description}. Date: ${format(displayDate, "PPPP")} at ${format(displayDate, "p")}${event.location ? `. Location: ${event.location}` : ''}`} />
                    </div>
                    
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
                    
                    <p className="text-muted-foreground line-clamp-3">
                      {event.description}
                    </p>

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
        </div>
      </section>

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
    </>
  );
}
