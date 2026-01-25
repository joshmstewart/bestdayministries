import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Send, Upload, X, Megaphone, ExternalLink, Clock, CheckCircle } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { useAuth } from "@/contexts/AuthContext";
import { INTERNAL_PAGES } from "@/lib/internalPages";
import { formatDistanceToNow } from "date-fns";

interface ContentAnnouncement {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  image_url: string | null;
  announcement_type: string;
  link_url: string | null;
  link_label: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const ANNOUNCEMENT_TYPES = [
  { value: "general", label: "General", emoji: "📢" },
  { value: "avatar", label: "New Avatars", emoji: "👤" },
  { value: "coloring_book", label: "Coloring Book", emoji: "🎨" },
  { value: "memory_match_pack", label: "Memory Match Pack", emoji: "🧩" },
  { value: "sticker_pack", label: "Sticker Pack", emoji: "⭐" },
  { value: "beat_pad_pack", label: "Beat Pad Sounds", emoji: "🎵" },
  { value: "joke_pack", label: "Joke Pack", emoji: "😂" },
  { value: "location_pack", label: "Location Pack", emoji: "📍" },
  { value: "cash_register_pack", label: "Cash Register Pack", emoji: "💰" },
];

export const ContentAnnouncementsManager = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<ContentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<ContentAnnouncement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    announcement_type: "general",
    link_url: "",
    link_label: "Check it out!",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
  const [linkType, setLinkType] = useState<string>("custom");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from("content_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      announcement_type: "general",
      link_url: "",
      link_label: "Check it out!",
    });
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setLinkType("custom");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1920, 0.85);
      const previewUrl = URL.createObjectURL(compressed);
      setImageToCrop(previewUrl);
      setCropDialogOpen(true);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob | null) => {
    if (!croppedBlob) {
      setCropDialogOpen(false);
      return;
    }

    const file = new File([croppedBlob], 'announcement.jpg', { type: 'image/jpeg' });
    setImageFile(file);
    setImagePreview(URL.createObjectURL(croppedBlob));
    setCropDialogOpen(false);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const filename = `announcement-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filename, imageFile, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    try {
      let imageUrl = editingId 
        ? announcements.find(a => a.id === editingId)?.image_url 
        : null;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const announcementData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        announcement_type: formData.announcement_type,
        link_url: formData.link_url.trim() || null,
        link_label: formData.link_label.trim() || null,
        image_url: imageUrl,
        created_by: user?.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("content_announcements")
          .update(announcementData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Announcement updated");
      } else {
        const { error } = await supabase
          .from("content_announcements")
          .insert(announcementData);

        if (error) throw error;
        toast.success("Announcement created as draft");
      }

      resetForm();
      loadAnnouncements();
    } catch (error: any) {
      console.error("Error saving announcement:", error);
      toast.error(error.message || "Failed to save announcement");
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const { error } = await supabase
        .from("content_announcements")
        .update({ 
          status: "published", 
          published_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Announcement published! Users will be notified.");
      loadAnnouncements();
    } catch (error: any) {
      console.error("Error publishing announcement:", error);
      toast.error(error.message || "Failed to publish announcement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const { error } = await supabase
        .from("content_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Announcement deleted");
      loadAnnouncements();
    } catch (error: any) {
      console.error("Error deleting announcement:", error);
      toast.error(error.message || "Failed to delete announcement");
    }
  };

  const handleEdit = (announcement: ContentAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      description: announcement.description || "",
      announcement_type: announcement.announcement_type,
      link_url: announcement.link_url || "",
      link_label: announcement.link_label || "Check it out!",
    });
    if (announcement.image_url) {
      setImagePreview(announcement.image_url);
    }
    // Detect link type
    if (announcement.link_url?.startsWith("/")) {
      const internalPage = INTERNAL_PAGES.find(p => p.value === announcement.link_url);
      setLinkType(internalPage ? "internal" : "custom");
    } else {
      setLinkType("custom");
    }
  };

  const handlePreview = (announcement: ContentAnnouncement) => {
    setPreviewAnnouncement(announcement);
    setPreviewOpen(true);
  };

  const handleLinkTypeChange = (type: string) => {
    setLinkType(type);
    if (type === "internal") {
      setFormData(prev => ({ ...prev, link_url: "" }));
    }
  };

  const getTypeEmoji = (type: string) => {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type)?.emoji || "📢";
  };

  const getTypeLabel = (type: string) => {
    return ANNOUNCEMENT_TYPES.find(t => t.value === type)?.label || "General";
  };

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {editingId ? "Edit Announcement" : "Create New Announcement"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="New Memory Match Pack Available!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Announcement Type</Label>
              <Select
                value={formData.announcement_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, announcement_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Check out our brand new animal-themed pack with 20 beautiful images..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={handleLinkTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom URL</SelectItem>
                  <SelectItem value="internal">Internal Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_url">Link URL</Label>
              {linkType === "internal" ? (
                <Select
                  value={formData.link_url}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, link_url: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_PAGES.map((page) => (
                      <SelectItem key={page.value} value={page.value}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="link_url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="/games/memory-match or https://..."
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_label">Link Button Text</Label>
            <Input
              id="link_label"
              value={formData.link_label}
              onChange={(e) => setFormData(prev => ({ ...prev, link_label: e.target.value }))}
              placeholder="Check it out!"
            />
          </div>

          <div className="space-y-2">
            <Label>Image (Optional)</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-20 object-cover rounded-lg border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imagePreview ? "Change Image" : "Upload Image"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={uploading}>
              {editingId ? "Update Draft" : "Save as Draft"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No announcements yet. Create your first one above!
            </p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card"
                >
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-24 h-16 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTypeEmoji(announcement.announcement_type)}</span>
                      <h3 className="font-medium truncate">{announcement.title}</h3>
                      <Badge variant={announcement.status === "published" ? "default" : "secondary"}>
                        {announcement.status === "published" ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Published</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> Draft</>
                        )}
                      </Badge>
                    </div>
                    {announcement.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                        {announcement.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{getTypeLabel(announcement.announcement_type)}</Badge>
                      {announcement.link_url && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {announcement.link_url}
                        </span>
                      )}
                      <span>
                        Created {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </span>
                      {announcement.published_at && (
                        <span>
                          • Published {formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handlePreview(announcement)}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(announcement)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {announcement.status === "draft" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePublish(announcement.id)}
                        title="Publish"
                        className="gap-1"
                      >
                        <Send className="w-4 h-4" />
                        Publish
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(announcement.id)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Announcement
            </DialogTitle>
            <DialogDescription>
              This is how the announcement will appear in the feed
            </DialogDescription>
          </DialogHeader>
          {previewAnnouncement && (
            <div className="border rounded-lg overflow-hidden bg-card">
              {previewAnnouncement.image_url && (
                <img
                  src={previewAnnouncement.image_url}
                  alt={previewAnnouncement.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1">
                    <Megaphone className="w-3 h-3" />
                    {getTypeLabel(previewAnnouncement.announcement_type)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  {previewAnnouncement.title}
                </h3>
                {previewAnnouncement.description && (
                  <p className="text-muted-foreground text-sm mb-3">
                    {previewAnnouncement.description}
                  </p>
                )}
                {previewAnnouncement.link_url && previewAnnouncement.link_label && (
                  <Button size="sm" className="w-full">
                    {previewAnnouncement.link_label}
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {previewAnnouncement?.status === "draft" && (
              <Button
                onClick={() => {
                  handlePublish(previewAnnouncement.id);
                  setPreviewOpen(false);
                }}
                className="gap-1"
              >
                <Send className="w-4 h-4" />
                Publish Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        allowAspectRatioChange={true}
        selectedRatioKey={aspectRatioKey}
        onAspectRatioKeyChange={setAspectRatioKey}
        title="Crop Announcement Image"
        description="Adjust the crop area for your announcement image"
      />
    </div>
  );
};
