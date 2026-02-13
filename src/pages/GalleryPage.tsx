import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ImageIcon, MessageSquare } from "lucide-react";
import Footer from "@/components/Footer";
import AlbumDetailDialog from "@/components/AlbumDetailDialog";
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
  images: { id: string; image_url: string | null; video_url: string | null; video_type: string | null; youtube_url: string | null; caption: string | null }[];
  linkedPost?: { id: string; title: string } | null;
}

const GalleryPage = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

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
            .select("id, image_url, video_url, video_type, youtube_url, caption")
            .eq("album_id", album.id)
            .order("display_order", { ascending: true });

          // Check if there's a discussion post linked to this album
          const { data: linkedPost } = await supabase
            .from("discussion_posts")
            .select("id, title")
            .eq("album_id", album.id)
            .eq("is_moderated", true)
            .maybeSingle();

          return { ...album, images: images || [], linkedPost };
        })
      );
      setAlbums(albumsWithImages);
    }
    setLoading(false);
  };

  const openAlbumDetail = (album: Album) => {
    setSelectedAlbum(album);
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
      <main className="flex-1 container mx-auto px-4 pt-20 pb-12">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {albums.map((album) => {
                const coverImage = album.cover_image_url || album.images[0]?.image_url;
                return (
                  <Card
                    key={album.id}
                    className="group cursor-pointer overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg"
                    onClick={() => openAlbumDetail(album)}
                  >
                    <div className="aspect-square relative bg-muted">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      {album.images.length > 0 && (
                        <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                          {album.images.length} {album.images.length === 1 ? 'photo' : 'photos'}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm line-clamp-1">{album.title}</h3>
                      {album.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {album.description}
                        </p>
                      )}
                      {album.event && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Calendar className="w-3 h-3" />
                          <span className="line-clamp-1">{new Date(album.event.event_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {album.linkedPost && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/discussions');
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          View Discussion
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <AlbumDetailDialog
            albumId={selectedAlbum?.id || null}
            albumTitle={selectedAlbum?.title}
            images={selectedAlbum?.images.filter(img => img.image_url || img.video_url || img.youtube_url).map(img => ({ image_url: img.image_url, video_url: img.video_url, video_type: img.video_type, youtube_url: img.youtube_url, caption: img.caption })) || []}
            isOpen={!!selectedAlbum}
            onClose={() => setSelectedAlbum(null)}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;
