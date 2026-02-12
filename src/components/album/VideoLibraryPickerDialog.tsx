import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { VideoUploadProgress, UploadProgress } from "@/components/VideoUploadProgress";
import { compressVideo, isCompressionSupported, shouldCompress, formatBytes } from "@/lib/videoCompression";
import { uploadWithProgress, createUploadPath } from "@/lib/videoUpload";

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

  // Upload tab state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      loadVideos();
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setSelectedVideoId(null);
    setYoutubeUrl("");
    setCaption("");
    setSearchQuery("");
    setUploadTitle("");
    setUploadDescription("");
    setUploadCategory("");
    setVideoFile(null);
    setUploading(false);
    setUploadProgress(null);
  };

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

  const handleUploadNewVideo = async () => {
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setUploading(true);
    abortControllerRef.current = new AbortController();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let fileToUpload = videoFile;
      const originalSize = videoFile.size;

      // Compress if needed
      if (shouldCompress(videoFile) && isCompressionSupported()) {
        try {
          fileToUpload = await compressVideo(videoFile, {
            quality: 'medium',
            maxWidth: 1920,
            onProgress: (progress) => {
              setUploadProgress({
                stage: progress.stage === 'loading' ? 'loading' : 'compressing',
                progress: progress.progress,
                message: progress.message,
                originalSize: progress.originalSize,
                compressedSize: progress.estimatedSize,
              });
            },
          });
        } catch {
          console.warn('Compression failed, uploading original');
        }
      }

      // Upload with progress
      const videoPath = createUploadPath(user.id, fileToUpload.name);
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Starting upload...',
        originalSize,
        compressedSize: fileToUpload.size,
      });

      const videoUrl = await uploadWithProgress('videos', videoPath, fileToUpload, {
        signal: abortControllerRef.current.signal,
        timeoutMs: 300000,
        onProgress: (event) => {
          setUploadProgress({
            stage: 'uploading',
            progress: event.percentage,
            message: `Uploading... ${Math.round(event.percentage)}%`,
            originalSize,
            compressedSize: fileToUpload.size,
            uploadedBytes: event.loaded,
            totalBytes: event.total,
          });
        },
      });

      // Save to videos table
      const { data: newVideo, error } = await supabase
        .from("videos")
        .insert({
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || null,
          category: uploadCategory.trim() || null,
          video_url: videoUrl,
          video_type: 'upload',
          is_active: true,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Video uploaded and added to library!");

      // Auto-select the newly uploaded video for the album
      onVideoSelected({
        type: 'library',
        videoId: newVideo.id,
        url: videoUrl,
        caption: caption.trim() || uploadTitle.trim(),
      });
      onOpenChange(false);
    } catch (error: any) {
      if (error.message !== 'Upload cancelled') {
        console.error("Upload error:", error);
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: 'Upload failed',
          error: error.message || 'Please try again',
        });
        toast.error(error.message || "Upload failed");
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(null);
  };

  const handleSubmit = () => {
    if (activeTab === 'library') {
      handleSelectLibraryVideo();
    } else if (activeTab === 'youtube') {
      handleAddYouTube();
    } else {
      handleUploadNewVideo();
    }
  };

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
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
            <TabsTrigger value="library" className="flex items-center gap-1" disabled={uploading}>
              <Library className="w-4 h-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1" disabled={uploading}>
              <Upload className="w-4 h-4" />
              Upload New
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-1" disabled={uploading}>
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

          {/* Upload New tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-4 space-y-3 overflow-y-auto max-h-[45vh]">
            {uploadProgress ? (
              <div className="p-4">
                <VideoUploadProgress
                  progress={uploadProgress}
                  onCancel={handleCancelUpload}
                  onRetry={() => setUploadProgress(null)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="upload-file">Video File *</Label>
                  <Input
                    id="upload-file"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setVideoFile(file);
                      if (file && !uploadTitle) {
                        setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
                      }
                    }}
                    disabled={uploading}
                  />
                  <p className="text-xs text-muted-foreground">Max 250MB. MP4, WebM, OGG, MOV</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-title">Title *</Label>
                  <Input
                    id="upload-title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Video title"
                    disabled={uploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-desc">Description</Label>
                  <Textarea
                    id="upload-desc"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={2}
                    disabled={uploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-cat">Category</Label>
                  <Input
                    id="upload-cat"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    placeholder="e.g., Events, Tutorials"
                    disabled={uploading}
                  />
                </div>
              </>
            )}
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

        {/* Caption field - shown for library and youtube tabs */}
        {activeTab !== 'upload' && (
          <div className="space-y-2">
            <Label htmlFor="video-caption">Caption (Optional)</Label>
            <Input
              id="video-caption"
              placeholder="Add a caption for this video..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {activeTab === 'library'
              ? "Add Selected Video"
              : activeTab === 'upload'
              ? uploading ? "Uploading..." : "Upload & Add"
              : "Add YouTube Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
