import { useState, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Youtube, Link2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VideoUploadProgress, UploadProgress } from "@/components/VideoUploadProgress";
import { compressVideo, isCompressionSupported, shouldCompress } from "@/lib/videoCompression";
import { uploadWithProgress, createUploadPath } from "@/lib/videoUpload";

interface Video {
  id: string;
  title: string;
  video_url: string;
}

interface AddVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoAdded: (video: {
    type: 'upload' | 'youtube' | 'existing';
    url?: string;
    youtubeUrl?: string;
    videoId?: string;
    caption?: string;
  }) => void;
  existingVideos: Video[];
}

export function AddVideoDialog({
  open,
  onOpenChange,
  onVideoAdded,
  existingVideos
}: AddVideoDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube' | 'existing'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("none");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetForm = () => {
    setYoutubeUrl("");
    setSelectedVideoId("none");
    setCaption("");
    setUploadedFile(null);
    setActiveTab('youtube');
    setUploadProgress(null);
  };

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resetForm();
    onOpenChange(false);
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(null);
  };

  const handleRetryUpload = () => {
    setUploadProgress(null);
    // User can click submit again
  };

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
      /youtube\.com\/shorts\/([^&\?\/]+)/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async () => {
    if (activeTab === 'youtube') {
      if (!youtubeUrl.trim()) {
        toast.error("Please enter a YouTube URL");
        return;
      }
      if (!validateYouTubeUrl(youtubeUrl)) {
        toast.error("Please enter a valid YouTube URL");
        return;
      }
      onVideoAdded({
        type: 'youtube',
        youtubeUrl: youtubeUrl.trim(),
        caption: caption.trim() || undefined
      });
      handleClose();
    } else if (activeTab === 'existing') {
      if (selectedVideoId === "none") {
        toast.error("Please select a video");
        return;
      }
      const selectedVideo = existingVideos.find(v => v.id === selectedVideoId);
      if (!selectedVideo) {
        toast.error("Video not found");
        return;
      }
      onVideoAdded({
        type: 'existing',
        videoId: selectedVideoId,
        url: selectedVideo.video_url,
        caption: caption.trim() || selectedVideo.title
      });
      handleClose();
    } else if (activeTab === 'upload') {
      if (!uploadedFile) {
        toast.error("Please select a video file");
        return;
      }
      
      setUploading(true);
      abortControllerRef.current = new AbortController();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        let fileToUpload = uploadedFile;
        const originalSize = uploadedFile.size;

        // Compress if needed and supported
        if (shouldCompress(uploadedFile) && isCompressionSupported()) {
          try {
            fileToUpload = await compressVideo(uploadedFile, {
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
          } catch (compressError) {
            console.warn('Compression failed, uploading original:', compressError);
            toast.warning("Compression skipped, uploading original file");
          }
        } else if (shouldCompress(uploadedFile) && !isCompressionSupported()) {
          toast.warning("Video compression not supported in this browser");
        }

        // Upload with progress tracking
        const fileName = createUploadPath(user.id, fileToUpload.name);
        
        setUploadProgress({
          stage: 'uploading',
          progress: 0,
          message: 'Starting upload...',
          originalSize,
          compressedSize: fileToUpload.size,
        });

        const publicUrl = await uploadWithProgress('videos', fileName, fileToUpload, {
          signal: abortControllerRef.current.signal,
          timeoutMs: 300000, // 5 minutes
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

        setUploadProgress({
          stage: 'done',
          progress: 100,
          message: 'Upload complete!',
          originalSize,
          compressedSize: fileToUpload.size,
        });

        onVideoAdded({
          type: 'upload',
          url: publicUrl,
          caption: caption.trim() || undefined
        });

        // Short delay to show completion state
        setTimeout(() => {
          handleClose();
        }, 500);
        
      } catch (error: any) {
        console.error("Error uploading video:", error);
        if (error.message !== 'Upload cancelled') {
          setUploadProgress({
            stage: 'error',
            progress: 0,
            message: 'Upload failed',
            error: error.message || 'Please try again',
          });
          toast.error(error.message || "Failed to upload video");
        }
      } finally {
        setUploading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      // Allow larger files now that we have compression
      if (file.size > 500 * 1024 * 1024) { // 500MB limit for input
        toast.error("Video file must be under 500MB");
        return;
      }
      setUploadedFile(file);
      setUploadProgress(null);
      
      // Show file size info
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      if (shouldCompress(file) && isCompressionSupported()) {
        toast.success(`Video selected (${sizeMB}MB) - will be optimized before upload`);
      } else {
        toast.success(`Video selected (${sizeMB}MB)`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Add Video to Album
          </DialogTitle>
          <DialogDescription>
            Add a video from YouTube, upload a file, or link an existing video from your library.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="flex items-center gap-1" disabled={uploading}>
              <Youtube className="w-4 h-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1" disabled={uploading}>
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-1" disabled={uploading}>
              <Link2 className="w-4 h-4" />
              Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Paste any YouTube video or Shorts URL
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Video File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadedFile ? uploadedFile.name : "Select Video File"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Large videos will be automatically optimized for web playback.
                Supports MP4, MOV, WebM up to 500MB.
              </p>
            </div>

            {uploadProgress && (
              <VideoUploadProgress
                progress={uploadProgress}
                onCancel={handleCancelUpload}
                onRetry={handleRetryUpload}
              />
            )}
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select from Video Library</Label>
              <Select value={selectedVideoId} onValueChange={setSelectedVideoId} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a video" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a video...</SelectItem>
                  {existingVideos.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {existingVideos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No videos in library. Upload videos in Admin → Videos first.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="video-caption">Caption (Optional)</Label>
          <Input
            id="video-caption"
            placeholder="Add a caption for this video..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={uploading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading && uploadProgress?.stage !== 'error'}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading && !uploadProgress ? "Processing..." : "Add Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
