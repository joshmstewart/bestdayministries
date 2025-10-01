import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import Footer from "@/components/Footer";
import ImageCarousel from "@/components/ImageCarousel";
import AudioPlayer from "@/components/AudioPlayer";
import { UnifiedHeader } from "@/components/UnifiedHeader";

interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  updated_at: string;
  audio_url: string | null;
  is_post: boolean;
  event: { title: string; event_date: string } | null;
  images: { id: string; image_url: string; caption: string | null }[];
}

const GalleryPage = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    const { data: albumsData } = await supabase
      .from("albums")
      .select(`
        *,
        event:events(title, event_date)
      `)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (albumsData) {
      const albumsWithImages = await Promise.all(
        albumsData.map(async (album) => {
          const { data: images } = await supabase
            .from("album_images")
            .select("id, image_url, caption")
            .eq("album_id", album.id)
            .order("display_order", { ascending: true });

          return { ...album, images: images || [] };
        })
      );
      setAlbums(albumsWithImages);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading albums...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              Photo <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Albums</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our collection of memories and moments
            </p>
          </div>

          {albums.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No albums available yet</p>
          ) : (
            <div className="space-y-12">
              {albums.map((album) => (
                <Card key={album.id} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold">{album.title}</h2>
                      {album.description && (
                        <p className="text-muted-foreground">{album.description}</p>
                      )}
                      {album.event && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{album.event.title}</span>
                          <span>•</span>
                          <span>{new Date(album.event.event_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {album.audio_url && (
                      <AudioPlayer src={album.audio_url} />
                    )}
                    
                    {album.images.length > 0 && (
                      <ImageCarousel
                        images={album.images}
                        autoPlay={false}
                      />
                    )}
                    
                    <p className="text-xs text-muted-foreground text-right">
                      Updated {new Date(album.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;
