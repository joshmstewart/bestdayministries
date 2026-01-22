import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pause, Play, ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { TextToSpeech } from "@/components/TextToSpeech";
import { format } from "date-fns";

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
}

interface EventDetails {
  event_date: string;
  location: string | null;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
}

interface FeaturedItemProps {
  canLoad?: boolean;
  onLoadComplete?: () => void;
}

export const FeaturedItem = ({ canLoad = true, onLoadComplete }: FeaturedItemProps = {}) => {
  const [items, setItems] = useState<FeaturedItemData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const autoAdvanceRef = useRef(false);

  useEffect(() => {
    if (canLoad) {
      loadData();
      loadSavedLocations();
    }
  }, [canLoad]);

  useEffect(() => {
    if (items.length > 0) {
      resolveUrl();
    }
  }, [items, currentIndex]);

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      autoAdvanceRef.current = true;
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  // Pause autoplay when user manually changes slides
  useEffect(() => {
    if (!autoAdvanceRef.current && currentIndex !== 0) {
      setIsPaused(true);
    }
    autoAdvanceRef.current = false;
  }, [currentIndex]);

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
      // Parallelize auth check and initial data fetch
      const [authResult, itemsResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("featured_items")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
      ]);

      const user = authResult.data?.user;
      setIsAuthenticated(!!user);

      let filteredItems = itemsResult.data || [];

      if (user) {
        // Fetch role from user_roles table (security requirement)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        
        const role = roleData?.role || null;
        setUserRole(role);

        // Filter items based on role
        if (role && !['admin', 'owner'].includes(role)) {
          filteredItems = filteredItems.filter(item => 
            item.is_public || item.visible_to_roles?.includes(role)
          );
        }
        // Admin and owner see everything
      } else {
        setUserRole(null);
        // Only show public items to non-authenticated users
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

  const resolveUrl = async () => {
    const item = items[currentIndex];
    if (!item) return;

    if (item.link_url.startsWith("event:")) {
      setResolvedUrl(`/events`);
      // Fetch event details
      const eventId = item.link_url.replace("event:", "");
      const { data: eventData } = await supabase
        .from("events")
        .select("event_date, location")
        .eq("id", eventId)
        .maybeSingle();
      
      setEventDetails(eventData);
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

  const currentItem = items[currentIndex];
  const isExternalLink = resolvedUrl.startsWith("http");

  // Reset image loaded state when switching items
  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <Card className="mb-8 overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div key={currentIndex} className="animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {currentItem.image_url && (
              <div className="w-full md:w-5/12 flex-shrink-0">
                <img
                  src={currentItem.image_url}
                  alt={currentItem.title}
                  className="w-full h-auto rounded-lg"
                  onLoad={handleImageLoad}
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-start gap-2 mb-3">
                <h2 className="text-2xl font-bold flex-1">{currentItem.title}</h2>
                <TextToSpeech text={`${currentItem.title}. ${currentItem.description}`} />
              </div>
              <p className="text-muted-foreground mb-4">{currentItem.description}</p>
              
              {eventDetails && (
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(eventDetails.event_date), "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(eventDetails.event_date), "h:mm a")}</span>
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
              
              {isExternalLink ? (
                <Button asChild>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    {currentItem.link_text}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild>
                  <Link to={resolvedUrl}>{currentItem.link_text}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {items.length > 1 && (
          <div className="flex justify-center items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
              className="h-8 w-8"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8"
              aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <div className="flex gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "w-8 bg-primary"
                      : "w-2 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
              className="h-8 w-8"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedItem;
