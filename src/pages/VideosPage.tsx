import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  created_at: string;
}

const VideosPage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group videos by category
  const groupedVideos = videos.reduce((acc, video) => {
    const category = video.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            Our Videos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch stories, events, and moments from our Best Day community
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No videos available yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedVideos).map(([category, categoryVideos]) => (
              <div key={category}>
                <h2 className="text-2xl font-bold mb-6 text-foreground">
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryVideos.map((video) => (
                    <Card
                      key={video.id}
                      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="aspect-video relative group">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <div className="text-6xl">🎥</div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-primary border-b-8 border-b-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Video Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
            {selectedVideo?.description && (
              <DialogDescription>{selectedVideo.description}</DialogDescription>
            )}
          </DialogHeader>
          {selectedVideo && (
            <div className="mt-4">
              <VideoPlayer
                src={selectedVideo.video_url}
                poster={selectedVideo.thumbnail_url || undefined}
                className="w-full aspect-video"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default VideosPage;
