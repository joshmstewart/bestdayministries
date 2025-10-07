import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Edit2, Save, X } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  video_type?: string;
  youtube_url?: string | null;
}

export const VideoManager = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [videoType, setVideoType] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error loading videos:", error);
      toast({
        variant: "destructive",
        title: "Error loading videos",
        description: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on video type
    if (videoType === "upload" && !videoFile && !editingId) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please provide a video file",
      });
      return;
    }
    
    if (videoType === "youtube" && !youtubeUrl) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please provide a YouTube URL",
      });
      return;
    }
    
    if (!title) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please provide a title",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let videoUrl = "";
      let thumbnailUrl = null;

      // Handle uploaded video
      if (videoType === "upload" && videoFile) {
        const videoExt = videoFile.name.split(".").pop();
        const videoPath = `${Date.now()}-${Math.random()}.${videoExt}`;
        const { error: videoError } = await supabase.storage
          .from("videos")
          .upload(videoPath, videoFile);

        if (videoError) throw videoError;

        const { data: { publicUrl } } = supabase.storage
          .from("videos")
          .getPublicUrl(videoPath);
        videoUrl = publicUrl;

        // Upload thumbnail if provided
        if (thumbnailFile) {
          const thumbExt = thumbnailFile.name.split(".").pop();
          const thumbPath = `thumbnails/${Date.now()}-${Math.random()}.${thumbExt}`;
          const { error: thumbError } = await supabase.storage
            .from("videos")
            .upload(thumbPath, thumbnailFile);

          if (!thumbError) {
            const { data: { publicUrl } } = supabase.storage
              .from("videos")
              .getPublicUrl(thumbPath);
            thumbnailUrl = publicUrl;
          }
        }
      }

      // Create video record
      const videoData: any = {
        title,
        description,
        category,
        is_active: isActive,
        video_type: videoType,
      };

      if (videoType === "upload") {
        if (videoUrl) videoData.video_url = videoUrl;
        if (thumbnailUrl) videoData.thumbnail_url = thumbnailUrl;
      } else {
        videoData.youtube_url = youtubeUrl;
      }

      if (editingId) {
        const { error } = await supabase
          .from("videos")
          .update(videoData)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        videoData.created_by = user.id;
        const { error } = await supabase.from("videos").insert(videoData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingId ? "Video updated successfully" : "Video added successfully",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("");
      setVideoFile(null);
      setThumbnailFile(null);
      setIsActive(true);
      setVideoType("upload");
      setYoutubeUrl("");
      setEditingId(null);
      loadVideos();
    } catch (error: any) {
      console.error("Error saving video:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Please try again",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setTitle(video.title);
    setDescription(video.description || "");
    setCategory(video.category || "");
    setIsActive(video.is_active);
    setVideoType((video.video_type as "upload" | "youtube") || "upload");
    setYoutubeUrl(video.youtube_url || "");
  };

  const handleDelete = async (id: string, videoUrl: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      // Extract path from URL
      const path = videoUrl.split("/videos/")[1];
      
      // Delete from storage
      await supabase.storage.from("videos").remove([path]);

      // Delete from database
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
      loadVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Please try again",
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setVideoFile(null);
    setThumbnailFile(null);
    setIsActive(true);
    setVideoType("upload");
    setYoutubeUrl("");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Video" : "Upload New Video"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Maximum file size: 250MB. Supported formats: MP4, WebM, OGG, MOV
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVideoUpload} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Events, Tutorials, Stories"
              />
            </div>

            <div>
              <Label htmlFor="videoType">Video Type *</Label>
              <Select value={videoType} onValueChange={(value: "upload" | "youtube") => setVideoType(value)}>
                <SelectTrigger id="videoType">
                  <SelectValue placeholder="Select video type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload Video File</SelectItem>
                  <SelectItem value="youtube">Embed YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {videoType === "upload" ? (
              <>
                <div>
                  <Label htmlFor="video">Video File *</Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    required={!editingId}
                  />
                </div>

                <div>
                  <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
                  <Input
                    id="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="youtubeUrl">YouTube URL *</Label>
                <Input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or video ID"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Paste the full YouTube URL or just the video ID
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    {editingId ? <Save className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                    {editingId ? "Update Video" : "Upload Video"}
                  </>
                )}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video) => (
          <Card key={video.id}>
            <CardContent className="p-4 space-y-3">
              {video.video_type === "youtube" && video.youtube_url ? (
                <YouTubeEmbed
                  url={video.youtube_url}
                  title={video.title}
                  className="w-full"
                />
              ) : (
                <VideoPlayer
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  title={video.title}
                  className="w-full"
                />
              )}
              <div>
                <h3 className="font-semibold">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {video.category && <span>Category: {video.category}</span>}
                  <span className="text-primary">
                    {video.video_type === "youtube" ? "YouTube" : "Upload"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(video)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(video.id, video.video_url)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
