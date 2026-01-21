import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Upload, X, Info, Crop } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { INTERNAL_PAGES } from "@/lib/internalPages";
interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  original_image_url: string | null;
  aspect_ratio: string;
  link_url: string;
  link_text: string;
  is_active: boolean;
  display_order: number;
  is_public: boolean;
  visible_to_roles: string[];
}

export const FeaturedItemManager = () => {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    link_text: "Learn More",
    display_order: 0,
  });
  const [linkType, setLinkType] = useState<string>("custom");
  const [events, setEvents] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['caregiver', 'bestie', 'supporter']);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');

  useEffect(() => {
    loadItems();
    loadLinkOptions();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading featured items:", error);
      toast.error("Failed to load featured items");
    } finally {
      setLoading(false);
    }
  };

  const loadLinkOptions = async () => {
    try {
      const [eventsData, albumsData, postsData] = await Promise.all([
        supabase.from("events").select("id, title, description, image_url").order("event_date", { ascending: false }),
        supabase.from("albums").select("id, title, description, cover_image_url").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("discussion_posts").select("id, title, content, image_url").eq("approval_status", "approved").order("created_at", { ascending: false })
      ]);

      if (eventsData.data) setEvents(eventsData.data);
      if (albumsData.data) setAlbums(albumsData.data);
      if (postsData.data) setPosts(postsData.data);
    } catch (error) {
      console.error("Error loading link options:", error);
    }
  };

  const handleLinkSelection = (type: string, id?: string) => {
    setLinkType(type);
    
    if (type === "sponsorship") {
      setFormData({ 
        ...formData, 
        title: "Sponsor a Bestie",
        description: "Make a lasting impact by sponsoring one of our besties. Your support helps create unforgettable experiences and lasting memories.",
        link_url: "/sponsor-bestie",
        link_text: "Become a Sponsor"
      });
      return;
    }
    
    if (type === "page" && id) {
      const page = INTERNAL_PAGES.find(p => p.value === id);
      if (page) {
        setFormData({
          ...formData,
          link_url: page.value,
        });
      }
      return;
    }
    
    if (!id) return;
    
    // Auto-fill form based on selected item
    if (type === "event") {
      const event = events.find(e => e.id === id);
      if (event) {
        setFormData({
          ...formData,
          title: event.title,
          description: event.description || "",
          image_url: event.image_url || "",
          link_url: `event:${id}`,
        });
        if (event.image_url) {
          setImagePreview(event.image_url);
          setOriginalImageUrl(event.image_url);
        }
      }
    } else if (type === "album") {
      const album = albums.find(a => a.id === id);
      if (album) {
        setFormData({
          ...formData,
          title: album.title,
          description: album.description || "",
          image_url: album.cover_image_url || "",
          link_url: `album:${id}`,
        });
        if (album.cover_image_url) {
          setImagePreview(album.cover_image_url);
          setOriginalImageUrl(album.cover_image_url);
        }
      }
    } else if (type === "post") {
      const post = posts.find(p => p.id === id);
      if (post) {
        setFormData({
          ...formData,
          title: post.title,
          description: post.content?.substring(0, 200) || "",
          image_url: post.image_url || "",
          link_url: `post:${id}`,
        });
        if (post.image_url) {
          setImagePreview(post.image_url);
          setOriginalImageUrl(post.image_url);
        }
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile && !formData.image_url && !editingId) {
      toast.error("Please upload an image or provide an image URL");
      return;
    }

    // Validate link based on type
    if (linkType === "sponsorship") {
      setFormData({ ...formData, link_url: "/sponsor-bestie" });
    } else if (linkType === "page" && !formData.link_url) {
      toast.error("Please select a page");
      return;
    } else if (linkType !== "custom" && linkType !== "page" && !formData.link_url.includes(":")) {
      toast.error(`Please select a ${linkType}`);
      return;
    }

    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = formData.image_url;
      let originalUrl = originalImageUrl;

      // Upload image if file is selected
      if (imageFile) {
        const compressedImage = await compressImage(imageFile, 4.5);
        const fileName = `${user.id}/${Date.now()}_featured_${imageFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(fileName, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("app-assets")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        // Store original URL for future recropping
        if (!originalUrl) {
          originalUrl = publicUrl;
        }
      }

      // Ensure admin and owner are always included
      const finalVisibleRoles = [...new Set([...visibleToRoles, 'admin', 'owner'])] as any;

      const itemData = {
        ...formData,
        link_url: linkType === "sponsorship" ? "/sponsor-bestie" : formData.link_url,
        image_url: imageUrl,
        original_image_url: originalUrl,
        aspect_ratio: aspectRatioKey,
        created_by: user.id,
        is_active: true,
        is_public: isPublic,
        visible_to_roles: finalVisibleRoles,
      };

      if (editingId) {
        const { error } = await supabase
          .from("featured_items")
          .update(itemData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Featured item updated successfully");
      } else {
        const { error } = await supabase
          .from("featured_items")
          .insert([itemData]);

        if (error) throw error;
        toast.success("Featured item created successfully");
      }

      resetForm();
      loadItems();
    } catch (error) {
      console.error("Error saving featured item:", error);
      toast.error("Failed to save featured item");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: FeaturedItem) => {
    setEditingId(item.id);
    
    // Determine link type from stored link_url
    if (item.link_url.startsWith("event:")) {
      setLinkType("event");
    } else if (item.link_url.startsWith("album:")) {
      setLinkType("album");
    } else if (item.link_url.startsWith("post:")) {
      setLinkType("post");
    } else if (item.link_url === "/sponsor-bestie") {
      setLinkType("sponsorship");
    } else if (INTERNAL_PAGES.some(p => p.value === item.link_url)) {
      setLinkType("page");
    } else {
      setLinkType("custom");
    }
    
    setFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url || "",
      link_url: item.link_url,
      link_text: item.link_text,
      display_order: item.display_order,
    });
    
    setIsPublic(item.is_public ?? true);
    setVisibleToRoles(item.visible_to_roles?.filter(r => !['admin', 'owner'].includes(r)) || ['caregiver', 'bestie', 'supporter']);
    setAspectRatioKey((item.aspect_ratio as any) || '16:9');
    
    if (item.image_url) {
      setImagePreview(item.image_url);
    }
    
    if (item.original_image_url) {
      setOriginalImageUrl(item.original_image_url);
    }

    // Scroll to the top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this featured item?")) return;

    try {
      const { error } = await supabase
        .from("featured_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Featured item deleted successfully");
      loadItems();
    } catch (error) {
      console.error("Error deleting featured item:", error);
      toast.error("Failed to delete featured item");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("featured_items")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Featured item ${!isActive ? "activated" : "deactivated"}`);
      loadItems();
    } catch (error) {
      console.error("Error toggling featured item:", error);
      toast.error("Failed to update featured item");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setLinkType("custom");
    setFormData({
      title: "",
      description: "",
      image_url: "",
      link_url: "",
      link_text: "Learn More",
      display_order: 0,
    });
    setImageFile(null);
    setImagePreview("");
    setOriginalImageUrl("");
    setAspectRatioKey('16:9');
    setIsPublic(true);
    setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRecrop = (currentAspectRatio?: string) => {
    if (originalImageUrl) {
      setImageToCrop(originalImageUrl);
      if (currentAspectRatio) {
        setAspectRatioKey(currentAspectRatio as any);
      }
      setCropDialogOpen(true);
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      setUploading(true);

      // Upload the cropped image
      const fileName = `${user.id}/${Date.now()}_cropped_featured.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(fileName, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(fileName);

      // Update preview and form data with aspect ratio
      setImagePreview(publicUrl);
      setFormData({ ...formData, image_url: publicUrl });
      
      toast.success("Image cropped successfully");
    } catch (error) {
      console.error("Error uploading cropped image:", error);
      toast.error("Failed to upload cropped image");
    } finally {
      setUploading(false);
      setCropDialogOpen(false);
    }
  };

  if (loading) {
    return <div>Loading featured items...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Create"} Featured Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={(value) => handleLinkSelection(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom URL</SelectItem>
                  <SelectItem value="page">Internal Page</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="album">Album</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship Page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkType === "page" && (
              <div>
                <Label>Select Page</Label>
                <Select
                  value={formData.link_url || ""}
                  onValueChange={(value) => handleLinkSelection("page", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNAL_PAGES.map((page) => (
                      <SelectItem key={page.value} value={page.value}>
                        {page.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkType === "custom" && (
              <div>
                <label className="block text-sm font-medium mb-1">Link URL</label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  required
                  placeholder="https://... or /events"
                />
              </div>
            )}

            {linkType === "event" && (
              <div>
                <Label>Select Event</Label>
                <Select
                  value={formData.link_url.replace("event:", "")}
                  onValueChange={(value) => handleLinkSelection("event", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkType === "album" && (
              <div>
                <Label>Select Album</Label>
                <Select
                  value={formData.link_url.replace("album:", "")}
                  onValueChange={(value) => handleLinkSelection("album", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an album" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkType === "post" && (
              <div>
                <Label>Select Post</Label>
                <Select
                  value={formData.link_url.replace("post:", "")}
                  onValueChange={(value) => handleLinkSelection("post", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a post" />
                  </SelectTrigger>
                  <SelectContent>
                    {posts.map((post) => (
                      <SelectItem key={post.id} value={post.id}>
                        {post.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div>
              <Label>Image *</Label>
              <div className="space-y-3 mt-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <div className="w-full max-w-md mx-auto" style={{ aspectRatio: aspectRatioKey.replace(':', '/') }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      {originalImageUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRecrop(aspectRatioKey)}
                          title="Recrop image"
                        >
                          <Crop className="h-4 w-4 mr-1" />
                          Recrop
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Image
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload an image for the featured item
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select Image
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {linkType === "sponsorship" && (
              <div className="text-sm text-muted-foreground">
                Will link to: /sponsor-bestie
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <Input
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="isPublic" className="cursor-pointer font-medium">
                  {isPublic ? "Public Item" : "Private Item"}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>Public:</strong> Visible on landing page</p>
                      <p className="mt-1"><strong>Private:</strong> Only visible when logged in</p>
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

            <div className="flex gap-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : editingId ? "Update" : "Create"} Featured Item
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Featured Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground">No featured items yet.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Link: {item.link_url} | Order: {item.display_order}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded inline-block ${
                          item.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded inline-block ${
                          item.is_public
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {item.is_public ? "Public" : "Private"}
                      </span>
                      <span className="text-xs px-2 py-1 rounded inline-block bg-purple-100 text-purple-800">
                        Roles: {item.visible_to_roles?.filter(r => !['admin', 'owner'].includes(r)).join(', ') || 'None'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(item.id, item.is_active)}
                      title={item.is_active ? "Deactivate" : "Activate"}
                      className={item.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
                    >
                      {item.is_active ? <Eye className="h-4 w-4 text-green-700" /> : <EyeOff className="h-4 w-4 text-red-700" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        allowAspectRatioChange={true}
        selectedRatioKey={aspectRatioKey}
        onAspectRatioKeyChange={setAspectRatioKey}
        title="Crop Featured Item Image"
        description="Select aspect ratio and adjust the crop for the featured item carousel"
      />
    </div>
  );
};
