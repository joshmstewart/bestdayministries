import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Video, Youtube, Library, Play, Check, Search, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { VideoManager, SavedVideoData } from "@/components/admin/VideoManager";

interface LibraryVideo {
  id: string;
  title: string;
  video_url: string;
  youtube_url?: string | null;
  video_type?: string;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
  category?: string | null;
}

export interface VideoPickerResult {
  type: 'upload' | 'youtube' | 'library';
  videoId?: string;
  url?: string;
  youtubeUrl?: string;
  caption?: string;
  thumbnailUrl?: string;
}

interface VideoLibraryPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoSelected: (video: VideoPickerResult) => void;
}

export function VideoLibraryPickerDialog({
  open,
  onOpenChange,
  onVideoSelected,
}: VideoLibraryPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'youtube' | 'upload'>('library');
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadVideos();
      setSelectedVideoId(null);
      setYoutubeUrl("");
      setCaption("");
      setSearchQuery("");
    }
  }, [open]);

  const loadVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, video_url, youtube_url, video_type, cover_url, thumbnail_url, description, category")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading videos:", error);
      toast.error("Failed to load video library");
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /youtube\.com\/shorts\/([^&\?\/]+)/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const getThumbnail = (video: LibraryVideo): string | null => {
    if (video.cover_url) return video.cover_url;
    if (video.thumbnail_url) return video.thumbnail_url;
    if (video.youtube_url || video.video_type === 'youtube') {
      const match = (video.youtube_url || '').match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/
      );
      if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const handleSelectLibraryVideo = () => {
    if (!selectedVideoId) {
      toast.error("Please select a video");
      return;
    }
    const video = videos.find(v => v.id === selectedVideoId);
    if (!video) return;

    const isYouTube = video.video_type === 'youtube';
    onVideoSelected({
      type: isYouTube ? 'youtube' : 'library',
      videoId: video.id,
      url: video.video_url || undefined,
      youtubeUrl: video.youtube_url || undefined,
      caption: caption.trim() || video.title,
      thumbnailUrl: video.cover_url || video.thumbnail_url || undefined,
    });
    onOpenChange(false);
  };

  const handleAddYouTube = () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    if (!validateYouTubeUrl(youtubeUrl)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    onVideoSelected({
      type: 'youtube',
      youtubeUrl: youtubeUrl.trim(),
      caption: caption.trim() || undefined,
    });
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (activeTab === 'library') {
      handleSelectLibraryVideo();
    } else if (activeTab === 'youtube') {
      handleAddYouTube();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Add Video to Album
          </DialogTitle>
          <DialogDescription>
            Select from your library, upload a new video, or paste a YouTube URL.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-1">
              <Library className="w-4 h-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Upload New
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-1">
              <Youtube className="w-4 h-4" />
              YouTube
            </TabsTrigger>
          </TabsList>

          {/* Library tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 max-h-[40vh] border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Video className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No videos match your search" : "No videos in library yet"}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={() => setActiveTab('upload')}
                  >
                    Upload your first video →
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
                  {filteredVideos.map((video) => {
                    const thumbnail = getThumbnail(video);
                    const isSelected = selectedVideoId === video.id;
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setSelectedVideoId(isSelected ? null : video.id)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all text-left ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="aspect-video bg-muted relative">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-5 h-5 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                          {video.video_type === 'youtube' && (
                            <div className="absolute top-1 right-1">
                              <Youtube className="w-4 h-4 text-red-500 drop-shadow" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{video.title}</p>
                          {video.category && (
                            <p className="text-[10px] text-muted-foreground truncate">{video.category}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Upload New tab - renders the actual VideoManager */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-4 overflow-y-auto max-h-[50vh]">
            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <p className="text-sm text-muted-foreground">
                Upload a video below. It will be <strong>automatically added</strong> to the album once saved.
              </p>
            </div>
            <VideoManager onVideoSaved={(videoData?: SavedVideoData) => {
              if (videoData) {
                // Auto-add the uploaded video to the album
                const isYouTube = videoData.video_type === 'youtube';
                onVideoSelected({
                  type: isYouTube ? 'youtube' : 'upload',
                  videoId: videoData.id,
                  url: videoData.video_url || undefined,
                  youtubeUrl: videoData.youtube_url || undefined,
                  caption: videoData.title,
                  thumbnailUrl: videoData.cover_url || videoData.thumbnail_url || undefined,
                });
                onOpenChange(false);
                toast.success("Video uploaded and added to album!");
              } else {
                loadVideos();
                setActiveTab('library');
              }
            }} />
          </TabsContent>

          {/* YouTube tab */}
          <TabsContent value="youtube" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste any YouTube video or Shorts URL
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Caption + footer only for library/youtube tabs */}
        {activeTab !== 'upload' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="video-caption">Caption (Optional)</Label>
              <Input
                id="video-caption"
                placeholder="Add a caption for this video..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {activeTab === 'library' ? "Add Selected Video" : "Add YouTube Video"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
