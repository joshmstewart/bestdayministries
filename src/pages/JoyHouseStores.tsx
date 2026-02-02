import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Clock, ExternalLink, ShoppingBag, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeStoreHours, type StoreDayHours } from "@/lib/storeHours";

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hours: StoreDayHours[];
  hours_vary_seasonally: boolean;
  description: string;
}

interface StoreImage {
  id: string;
  location_id: string | null;
  image_url: string;
  caption: string;
}

interface PageContent {
  hero_heading: string;
  hero_subheading: string;
  hero_image_url: string;
  history_title: string;
  history_content: string;
  online_store_title: string;
  online_store_description: string;
  online_store_button_text: string;
  online_store_link: string;
}

const JoyHouseStores = () => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<PageContent | null>(null);
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [images, setImages] = useState<StoreImage[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentRes, locationsRes, imagesRes] = await Promise.all([
        supabase
          .from("joy_house_stores_content")
          .select("setting_value")
          .eq("setting_key", "page_content")
          .maybeSingle(),
        supabase
          .from("joy_house_store_locations")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("joy_house_store_images")
          .select("*")
          .order("display_order"),
      ]);

      if (contentRes.data?.setting_value) {
        const parsed = typeof contentRes.data.setting_value === "string"
          ? JSON.parse(contentRes.data.setting_value)
          : contentRes.data.setting_value;
        setContent(parsed);
      }

      if (locationsRes.data) {
        setLocations(
          locationsRes.data.map((loc) => ({
            ...loc,
            hours: normalizeStoreHours(loc.hours),
            hours_vary_seasonally: loc.hours_vary_seasonally ?? false,
          })) as StoreLocation[]
        );
      }

      if (imagesRes.data) {
        setImages(imagesRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsUrl = (location: StoreLocation) => {
    const query = encodeURIComponent(`${location.address}, ${location.city}, ${location.state} ${location.zip}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getLocationImages = (locationId: string) => {
    return images.filter(img => img.location_id === locationId);
  };

  const galleryImages = images.filter(img => !img.location_id);

  // Content loading skeleton (header handles its own loading state)
  const ContentSkeleton = () => (
    <div className="container mx-auto px-4 py-12">
      <Skeleton className="h-64 w-full mb-8" />
      <Skeleton className="h-8 w-1/3 mb-4" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <UnifiedHeader />
      <main className="flex-1 pt-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        {loading ? (
          <ContentSkeleton />
        ) : (
          <>
            {/* Hero Section - More compact */}
            <section className="relative">
              {content?.hero_image_url && (
                <div className="absolute inset-0">
                  <img
                    src={content.hero_image_url}
                    alt="Joy House Stores"
                    className="w-full h-full object-cover opacity-20"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
                </div>
              )}
              <div className="container mx-auto px-4 py-6 md:py-8 relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                  <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {content?.hero_heading || "Joy House Stores"}
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground">
                    {content?.hero_subheading || "Visit our physical store locations"}
                  </p>
                </div>
              </div>
            </section>

            {/* History Section - More compact */}
            {content?.history_content && (
              <section className="py-6 md:py-8">
                <div className="container mx-auto px-4">
                  <div className="max-w-3xl mx-auto">
                    <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">
                      {content.history_title || "Our Story"}
                    </h2>
                    <div className="prose max-w-none text-muted-foreground text-sm md:text-base">
                      {content.history_content.split('\n').map((para, idx) => (
                        <p key={idx} className="mb-2">{para}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Online Store CTA - Moved above Visit Us */}
            <section className="py-6 md:py-8 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto text-center">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold mb-2">
                    {content?.online_store_title || "Shop Online!"}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base mb-4">
                    {content?.online_store_description || "Visit our online store for the same great products, delivered right to your door."}
                  </p>
                  <Button asChild size="default" className="gap-2 bg-gradient-warm">
                    <Link to={content?.online_store_link || "/joyhousestore"}>
                      {content?.online_store_button_text || "Visit Online Store"}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            {/* Gallery Section - More compact */}
            {galleryImages.length > 0 && (
              <section className="py-6 md:py-8 bg-muted/30">
                <div className="container mx-auto px-4">
                  <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">Our Stores</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {galleryImages.slice(0, 8).map((img) => (
                      <div key={img.id} className="aspect-square overflow-hidden rounded-lg">
                        <img
                          src={img.image_url}
                          alt={img.caption || "Joy House Store"}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Locations Section - More compact */}
            <section className="py-6 md:py-8">
              <div className="container mx-auto px-4">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">Visit Our Stores</h2>
                {locations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Store locations coming soon!</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map((location) => {
                      const locationImages = getLocationImages(location.id);
                      return (
                        <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          {locationImages.length > 0 && (
                            <div className="aspect-video overflow-hidden">
                              <img
                                src={locationImages[0].image_url}
                                alt={location.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <h3 className="text-lg font-semibold mb-2">{location.name}</h3>
                            
                            {location.description && (
                              <p className="text-muted-foreground mb-3 text-sm">
                                {location.description}
                              </p>
                            )}

                            <div className="space-y-2">
                              {/* Address */}
                              <a
                                href={getGoogleMapsUrl(location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 text-sm hover:text-primary transition-colors group"
                              >
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span className="group-hover:underline">
                                  {location.address}
                                  <br />
                                  {location.city}, {location.state} {location.zip}
                                </span>
                              </a>

                              {/* Phone */}
                              {location.phone && (
                                <a
                                  href={`tel:${location.phone.replace(/\D/g, '')}`}
                                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                                >
                                  <Phone className="w-4 h-4 flex-shrink-0" />
                                  {location.phone}
                                </a>
                              )}

                              {/* Hours */}
                              {location.hours && location.hours.length > 0 && (
                                <div className="flex items-start gap-2 text-sm">
                                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <div className="space-y-0.5">
                                    {location.hours.map((hour) => (
                                      <div key={hour.day} className="flex justify-between gap-4">
                                        <span className="font-medium">{hour.day}</span>
                                        <span className="text-muted-foreground">
                                          {hour.open === "Closed" ? "Closed" : `${hour.open} - ${hour.close}`}
                                        </span>
                                      </div>
                                    ))}
                                    {location.hours_vary_seasonally && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        * Hours may vary seasonally
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button
                              asChild
                              variant="outline"
                              className="w-full mt-3 gap-2"
                            >
                              <a href={getGoogleMapsUrl(location)} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                                Get Directions
                              </a>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default JoyHouseStores;
