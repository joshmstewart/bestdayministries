import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Images, Upload, X, Trash2, Edit, ArrowLeft, GripVertical, Mic, Info, MessageSquare, Video, Play, Youtube, ChevronDown, ChevronRight } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import AudioRecorder from "@/components/AudioRecorder";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SortableMediaItem, AlbumMedia } from "@/components/album/SortableMediaItem";
import { VideoLibraryPickerDialog, VideoPickerResult } from "@/components/album/VideoLibraryPickerDialog";

interface Album {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  cover_image_url: string | null;
  created_at: string;
  audio_url: string | null;
  is_post: boolean;
  is_public: boolean;
  images?: AlbumMedia[];
  event?: { title: string } | null;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
}

export default function AlbumManagement() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState<string>("none");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>("");
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isPost, setIsPost] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [cropImageIndex, setCropImageIndex] = useState<number | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropExistingImage, setCropExistingImage] = useState<AlbumMedia | null>(null);
  const [editingCaption, setEditingCaption] = useState<AlbumMedia | null>(null);
  const [showCaptionDialog, setShowCaptionDialog] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [existingImages, setExistingImages] = useState<AlbumMedia[]>([]);
  const [visibleToRoles, setVisibleToRoles] = useState<Array<'caregiver' | 'bestie' | 'supporter' | 'admin' | 'owner'>>(['caregiver', 'bestie', 'supporter']);
  const [showAddVideoDialog, setShowAddVideoDialog] = useState(false);
  const [pendingVideos, setPendingVideos] = useState<VideoPickerResult[]>([]);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch role from user_roles table (security requirement)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check for admin-level access (owner role automatically has admin access)
    if (!roleData || (roleData.role !== "admin" && roleData.role !== "owner")) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadAlbums(), loadEvents()]);
  };

  const loadAlbums = async () => {
    setLoading(true);
    // Fetch albums and all images in parallel (eliminates N+1 query problem)
    const [albumsResult, imagesResult] = await Promise.all([
      supabase
        .from("albums")
        .select(`
          *,
          event:events(title)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("album_images")
        .select("*")
        .order("display_order", { ascending: true }),
    ]);

    if (albumsResult.error) {
      toast.error("Failed to load albums");
      console.error(albumsResult.error);
    } else {
      // Group images by album_id client-side
      const imagesByAlbum = new Map<string, AlbumMedia[]>();
      (imagesResult.data || []).forEach(img => {
        const mapped: AlbumMedia = {
          id: img.id,
          image_url: img.image_url,
          video_url: img.video_url,
          video_type: (img.video_type || 'image') as 'image' | 'upload' | 'youtube',
          youtube_url: img.youtube_url,
          video_id: img.video_id,
          caption: img.caption,
          display_order: img.display_order,
          original_image_url: img.original_image_url,
        };
        const list = imagesByAlbum.get(img.album_id) || [];
        list.push(mapped);
        imagesByAlbum.set(img.album_id, list);
      });

      const albumsWithImages = (albumsResult.data || []).map(album => ({
        ...album,
        images: imagesByAlbum.get(album.id) || [],
      }));
      setAlbums(albumsWithImages as Album[]);
    }
    setLoading(false);
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .order("event_date", { ascending: false });
    
    if (data) setEvents(data);
  };


  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }

    toast.success(`${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected`);
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
    setImageCaptions(prev => [...prev, ...new Array(imageFiles.length).fill("")]);

    // Read all files in order and wait for them to complete
    const previews = await Promise.all(
      imageFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    
    setImagePreviews(prev => [...prev, ...previews]);

    // Reset the input so the same files can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageCaptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCropImage = (index: number) => {
    setCropImageIndex(index);
    setShowCropDialog(true);
  };

  const handleCroppedImage = async (blob: Blob) => {
    if (cropImageIndex !== null) {
      // Convert blob to File
      const file = new File([blob], `cropped-${cropImageIndex}.jpg`, { type: "image/jpeg" });
      
      // Replace the image at the crop index
      setSelectedImages(prev => {
        const newImages = [...prev];
        newImages[cropImageIndex] = file;
        return newImages;
      });
      
      // Update preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
          const newPreviews = [...prev];
          newPreviews[cropImageIndex] = reader.result as string;
          return newPreviews;
        });
      };
      reader.readAsDataURL(blob);
      
      setCropImageIndex(null);
      toast.success("Image cropped successfully");
    } else if (cropExistingImage) {
      // Handle recropping existing image
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const compressedImage = await compressImage(blob as File, 4.5);
        const fileName = `${user.id}/${Date.now()}_recropped_${cropExistingImage.id}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("album-images")
          .upload(fileName, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("album-images")
          .getPublicUrl(fileName);

        // Update the image record
        const { error: updateError } = await supabase
          .from("album_images")
          .update({ image_url: publicUrl })
          .eq("id", cropExistingImage.id);

        if (updateError) throw updateError;

        // Find and update any albums using this image as their cover
        // We need to check against the OLD URL before it was updated
        const { data: albumsWithThisCover, error: queryError } = await supabase
          .from("albums")
          .select("id")
          .eq("cover_image_url", cropExistingImage.image_url);

        if (!queryError && albumsWithThisCover && albumsWithThisCover.length > 0) {
          // Update all albums that had this as their cover image
          const albumIds = albumsWithThisCover.map(a => a.id);
          const { error: albumUpdateError } = await supabase
            .from("albums")
            .update({ cover_image_url: publicUrl })
            .in("id", albumIds);

          if (albumUpdateError) {
            console.error("Error updating album covers:", albumUpdateError);
          }
        }

        // Immediately update the existingImages state with cache-busted URL
        setExistingImages(prev => 
          prev.map(img => 
            img.id === cropExistingImage.id 
              ? { ...img, image_url: `${publicUrl}?t=${Date.now()}` }
              : img
          )
        );

        // Also update the editing album's cover if this was the cover image
        if (editingAlbum?.cover_image_url === cropExistingImage.image_url) {
          setEditingAlbum(prev => prev ? { ...prev, cover_image_url: `${publicUrl}?t=${Date.now()}` } : null);
        }

        toast.success("Image recropped successfully");
        setCropExistingImage(null);
        
        // Reload albums to ensure everything is in sync
        loadAlbums();
      } catch (error: any) {
        console.error("Error recropping image:", error);
        toast.error(error.message || "Failed to recrop image");
      }
    }
  };

  const handleCropExistingImage = (media: AlbumMedia) => {
    setCropExistingImage(media);
    setShowCropDialog(true);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventId("none");
    setSelectedImages([]);
    setImagePreviews([]);
    setImageCaptions([]);
    setAudioFile(null);
    setAudioBlob(null);
    setAudioPreview("");
    setShowAudioRecorder(false);
    setIsPost(false);
    setIsPublic(true);
    setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
    setEditingAlbum(null);
    setExistingImages([]);
    setPendingVideos([]);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title || (selectedImages.length === 0 && pendingVideos.length === 0 && !editingAlbum?.images?.length && existingImages.length === 0)) {
      toast.error("Please provide a title and at least one image or video");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let albumId = editingAlbum?.id;
      let audioUrl = editingAlbum?.audio_url || null;

      // Upload audio if provided (either file or recorded)
      const audioToUpload = audioBlob || audioFile;
      if (audioToUpload) {
        const audioFileName = `${user.id}/${Date.now()}_album_audio.${audioBlob ? 'webm' : audioFile!.name.split('.').pop()}`;
        const { error: audioUploadError } = await supabase.storage
          .from("event-audio")
          .upload(audioFileName, audioToUpload);

        if (audioUploadError) throw audioUploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("event-audio")
          .getPublicUrl(audioFileName);

        audioUrl = publicUrl;
      }

      // Create or update album
      if (editingAlbum) {
        const { error } = await supabase
          .from("albums")
          .update({
            title,
            description: description || null,
            event_id: eventId === "none" ? null : eventId,
            audio_url: audioUrl,
            is_post: isPost,
            is_public: isPublic,
            visible_to_roles: visibleToRoles,
          })
          .eq("id", editingAlbum.id);

        if (error) throw error;
      } else {
        const { data: newAlbum, error } = await supabase
          .from("albums")
          .insert({
            title,
            description: description || null,
            event_id: eventId === "none" ? null : eventId,
            audio_url: audioUrl,
            is_post: isPost,
            is_public: isPublic,
            visible_to_roles: visibleToRoles,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        albumId = newAlbum.id;
      }

      // Upload images
      let coverImageUrl = editingAlbum?.cover_image_url || null;
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const compressedImage = await compressImage(file, 4.5);
        // Sanitize filename: replace spaces and special characters
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${user.id}/${Date.now()}_${sanitizedName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("album-images")
          .upload(fileName, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("album-images")
          .getPublicUrl(fileName);
        
        // Get the next display order (after existing images)
        const nextOrder = existingImages.length + i;
        
        // Insert image record
        const { error: imageError } = await supabase
          .from("album_images")
          .insert({
            album_id: albumId,
            image_url: publicUrl,
            original_image_url: publicUrl, // Save original for future re-cropping
            caption: imageCaptions[i] || null,
            display_order: nextOrder,
          });

        if (imageError) throw imageError;

        // Set first image as cover if creating new album and no existing images
        if (i === 0 && !editingAlbum && existingImages.length === 0) {
          await supabase
            .from("albums")
            .update({ cover_image_url: publicUrl })
            .eq("id", albumId);
          coverImageUrl = publicUrl;
        }
      }

      // Insert pending videos (for new albums or editing)
      for (let i = 0; i < pendingVideos.length; i++) {
        const pv = pendingVideos[i];
        const videoOrder = existingImages.length + selectedImages.length + i;
        const { error: videoError } = await supabase
          .from("album_images")
          .insert({
            album_id: albumId,
            video_type: pv.type === 'youtube' ? 'youtube' : 'upload',
            video_url: pv.url || null,
            youtube_url: pv.youtubeUrl || null,
            video_id: pv.videoId || null,
            caption: pv.caption || null,
            display_order: videoOrder,
          });
        if (videoError) throw videoError;
      }

      // If album is marked as a post, create or update the discussion post
      if (isPost && albumId) {
        // Use cover image or first existing image for the post
        const postImageUrl = coverImageUrl || existingImages[0]?.image_url || null;
        
        // Check if a post already exists for this album
        const { data: existingPost, error: checkError } = await supabase
          .from("discussion_posts")
          .select("id")
          .eq("album_id", albumId)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking for existing post:", checkError);
        }

        const postData = {
          title,
          content: description || `View the ${title} album`,
          author_id: user.id,
          image_url: postImageUrl,
          visible_to_roles: visibleToRoles,
          is_moderated: true,
          approval_status: 'approved',
          album_id: albumId,
        };

        if (existingPost) {
          // Update existing post
          const { error: updateError } = await supabase
            .from("discussion_posts")
            .update(postData)
            .eq("id", existingPost.id);
          
          if (updateError) {
            console.error("Error updating discussion post:", updateError);
            toast.error("Album saved but failed to update discussion post: " + updateError.message);
          }
        } else {
          // Create new post
          const { error: insertError } = await supabase
            .from("discussion_posts")
            .insert(postData);
          
          if (insertError) {
            console.error("Error creating discussion post:", insertError);
            toast.error("Album saved but failed to create discussion post: " + insertError.message);
          }
        }
      } else if (!isPost && albumId) {
        // If unchecked, delete any associated post
        const { error: deleteError } = await supabase
          .from("discussion_posts")
          .delete()
          .eq("album_id", albumId);
        
        if (deleteError) {
          console.error("Error deleting discussion post:", deleteError);
        }
      }

      toast.success(editingAlbum ? "Album updated successfully" : "Album created successfully");
      resetForm();
      loadAlbums();
    } catch (error: any) {
      console.error("Error saving album:", error);
      toast.error(error.message || "Failed to save album");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (album: Album) => {
    setEditingAlbum(album);
    setTitle(album.title);
    setDescription(album.description || "");
    setEventId(album.event_id || "none");
    setAudioPreview(album.audio_url || "");
    setAudioBlob(null);
    setShowAudioRecorder(false);
    setIsPost(album.is_post || false);
    setIsPublic(album.is_public ?? true);
    setVisibleToRoles((album as any).visible_to_roles || ['caregiver', 'bestie', 'supporter']);
    setExistingImages(album.images || []);
    setShowForm(true);
  };

  const handleDelete = async (albumId: string) => {
    if (!confirm("Are you sure you want to delete this album? This will delete all associated images.")) return;

    const { error } = await supabase
      .from("albums")
      .delete()
      .eq("id", albumId);

    if (error) {
      toast.error("Failed to delete album");
      console.error(error);
    } else {
      toast.success("Album deleted successfully");
      loadAlbums();
    }
  };

  const handleDeleteImage = async (imageId: string, albumId?: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const { error } = await supabase
        .from("album_images")
        .delete()
        .eq("id", imageId);

      if (error) throw error;

      toast.success("Image deleted successfully");
      
      // Update existing images in form if editing
      if (editingAlbum) {
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
      }
      
      loadAlbums();
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const handleEditCaption = (media: AlbumMedia) => {
    setEditingCaption(media);
    setNewCaption(media.caption || "");
    setShowCaptionDialog(true);
  };

  const handleSaveCaption = async () => {
    if (!editingCaption) return;

    try {
      const { error } = await supabase
        .from("album_images")
        .update({ caption: newCaption || null })
        .eq("id", editingCaption.id);

      if (error) throw error;

      toast.success("Caption updated successfully");
      
      // Update existing images in form if editing
      if (editingAlbum) {
        setExistingImages(prev => 
          prev.map(img => 
            img.id === editingCaption.id 
              ? { ...img, caption: newCaption || null }
              : img
          )
        );
      }
      
      setShowCaptionDialog(false);
      setEditingCaption(null);
      setNewCaption("");
      loadAlbums();
    } catch (error: any) {
      console.error("Error updating caption:", error);
      toast.error(error.message || "Failed to update caption");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = existingImages.findIndex((img) => img.id === active.id);
    const newIndex = existingImages.findIndex((img) => img.id === over.id);

    const reorderedImages = arrayMove(existingImages, oldIndex, newIndex);
    setExistingImages(reorderedImages);

    // Update display_order in database
    try {
      const updates = reorderedImages.map((img, index) => ({
        id: img.id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("album_images")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Image order updated");
      loadAlbums();
    } catch (error: any) {
      console.error("Error updating image order:", error);
      toast.error("Failed to update image order");
      // Revert on error
      setExistingImages(existingImages);
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    if (!editingAlbum) return;

    try {
      const { error } = await supabase
        .from("albums")
        .update({ cover_image_url: imageUrl })
        .eq("id", editingAlbum.id);

      if (error) throw error;

      toast.success("Cover image updated");
      setEditingAlbum({ ...editingAlbum, cover_image_url: imageUrl });
      loadAlbums();
    } catch (error: any) {
      console.error("Error setting cover:", error);
      toast.error("Failed to set cover image");
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading album management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>

          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Album Management</h1>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Add New Album"}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingAlbum ? "Edit Album" : "Create New Album"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Album title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Album description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event">Link to Event (Optional)</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} ({new Date(event.event_date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audio">Audio Description (for Besties)</Label>
                  
                  {!showAudioRecorder ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.type.startsWith("audio/")) {
                            setAudioFile(file);
                            setAudioBlob(null);
                            setAudioPreview(URL.createObjectURL(file));
                            toast.success("Audio file selected");
                          } else {
                            toast.error("Please select an audio file");
                          }
                        }}
                        className="hidden"
                        id="audio-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("audio-upload")?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {audioFile || audioPreview ? "Change Audio File" : "Upload Audio File"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAudioRecorder(true)}
                        >
                          <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
                          Record Audio
                        </Button>
                      </div>
                      {audioPreview && !audioBlob && (
                        <audio controls className="w-full mt-2">
                          <source src={audioPreview} />
                          Your browser does not support audio playback.
                        </audio>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {!audioBlob ? (
                        <>
                          <AudioRecorder
                            onRecordingComplete={(blob) => {
                              setAudioBlob(blob);
                              setAudioFile(null);
                              setAudioPreview("");
                            }}
                            onRecordingCancel={() => {
                              setShowAudioRecorder(false);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAudioRecorder(false)}
                            className="w-full"
                          >
                            Back to File Upload
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="p-4 border rounded-lg bg-muted/50">
                            <p className="text-sm font-medium mb-2">Recorded audio ready:</p>
                            <audio controls className="w-full">
                              <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setAudioBlob(null);
                              }}
                            >
                              Re-record
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setAudioBlob(null);
                                setShowAudioRecorder(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPost"
                    checked={isPost}
                    onChange={(e) => setIsPost(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="isPost" className="cursor-pointer">
                    Display as a post on community page
                  </Label>
                </div>

                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer font-medium">
                      {isPublic ? "Public Album" : "Private Album"}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Public:</strong> Visible on landing page and community page</p>
                          <p className="mt-1"><strong>Private:</strong> Only visible on community page (logged-in users)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label>Visible To (Admin & Owner always included)</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-caregiver"
                        checked={visibleToRoles.includes('caregiver')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'caregiver']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'caregiver'));
                          }
                        }}
                      />
                      <label htmlFor="role-caregiver" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Guardians
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-bestie"
                        checked={visibleToRoles.includes('bestie')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'bestie']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'bestie'));
                          }
                        }}
                      />
                      <label htmlFor="role-bestie" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Besties
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-supporter"
                        checked={visibleToRoles.includes('supporter')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'supporter']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'supporter'));
                          }
                        }}
                      />
                      <label htmlFor="role-supporter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Supporters
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Images *</Label>
                  
                  {/* Existing Images when editing */}
                  {editingAlbum && existingImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Existing Images (Drag to reorder)</p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={existingImages.map(img => img.id)} strategy={rectSortingStrategy}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {existingImages.map((media) => (
                              <SortableMediaItem
                                key={media.id}
                                media={media}
                                isCover={editingAlbum.cover_image_url === media.image_url}
                                onSetCover={handleSetCover}
                                onEditCaption={handleEditCaption}
                                onCrop={handleCropExistingImage}
                                onDelete={handleDeleteImage}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                  
                  {/* Add New Media */}
                  <div className="space-y-2">
                    {editingAlbum && <p className="text-sm text-muted-foreground">Add New Media</p>}
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {editingAlbum ? "Add Images" : "Select Images"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddVideoDialog(true)}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Add Video
                      </Button>
                    </div>
                  </div>
                  
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative space-y-2">
                          <div className="relative">
                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCropImage(index)}
                                title="Crop image"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeImage(index)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <Input
                            placeholder="Caption (optional)"
                            value={imageCaptions[index]}
                            onChange={(e) => {
                              const newCaptions = [...imageCaptions];
                              newCaptions[index] = e.target.value;
                              setImageCaptions(newCaptions);
                            }}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Pending Videos preview (for new albums) */}
                  {pendingVideos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Pending Videos ({pendingVideos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {pendingVideos.map((pv, index) => (
                          <div key={index} className="relative rounded-lg border bg-muted/30 p-2">
                            <div className="aspect-video bg-muted rounded flex items-center justify-center">
                              {pv.type === 'youtube' ? (
                                <Youtube className="w-8 h-8 text-muted-foreground" />
                              ) : (
                                <Play className="w-8 h-8 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs mt-1 truncate">{pv.caption || (pv.type === 'youtube' ? 'YouTube Video' : 'Library Video')}</p>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6"
                              onClick={() => setPendingVideos(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={uploading}>
                    {uploading ? "Saving..." : editingAlbum ? "Update Album" : "Create Album"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p>Loading albums...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album) => (
                <Card key={album.id}>
                  {album.cover_image_url && (
                    <img
                      loading="lazy"
                      src={album.cover_image_url}
                      alt={album.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{album.title}</h3>
                        {album.event && (
                          <p className="text-xs text-muted-foreground">Event: {album.event.title}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(album)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(album.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {album.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {album.description}
                      </p>
                    )}

                    {album.images && album.images.length > 0 ? (
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => setExpandedAlbums(prev => {
                            const next = new Set(prev);
                            if (next.has(album.id)) next.delete(album.id);
                            else next.add(album.id);
                            return next;
                          })}
                        >
                          {expandedAlbums.has(album.id) ? (
                            <ChevronDown className="w-3 h-3 mr-1" />
                          ) : (
                            <ChevronRight className="w-3 h-3 mr-1" />
                          )}
                          {album.images.length} media items
                        </Button>

                        {expandedAlbums.has(album.id) && (
                          <div className="grid grid-cols-4 gap-1">
                            {album.images.slice(0, 8).map((image) => (
                              <div key={image.id} className="relative group">
                                <img
                                  loading="lazy"
                                  src={image.image_url || ''}
                                  alt={image.caption || "Album image"}
                                  className="w-full h-16 object-cover rounded"
                                />
                                {image.caption && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-0.5 truncate">
                                    {image.caption}
                                  </div>
                                )}
                                <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="w-5 h-5"
                                    onClick={() => handleEditCaption(image)}
                                    title="Edit caption"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="w-5 h-5"
                                    onClick={() => handleCropExistingImage(image)}
                                    title="Recrop image"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="w-5 h-5"
                                    onClick={() => handleDeleteImage(image.id, album.id)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {album.images.length > 8 && (
                              <div className="w-full h-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                +{album.images.length - 8} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">0 media items</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      
      <ImageCropDialog
        open={showCropDialog}
        onOpenChange={(open) => {
          setShowCropDialog(open);
          if (!open) {
            setCropImageIndex(null);
            setCropExistingImage(null);
          }
        }}
        imageUrl={
          cropExistingImage?.original_image_url || 
          cropExistingImage?.image_url || 
          (cropImageIndex !== null ? imagePreviews[cropImageIndex] : "")
        }
        onCropComplete={handleCroppedImage}
        aspectRatio={4 / 3}
        title="Crop Album Image"
        description={cropExistingImage ? "Cropping from original image - you can zoom in or out as needed" : "Adjust the crop area to match how this image will appear in the album (4:3 aspect ratio)"}
      />

      <Dialog open={showCaptionDialog} onOpenChange={setShowCaptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Caption</DialogTitle>
            <DialogDescription>
              Update the caption for this album image
            </DialogDescription>
          </DialogHeader>
          {editingCaption && (
            <div className="space-y-4">
              <div className="relative w-full h-48 rounded-lg overflow-hidden">
                <img
                  src={editingCaption.image_url}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Enter a caption for this image..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCaptionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCaption}>
              Save Caption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VideoLibraryPickerDialog
        open={showAddVideoDialog}
        onOpenChange={setShowAddVideoDialog}
        onVideoSelected={(video) => {
          if (editingAlbum) {
            // Insert immediately for existing albums
            (async () => {
              try {
                const nextOrder = existingImages.length;
                const { error } = await supabase
                  .from("album_images")
                  .insert({
                    album_id: editingAlbum.id,
                    video_type: video.type === 'youtube' ? 'youtube' : 'upload',
                    video_url: video.url || null,
                    youtube_url: video.youtubeUrl || null,
                    video_id: video.videoId || null,
                    caption: video.caption || null,
                    display_order: nextOrder,
                  });

                if (error) throw error;

                toast.success("Video added to album");
                loadAlbums();
                
                // Reload existing images for the editing form
                const { data: images } = await supabase
                  .from("album_images")
                  .select("*")
                  .eq("album_id", editingAlbum.id)
                  .order("display_order", { ascending: true });
                
                if (images) {
                  const mappedImages: AlbumMedia[] = images.map(img => ({
                    id: img.id,
                    image_url: img.image_url,
                    video_url: img.video_url,
                    video_type: (img.video_type || 'image') as 'image' | 'upload' | 'youtube',
                    youtube_url: img.youtube_url,
                    video_id: img.video_id,
                    caption: img.caption,
                    display_order: img.display_order,
                    original_image_url: img.original_image_url,
                  }));
                  setExistingImages(mappedImages);
                }
              } catch (error: any) {
                console.error("Error adding video:", error);
                toast.error(error.message || "Failed to add video");
              }
            })();
          } else {
            // Queue for new album creation
            setPendingVideos(prev => [...prev, video]);
            toast.success("Video queued — it will be added when you create the album");
          }
        }}
      />
    </div>
  );
}
