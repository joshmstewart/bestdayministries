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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setYoutubeUrl("");
    setSelectedVideoId("none");
    setCaption("");
    setUploadedFile(null);
    setActiveTab('youtube');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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
    } else if (activeTab === 'upload') {
      if (!uploadedFile) {
        toast.error("Please select a video file");
        return;
      }
      
      setUploading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        
        // Upload to storage
        const sanitizedName = uploadedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);

        onVideoAdded({
          type: 'upload',
          url: publicUrl,
          caption: caption.trim() || undefined
        });
      } catch (error: any) {
        console.error("Error uploading video:", error);
        toast.error(error.message || "Failed to upload video");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    handleClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error("Please select a video file");
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error("Video file must be under 100MB");
        return;
      }
      setUploadedFile(file);
      toast.success("Video file selected");
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
            <TabsTrigger value="youtube" className="flex items-center gap-1">
              <Youtube className="w-4 h-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-1">
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
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadedFile ? uploadedFile.name : "Select Video File"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Max file size: 100MB. Supported formats: MP4, MOV, WebM
              </p>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select from Video Library</Label>
              <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
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
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? "Uploading..." : "Add Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
