import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link_url: string;
  link_text: string;
  is_active: boolean;
  display_order: number;
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
        supabase.from("events").select("id, title").order("event_date", { ascending: false }),
        supabase.from("albums").select("id, title").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("discussion_posts").select("id, title").eq("approval_status", "approved").order("created_at", { ascending: false })
      ]);

      if (eventsData.data) setEvents(eventsData.data);
      if (albumsData.data) setAlbums(albumsData.data);
      if (postsData.data) setPosts(postsData.data);
    } catch (error) {
      console.error("Error loading link options:", error);
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
    } else if (linkType !== "custom" && !formData.link_url.includes(":")) {
      toast.error(`Please select a ${linkType}`);
      return;
    }

    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = formData.image_url;

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
      }

      const itemData = {
        ...formData,
        link_url: linkType === "sponsorship" ? "/sponsor-bestie" : formData.link_url,
        image_url: imageUrl,
        created_by: user.id,
        is_active: true,
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
    
    if (item.image_url) {
      setImagePreview(item.image_url);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
              <Label>Image</Label>
              <div className="space-y-3 mt-2">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Link Type</Label>
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom URL</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="album">Album</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship Page</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  onValueChange={(value) => setFormData({ ...formData, link_url: `event:${value}` })}
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
                  onValueChange={(value) => setFormData({ ...formData, link_url: `album:${value}` })}
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
                  onValueChange={(value) => setFormData({ ...formData, link_url: `post:${value}` })}
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
                    <span
                      className={`text-xs px-2 py-1 rounded inline-block mt-2 ${
                        item.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(item.id, item.is_active)}
                    >
                      {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
    </div>
  );
};
