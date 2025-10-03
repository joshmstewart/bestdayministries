import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface FeaturedItemData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link_url: string;
  link_text: string;
}

export const FeaturedItem = () => {
  const [items, setItems] = useState<FeaturedItemData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    loadFeaturedItems();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      resolveUrl();
    }
  }, [items, currentIndex]);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, [items.length]);

  const loadFeaturedItems = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading featured items:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveUrl = () => {
    const item = items[currentIndex];
    if (!item) return;

    if (item.link_url.startsWith("event:")) {
      setResolvedUrl(`/events`);
    } else if (item.link_url.startsWith("album:")) {
      setResolvedUrl(`/gallery`);
    } else if (item.link_url.startsWith("post:")) {
      setResolvedUrl(`/discussions`);
    } else {
      setResolvedUrl(item.link_url);
    }
  };

  if (loading || items.length === 0) return null;

  const currentItem = items[currentIndex];
  const isExternalLink = resolvedUrl.startsWith("http");

  return (
    <Card className="mb-8 overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div key={currentIndex} className="animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {currentItem.image_url && (
              <div className="w-full md:w-1/3 flex-shrink-0">
                <img
                  src={currentItem.image_url}
                  alt={currentItem.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-3">{currentItem.title}</h2>
              <p className="text-muted-foreground mb-4">{currentItem.description}</p>
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
          <div className="flex justify-center gap-2 mt-6">
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
        )}
      </CardContent>
    </Card>
  );
};
