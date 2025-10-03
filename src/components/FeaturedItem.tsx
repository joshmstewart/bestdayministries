import { useState, useEffect } from "react";
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
  const [item, setItem] = useState<FeaturedItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");

  useEffect(() => {
    loadFeaturedItem();
  }, []);

  useEffect(() => {
    if (item) {
      resolveUrl();
    }
  }, [item]);

  const loadFeaturedItem = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setItem(data);
    } catch (error) {
      console.error("Error loading featured item:", error);
    } finally {
      setLoading(false);
    }
  };

  const resolveUrl = () => {
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

  if (loading || !item) {
    return null;
  }

  const isExternalLink = resolvedUrl.startsWith("http");

  return (
    <Card className="mb-8 overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {item.image_url && (
            <div className="w-full md:w-1/3 flex-shrink-0">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-3">{item.title}</h2>
            <p className="text-muted-foreground mb-4">{item.description}</p>
            {isExternalLink ? (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
