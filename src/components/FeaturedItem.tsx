import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { TextToSpeech } from "@/components/TextToSpeech";
import { formatEventTime, formatEventDateFull } from "@/lib/eventTimezone";

interface FeaturedItemData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  aspect_ratio: string;
  link_url: string;
  link_text: string;
  is_public: boolean;
  visible_to_roles: string[];
  display_locations: string[] | null;
}

interface EventDetails {
  event_date: string;
  location: string | null;
  event_timezone?: string;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
}

interface FeaturedItemProps {
  canLoad?: boolean;
  onLoadComplete?: () => void;
  location?: 'landing' | 'community';
}

const FeaturedItemCard = ({
  item,
  savedLocations,
}: {
  item: FeaturedItemData;
  savedLocations: SavedLocation[];
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (item.link_url.startsWith("event:")) {
        setResolvedUrl(`/events`);
        const eventId = item.link_url.replace("event:", "");
        const { data: eventData } = await supabase
          .from("events")
          .select("event_date, location, event_timezone")
          .eq("id", eventId)
          .maybeSingle();
        if (!cancelled) setEventDetails(eventData);
      } else {
        setEventDetails(null);
        if (item.link_url.startsWith("album:")) {
          setResolvedUrl(`/gallery`);
        } else if (item.link_url.startsWith("post:")) {
          setResolvedUrl(`/discussions`);
        } else {
          setResolvedUrl(item.link_url);
        }
      }
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [item.link_url]);

  const isExternalLink = resolvedUrl.startsWith("http");

  return (
    <Card className="mb-6 overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {item.image_url && (
            <div className="w-full md:w-5/12 flex-shrink-0">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-start gap-2 mb-3">
              <h2 className="text-2xl font-bold flex-1">{item.title}</h2>
              <TextToSpeech text={`${item.title}. ${item.description}`} />
            </div>
            <p className="text-muted-foreground mb-4">{item.description}</p>

            {eventDetails && (
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formatEventDateFull(new Date(eventDetails.event_date), eventDetails.event_timezone || 'America/Denver')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatEventTime(new Date(eventDetails.event_date), eventDetails.event_timezone || 'America/Denver')}</span>
                </div>
                {eventDetails.location && (() => {
                  const matchedLocation = savedLocations.find(
                    loc => loc.address.toLowerCase() === eventDetails.location?.toLowerCase()
                  );
                  return (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {matchedLocation ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{matchedLocation.name}</span>
                          <span className="text-sm">{matchedLocation.address}</span>
                        </div>
                      ) : (
                        <span>{eventDetails.location}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {resolvedUrl && (
              isExternalLink ? (
                <Button asChild>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    {item.link_text}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild>
                  <Link to={resolvedUrl}>{item.link_text}</Link>
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const FeaturedItem = ({ canLoad = true, onLoadComplete, location = 'landing' }: FeaturedItemProps = {}) => {
  const [items, setItems] = useState<FeaturedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  useEffect(() => {
    if (canLoad) {
      loadData();
      loadSavedLocations();
    }
  }, [canLoad]);

  const loadSavedLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_locations")
        .select("id, name, address")
        .eq("is_active", true);
      if (error) throw error;
      setSavedLocations(data || []);
    } catch (error) {
      console.error("Error loading saved locations:", error);
    }
  };

  const loadData = async () => {
    try {
      const [authResult, itemsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("featured_items")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
      ]);

      const user = authResult.data?.user;

      let filteredItems = (itemsResult.data || []).filter((item: any) => {
        const locs = item.display_locations;
        if (!locs || locs.length === 0) return true;
        return locs.includes(location);
      });

      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const role = roleData?.role || null;

        if (role && !['admin', 'owner'].includes(role)) {
          filteredItems = filteredItems.filter(item =>
            item.is_public || item.visible_to_roles?.includes(role)
          );
        }
      } else {
        filteredItems = filteredItems.filter(item => item.is_public);
      }

      setItems(filteredItems);
    } catch (error) {
      console.error("Error loading featured items:", error);
    } finally {
      setLoading(false);
      onLoadComplete?.();
    }
  };

  if (loading) {
    return (
      <Card className="mb-8 overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-5/12 flex-shrink-0">
              <div className="w-full h-56 md:h-64 bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="h-8 bg-muted/50 rounded animate-pulse w-3/4" />
              <div className="h-20 bg-muted/50 rounded animate-pulse" />
              <div className="h-10 bg-muted/50 rounded animate-pulse w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="animate-fade-in">
      {items.map((item) => (
        <FeaturedItemCard
          key={item.id}
          item={item}
          savedLocations={savedLocations}
        />
      ))}
    </div>
  );
};

export default FeaturedItem;
