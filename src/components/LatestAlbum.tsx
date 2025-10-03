import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Images, Calendar, ArrowRight } from "lucide-react";
import ImageCarousel from "./ImageCarousel";
import AudioPlayer from "./AudioPlayer";
import { TextToSpeech } from "./TextToSpeech";

interface Album {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  created_at: string;
  audio_url: string | null;
  event?: {
    title: string;
    event_date: string;
  } | null;
  images: { image_url: string; caption: string | null }[];
}

export default function LatestAlbum() {
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLatestAlbum();
  }, []);

  const loadLatestAlbum = async () => {
    const { data: albumData, error: albumError } = await supabase
      .from("albums")
      .select(`
        *,
        event:events(title, event_date)
      `)
      .eq("is_active", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (albumError || !albumData) {
      setLoading(false);
      return;
    }

    // Fetch images for this album
    const { data: images, error: imagesError } = await supabase
      .from("album_images")
      .select("image_url, caption")
      .eq("album_id", albumData.id)
      .order("display_order", { ascending: true });

    if (!imagesError && images) {
      setAlbum({ ...albumData, images });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (!album || album.images.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-float" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
            <Images className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Latest Album</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-foreground">
            Recent{" "}
            <span className="bg-gradient-text bg-clip-text text-transparent">
              Memories
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our latest photo collection
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-warm">
            <ImageCarousel 
              images={album.images} 
              autoPlay={true}
              interval={4000}
              className="w-full"
            />
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-2">
                <div 
                  className="flex-1 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => navigate("/gallery")}
                >
                  <h3 className="text-2xl font-bold">{album.title}</h3>
                  {album.event && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Calendar className="w-4 h-4" />
                      <span>From: {album.event.title}</span>
                    </div>
                  )}
                </div>
                <TextToSpeech text={`${album.title}. ${album.description || ''}`} />
              </div>
              
              {album.description && (
                <p 
                  className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => navigate("/gallery")}
                >
                  {album.description}
                </p>
              )}

              {album.audio_url && (
                <div onClick={(e) => e.stopPropagation()}>
                  <AudioPlayer src={album.audio_url} />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {album.images.length} {album.images.length === 1 ? 'photo' : 'photos'}
                </span>
                <Button
                  variant="outline"
                  onClick={() => navigate("/gallery")}
                  className="gap-2"
                >
                  View All Albums
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
