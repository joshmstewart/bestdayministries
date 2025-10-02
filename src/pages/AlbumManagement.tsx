import { useState, useEffect, useRef } from "react";
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
import { Images, Upload, X, Trash2, Edit, ArrowLeft, GripVertical, Mic, Info, MessageSquare } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import AudioRecorder from "@/components/AudioRecorder";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  images?: AlbumImage[];
  event?: { title: string } | null;
}

interface AlbumImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
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
  const [cropExistingImage, setCropExistingImage] = useState<AlbumImage | null>(null);
  const [editingCaption, setEditingCaption] = useState<AlbumImage | null>(null);
  const [showCaptionDialog, setShowCaptionDialog] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [existingImages, setExistingImages] = useState<AlbumImage[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Check for admin-level access (owner role automatically has admin access)
    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadAlbums(), loadEvents()]);
  };

  const loadAlbums = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("albums")
      .select(`
        *,
        event:events(title)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load albums");
      console.error(error);
    } else {
      // Load images for each album
      const albumsWithImages = await Promise.all(
        (data || []).map(async (album) => {
          const { data: images } = await supabase
            .from("album_images")
            .select("*")
            .eq("album_id", album.id)
            .order("display_order", { ascending: true });
          return { ...album, images: images || [] };
        })
      );
      setAlbums(albumsWithImages);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

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

        toast.success("Image recropped successfully");
        setCropExistingImage(null);
        loadAlbums();
      } catch (error: any) {
        console.error("Error recropping image:", error);
        toast.error(error.message || "Failed to recrop image");
      }
    }
  };

  const handleCropExistingImage = (image: AlbumImage) => {
    setCropExistingImage(image);
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
    setEditingAlbum(null);
    setExistingImages([]);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title || (selectedImages.length === 0 && !editingAlbum?.images?.length && existingImages.length === 0)) {
      toast.error("Please provide a title and at least one image");
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
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        albumId = newAlbum.id;
      }

      // Upload images
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const compressedImage = await compressImage(file, 4.5);
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        
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
    console.log("Editing album:", album);
    setEditingAlbum(album);
    setTitle(album.title);
    setDescription(album.description || "");
    setEventId(album.event_id || "none");
    setAudioPreview(album.audio_url || "");
    setAudioBlob(null);
    setShowAudioRecorder(false);
    setIsPost(album.is_post || false);
    setIsPublic(album.is_public ?? true);
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

  const handleEditCaption = (image: AlbumImage) => {
    setEditingCaption(image);
    setNewCaption(image.caption || "");
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
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
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
                          <Mic className="w-4 h-4 mr-2" />
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
                          <p><strong>Public:</strong> Visible on homepage and community page</p>
                          <p className="mt-1"><strong>Private:</strong> Only visible on community page (logged-in users)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Images *</Label>
                  
                  {/* Existing Images when editing */}
                  {editingAlbum && existingImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Existing Images</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {existingImages.map((image) => (
                          <div key={image.id} className="relative space-y-2">
                            <div className="relative">
                              <img 
                                src={image.image_url} 
                                alt={image.caption || "Album image"} 
                                className="w-full h-32 object-cover rounded-lg" 
                              />
                              {editingAlbum.cover_image_url === image.image_url && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold">
                                  Cover
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleSetCover(image.image_url)}
                                  title="Set as cover"
                                >
                                  <Images className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEditCaption(image)}
                                  title="Edit caption"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCropExistingImage(image)}
                                  title="Recrop image"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteImage(image.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {image.caption && (
                              <p className="text-xs text-muted-foreground truncate">
                                {image.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add New Images */}
                  <div className="space-y-2">
                    {editingAlbum && <p className="text-sm text-muted-foreground">Add New Images</p>}
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {editingAlbum ? "Add More Images" : "Select Images"}
                    </Button>
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

                    <p className="text-xs text-muted-foreground">
                      {album.images?.length || 0} images
                    </p>

                    {album.images && album.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        {album.images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.image_url}
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
                      </div>
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
        imageUrl={cropExistingImage?.image_url || (cropImageIndex !== null ? imagePreviews[cropImageIndex] : "")}
        onCropComplete={handleCroppedImage}
        aspectRatio={4 / 3}
        title="Crop Album Image"
        description="Adjust the crop area to match how this image will appear in the album (4:3 aspect ratio)"
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
    </div>
  );
}
