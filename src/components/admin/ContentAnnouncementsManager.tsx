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
import { Pencil, Trash2, Eye, Send, Upload, X, Megaphone, Clock, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { MemoryMatchGridPreview } from "@/components/store/MemoryMatchGridPreview";
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

interface ContentItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  link_url: string;
  price?: number;
  is_free?: boolean;
}

// App types that can be announced with their data sources
const ANNOUNCEABLE_APPS = [
  { id: "memory_match", label: "Memory Match", emoji: "🧩", table: "memory_match_packs", linkPath: "/games/memory-match" },
  { id: "memory_match_extreme", label: "Memory Match Extreme", emoji: "🔥", table: "store_items", linkPath: "/store" },
  { id: "sticker_pack", label: "Sticker Packs", emoji: "⭐", table: "sticker_collections", linkPath: "/sticker-album" },
  { id: "coloring_book", label: "Coloring Books", emoji: "🎨", table: "coloring_books", linkPath: "/games/coloring-book" },
  { id: "beat_pad", label: "Beat Pad Sounds", emoji: "🎵", table: "beat_pad_sounds", linkPath: "/games/beat-pad" },
  { id: "joke_category", label: "Joke Packs", emoji: "😂", table: "joke_categories", linkPath: "/games/jokes" },
  { id: "cash_register_store", label: "Cash Register Locations", emoji: "🏪", table: "cash_register_stores", linkPath: "/games/cash-register" },
  { id: "cash_register_pack", label: "Cash Register Packs", emoji: "💰", table: "cash_register_packs", linkPath: "/games/cash-register" },
  { id: "cash_register_time_trial", label: "Cash Register Time Trials", emoji: "⏱️", table: "feature_announcement", linkPath: "/games/cash-register" },
  { id: "card_template", label: "Card Templates", emoji: "💌", table: "card_templates", linkPath: "/games/card-creator" },
  { id: "avatar", label: "Avatars", emoji: "👤", table: "avatars", linkPath: "/profile" },
  { id: "workout_location", label: "Workout Locations", emoji: "🏋️", table: "workout_locations", linkPath: "/games/exercise" },
];

export const ContentAnnouncementsManager = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<ContentAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<ContentAnnouncement | null>(null);
  
  // Cascading dropdown state
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [availableItems, setAvailableItems] = useState<ContentItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Form data (auto-filled from selection)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    announcement_type: "",
    link_url: "",
    link_label: "Check it out!",
    price_coins: 0,
    is_free: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  // Load items when app changes
  useEffect(() => {
    if (selectedAppId) {
      loadItemsForApp(selectedAppId);
    } else {
      setAvailableItems([]);
      setSelectedItemId("");
    }
  }, [selectedAppId]);

  // Auto-fill form when item is selected
  useEffect(() => {
    if (selectedItemId && availableItems.length > 0) {
      const item = availableItems.find(i => i.id === selectedItemId);
      if (item) {
        const app = ANNOUNCEABLE_APPS.find(a => a.id === selectedAppId);
        setFormData({
          title: `New ${app?.label || "Content"}: ${item.name}`,
          description: item.description || "",
          announcement_type: selectedAppId,
          link_url: item.link_url,
          link_label: "Check it out!",
          price_coins: item.price || 0,
          is_free: item.is_free ?? true,
        });
        if (item.image_url) {
          setImagePreview(item.image_url);
          setImageFile(null); // Clear file since we're using existing URL
        }
      }
    }
  }, [selectedItemId, availableItems, selectedAppId]);

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

  const loadItemsForApp = async (appId: string) => {
    const app = ANNOUNCEABLE_APPS.find(a => a.id === appId);
    if (!app) return;

    setLoadingItems(true);
    setAvailableItems([]);
    setSelectedItemId("");

    try {
      let items: ContentItem[] = [];

      switch (app.table) {
        case "memory_match_packs": {
          const { data } = await supabase
            .from("memory_match_packs")
            .select("id, name, description, preview_image_url, price_coins")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.preview_image_url,
            link_url: `${app.linkPath}?pack=${p.id}`,
            price: p.price_coins || 0,
            is_free: (p.price_coins || 0) === 0,
          }));
          break;
        }
        case "sticker_collections": {
          const { data } = await supabase
            .from("sticker_collections")
            .select("id, name, description, pack_image_url")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.pack_image_url,
            link_url: `${app.linkPath}?collection=${p.id}`,
            price: 0,
            is_free: true,
          }));
          break;
        }
        case "coloring_books": {
          const { data } = await supabase
            .from("coloring_books")
            .select("id, title, description, cover_image_url, coin_price, is_free")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          items = (data || []).map(p => ({
            id: p.id,
            name: p.title,
            description: p.description,
            image_url: p.cover_image_url,
            link_url: `${app.linkPath}?book=${p.id}`,
            price: p.coin_price || 0,
            is_free: p.is_free ?? true,
          }));
          break;
        }
        case "beat_pad_sounds": {
          const { data } = await supabase
            .from("beat_pad_sounds")
            .select("id, name, description, emoji, category, price_coins")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          items = (data || []).map(p => ({
            id: p.id,
            name: `${p.emoji || "🎵"} ${p.name}`,
            description: p.description || `${p.category || "Sound"} for Beat Pad`,
            image_url: null,
            link_url: `${app.linkPath}?sound=${p.id}`,
            price: p.price_coins || 0,
            is_free: (p.price_coins || 0) === 0,
          }));
          break;
        }
        case "joke_categories": {
          const { data } = await supabase
            .from("joke_categories")
            .select("id, name, description, icon_url, emoji")
            .eq("is_active", true)
            .order("display_order");
          items = (data || []).map(p => ({
            id: p.id,
            name: `${p.emoji || "😂"} ${p.name}`,
            description: p.description,
            image_url: p.icon_url,
            link_url: `${app.linkPath}?category=${p.id}`,
            price: 0,
            is_free: true,
          }));
          break;
        }
        case "cash_register_stores": {
          const { data } = await supabase
            .from("cash_register_stores")
            .select("id, name, description, image_url, price_coins, is_free")
            .eq("is_active", true)
            .order("display_order");
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            link_url: `${app.linkPath}?store=${p.id}`,
            price: p.price_coins || 0,
            is_free: p.is_free ?? true,
          }));
          break;
        }
        case "cash_register_packs": {
          const { data } = await supabase
            .from("cash_register_packs")
            .select("id, name, description, image_url, price_coins")
            .eq("is_active", true)
            .order("display_order");
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            link_url: `${app.linkPath}?pack=${p.id}`,
            price: p.price_coins || 0,
            is_free: (p.price_coins || 0) === 0,
          }));
          break;
        }
        case "card_templates": {
          const { data } = await supabase
            .from("card_templates")
            .select("id, title, description, cover_image_url, coin_price, is_free")
            .eq("is_active", true)
            .order("display_order");
          items = (data || []).map(p => ({
            id: p.id,
            name: p.title,
            description: p.description,
            image_url: p.cover_image_url,
            link_url: `${app.linkPath}?template=${p.id}`,
            price: p.coin_price || 0,
            is_free: p.is_free ?? true,
          }));
          break;
        }
        case "avatars": {
          const { data } = await supabase
            .from("avatars")
            .select("id, avatar_number, category")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          items = (data || []).map(p => ({
            id: p.id,
            name: `Avatar #${p.avatar_number} (${p.category})`,
            description: `New ${p.category} avatar available!`,
            image_url: null,
            link_url: `${app.linkPath}?avatar=${p.id}`,
            price: 0,
            is_free: true,
          }));
          break;
        }
        case "store_items": {
          // Memory Match Extreme - get the specific store item
          const { data } = await supabase
            .from("store_items")
            .select("id, name, description, image_url, price")
            .eq("name", "Memory Match - Extreme Mode")
            .eq("is_active", true);
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || "Unlock Extreme Mode with 32 cards!",
            image_url: p.image_url,
            link_url: `${app.linkPath}?item=${p.id}`,
            price: p.price || 0,
            is_free: (p.price || 0) === 0,
          }));
          break;
        }
        case "feature_announcement": {
          // Pre-defined feature announcements (no database query needed)
          const app_feature = ANNOUNCEABLE_APPS.find(a => a.id === appId);
          if (appId === "cash_register_time_trial") {
            items = [{
              id: "time_trial_feature",
              name: "⏱️ Time Trial Mode",
              description: "Race against the clock! Complete as many levels as you can before time runs out. Choose 1, 2, or 5 minute challenges!",
              image_url: null,
              link_url: app_feature?.linkPath || "/games/cash-register",
              price: 0,
              is_free: true,
            }];
          }
          break;
        }
        case "workout_locations": {
          const { data } = await supabase
            .from("workout_locations")
            .select("id, name, description, image_url")
            .eq("is_active", true)
            .order("display_order");
          items = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            link_url: `${app.linkPath}?location=${p.id}`,
            price: 0,
            is_free: true,
          }));
          break;
        }
      }

      setAvailableItems(items);
    } catch (error) {
      console.error("Error loading items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      announcement_type: "",
      link_url: "",
      link_label: "Check it out!",
      price_coins: 0,
      is_free: true,
    });
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setSelectedAppId("");
    setSelectedItemId("");
    setAvailableItems([]);
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
        : imagePreview && !imageFile ? imagePreview : null;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const announcementData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        announcement_type: formData.announcement_type || "general",
        link_url: formData.link_url.trim() || null,
        link_label: formData.link_label.trim() || null,
        image_url: imageUrl,
        created_by: user?.id,
        price_coins: formData.price_coins,
        is_free: formData.is_free,
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
      price_coins: (announcement as any).price_coins || 0,
      is_free: (announcement as any).is_free ?? true,
    });
    if (announcement.image_url) {
      setImagePreview(announcement.image_url);
    }
    // Clear cascading selects when editing (manual mode)
    setSelectedAppId("");
    setSelectedItemId("");
  };

  const handlePreview = (announcement: ContentAnnouncement) => {
    setPreviewAnnouncement(announcement);
    setPreviewOpen(true);
  };

  const handlePreviewCurrent = () => {
    // Preview current form state
    setPreviewAnnouncement({
      id: "preview",
      created_by: user?.id || "",
      title: formData.title,
      description: formData.description,
      image_url: imagePreview || null,
      announcement_type: formData.announcement_type,
      link_url: formData.link_url,
      link_label: formData.link_label,
      status: "draft",
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setPreviewOpen(true);
  };

  const getAppEmoji = (type: string) => {
    return ANNOUNCEABLE_APPS.find(a => a.id === type)?.emoji || "📢";
  };

  const getAppLabel = (type: string) => {
    return ANNOUNCEABLE_APPS.find(a => a.id === type)?.label || type || "General";
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
          {/* Step 1: Select App */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>1. Select App Type *</Label>
              <Select
                value={selectedAppId}
                onValueChange={setSelectedAppId}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an app..." />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEABLE_APPS.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.emoji} {app.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Item */}
            <div className="space-y-2">
              <Label>2. Select Item *</Label>
              <Select
                value={selectedItemId}
                onValueChange={setSelectedItemId}
                disabled={!selectedAppId || loadingItems || !!editingId}
              >
                <SelectTrigger>
                  {loadingItems ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <SelectValue placeholder={selectedAppId ? "Choose an item..." : "Select app first"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt="" 
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {!loadingItems && availableItems.length === 0 && selectedAppId && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No items found for this app
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-filled fields (editable) */}
          {(selectedItemId || editingId) && (
            <>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  ✨ Fields auto-filled from selection. You can edit them before saving.
                </p>
              </div>

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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Check out our brand new pack..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="link_url">Link URL</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    placeholder="/games/memory-match"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link_label">Button Text</Label>
                  <Input
                    id="link_label"
                    value={formData.link_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_label: e.target.value }))}
                    placeholder="Check it out!"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image</Label>
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

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={uploading || !formData.title.trim()}>
                  {editingId ? "Update Draft" : "Save as Draft"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePreviewCurrent}
                  disabled={!formData.title.trim()}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                {editingId && (
                  <Button variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
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
                      <span className="text-lg">{getAppEmoji(announcement.announcement_type)}</span>
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
                      <Badge variant="outline">{getAppLabel(announcement.announcement_type)}</Badge>
                      <span>
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </span>
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
                        size="icon"
                        variant="ghost"
                        onClick={() => handlePublish(announcement.id)}
                        title="Publish"
                        className="text-primary hover:text-primary"
                      >
                        <Send className="w-4 h-4" />
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
            <DialogTitle>Feed Preview</DialogTitle>
            <DialogDescription>
              This is how the announcement will appear in the community feed.
            </DialogDescription>
          </DialogHeader>
          
          {previewAnnouncement && (
            <div className="border rounded-lg overflow-hidden bg-card">
              {previewAnnouncement.announcement_type === "memory_match_extreme" ? (
                <div className="p-4">
                  <MemoryMatchGridPreview 
                    difficulty="extreme" 
                    cardBackUrl={previewAnnouncement.image_url || undefined}
                  />
                </div>
              ) : previewAnnouncement.image_url && (
                <div className="w-full h-48 bg-background flex items-center justify-center p-4">
                  <img
                    src={previewAnnouncement.image_url}
                    alt={previewAnnouncement.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1">
                    <Megaphone className="w-3 h-3" />
                    New!
                  </Badge>
                  <Badge variant="outline">
                    {getAppEmoji(previewAnnouncement.announcement_type)} {getAppLabel(previewAnnouncement.announcement_type)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-1">{previewAnnouncement.title}</h3>
                {previewAnnouncement.description && (
                  <p className="text-muted-foreground text-sm mb-3">
                    {previewAnnouncement.description}
                  </p>
                )}
                {previewAnnouncement.link_url && (
                  <Button 
                    size="sm" 
                    className="w-full gap-2"
                    onClick={() => {
                      toast.info(`Button navigates to: ${previewAnnouncement.link_url}`, {
                        description: "Click to copy URL",
                        action: {
                          label: "Copy",
                          onClick: () => {
                            navigator.clipboard.writeText(previewAnnouncement.link_url || "");
                            toast.success("URL copied!");
                          }
                        }
                      });
                    }}
                  >
                    {previewAnnouncement.link_label || "Check it out!"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {previewAnnouncement?.status === "draft" && previewAnnouncement.id !== "preview" && (
              <Button onClick={() => {
                handlePublish(previewAnnouncement.id);
                setPreviewOpen(false);
              }}>
                <Send className="w-4 h-4 mr-2" />
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
        description="Adjust the crop area for your announcement"
      />
    </div>
  );
};
