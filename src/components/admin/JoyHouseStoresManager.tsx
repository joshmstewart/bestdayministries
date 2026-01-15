import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Store, ExternalLink, Upload, Plus, Edit, Trash2, MapPin, Clock, Phone, Eye, EyeOff, GripVertical, Image as ImageIcon } from "lucide-react";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { compressImage } from "@/lib/imageUtils";
import { SectionLoadingState } from "@/components/common";

interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hours: { day: string; open: string; close: string }[];
  description: string;
  is_active: boolean;
  display_order: number;
}

interface StoreImage {
  id: string;
  location_id: string | null;
  image_url: string;
  caption: string;
  is_hero: boolean;
  display_order: number;
}

interface PageContent {
  hero_heading: string;
  hero_subheading: string;
  hero_image_url: string;
  history_title: string;
  history_content: string;
  online_store_title: string;
  online_store_description: string;
  online_store_button_text: string;
  online_store_link: string;
}

const DEFAULT_HOURS = [
  { day: "Monday", open: "10:00 AM", close: "6:00 PM" },
  { day: "Tuesday", open: "10:00 AM", close: "6:00 PM" },
  { day: "Wednesday", open: "10:00 AM", close: "6:00 PM" },
  { day: "Thursday", open: "10:00 AM", close: "6:00 PM" },
  { day: "Friday", open: "10:00 AM", close: "6:00 PM" },
  { day: "Saturday", open: "10:00 AM", close: "4:00 PM" },
  { day: "Sunday", open: "Closed", close: "" },
];

const JoyHouseStoresManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [uploadTarget, setUploadTarget] = useState<"hero" | "gallery" | "location">("hero");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [images, setImages] = useState<StoreImage[]>([]);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    description: "",
    hours: DEFAULT_HOURS,
  });

  const [content, setContent] = useState<PageContent>({
    hero_heading: "Joy House Stores",
    hero_subheading: "Visit our brick-and-mortar locations where our Besties create meaningful connections every day.",
    hero_image_url: "",
    history_title: "Our Story",
    history_content: "",
    online_store_title: "Shop Online Too!",
    online_store_description: "",
    online_store_button_text: "Visit Online Store",
    online_store_link: "/joyhousestore",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentRes, locationsRes, imagesRes] = await Promise.all([
        supabase
          .from("joy_house_stores_content")
          .select("setting_value")
          .eq("setting_key", "page_content")
          .maybeSingle(),
        supabase
          .from("joy_house_store_locations")
          .select("*")
          .order("display_order"),
        supabase
          .from("joy_house_store_images")
          .select("*")
          .order("display_order"),
      ]);

      if (contentRes.data?.setting_value) {
        const parsed = typeof contentRes.data.setting_value === "string"
          ? JSON.parse(contentRes.data.setting_value)
          : contentRes.data.setting_value;
        setContent(parsed);
      }

      if (locationsRes.data) {
        setLocations(locationsRes.data.map(loc => ({
          ...loc,
          hours: (loc.hours as { day: string; open: string; close: string }[]) || DEFAULT_HOURS,
        })) as StoreLocation[]);
      }

      if (imagesRes.data) {
        setImages(imagesRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load store data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      // Check if record exists first
      const { data: existing } = await supabase
        .from("joy_house_stores_content")
        .select("id")
        .eq("setting_key", "page_content")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("joy_house_stores_content")
          .update({ setting_value: JSON.parse(JSON.stringify(content)), updated_at: new Date().toISOString() })
          .eq("setting_key", "page_content");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("joy_house_stores_content")
          .insert([{ setting_key: "page_content", setting_value: JSON.parse(JSON.stringify(content)) }]);
        if (error) throw error;
      }
      toast.success("Page content saved!");
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (target: "hero" | "gallery" | "location", locationId?: string) => {
    setUploadTarget(target);
    setSelectedLocationId(locationId || null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedImage(reader.result as string);
          setCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      const tempFile = new File([croppedBlob], `store-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const compressedFile = await compressImage(tempFile, 4.5);
      const filePath = `joy-house-stores/${compressedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, compressedFile, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      if (uploadTarget === "hero") {
        setContent(prev => ({ ...prev, hero_image_url: publicUrl }));
        toast.success("Hero image uploaded!");
      } else if (uploadTarget === "gallery" || uploadTarget === "location") {
        const { error } = await supabase
          .from("joy_house_store_images")
          .insert({
            location_id: selectedLocationId,
            image_url: publicUrl,
            is_hero: false,
            display_order: images.length,
          });
        if (error) throw error;
        toast.success("Image added!");
        loadData();
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      if (editingLocation) {
        const { error } = await supabase
          .from("joy_house_store_locations")
          .update({
            ...locationForm,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingLocation.id);
        if (error) throw error;
        toast.success("Location updated!");
      } else {
        const { error } = await supabase
          .from("joy_house_store_locations")
          .insert({
            ...locationForm,
            display_order: locations.length,
          });
        if (error) throw error;
        toast.success("Location added!");
      }
      setLocationDialogOpen(false);
      resetLocationForm();
      loadData();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const handleEditLocation = (location: StoreLocation) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      address: location.address,
      city: location.city || "",
      state: location.state || "",
      zip: location.zip || "",
      phone: location.phone || "",
      description: location.description || "",
      hours: location.hours || DEFAULT_HOURS,
    });
    setLocationDialogOpen(true);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    try {
      const { error } = await supabase
        .from("joy_house_store_locations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Location deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const handleToggleActive = async (location: StoreLocation) => {
    try {
      const { error } = await supabase
        .from("joy_house_store_locations")
        .update({ is_active: !location.is_active })
        .eq("id", location.id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      const { error } = await supabase
        .from("joy_house_store_images")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Image deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const resetLocationForm = () => {
    setEditingLocation(null);
    setLocationForm({
      name: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      description: "",
      hours: DEFAULT_HOURS,
    });
  };

  const handleHoursChange = (index: number, field: "open" | "close", value: string) => {
    const newHours = [...locationForm.hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setLocationForm(prev => ({ ...prev, hours: newHours }));
  };

  if (loading) {
    return <SectionLoadingState className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            Joy House Stores
          </h2>
          <p className="text-muted-foreground">
            Manage physical store locations and page content
          </p>
        </div>
        <Button
          onClick={() => window.open('/joy-house-stores', '_blank')}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Preview
        </Button>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="content">Page Content</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Main landing content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Heading</Label>
                <Input
                  value={content.hero_heading}
                  onChange={(e) => setContent(prev => ({ ...prev, hero_heading: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Subheading</Label>
                <Textarea
                  value={content.hero_subheading}
                  onChange={(e) => setContent(prev => ({ ...prev, hero_subheading: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Image</Label>
                {content.hero_image_url && (
                  <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden mb-2">
                    <img
                      src={content.hero_image_url}
                      alt="Hero preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleImageSelect("hero")}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Image
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Section */}
          <Card>
            <CardHeader>
              <CardTitle>History/Story Section</CardTitle>
              <CardDescription>Tell your story</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={content.history_title}
                  onChange={(e) => setContent(prev => ({ ...prev, history_title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={content.history_content}
                  onChange={(e) => setContent(prev => ({ ...prev, history_content: e.target.value }))}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Online Store Section */}
          <Card>
            <CardHeader>
              <CardTitle>Online Store Link</CardTitle>
              <CardDescription>Promote your online store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={content.online_store_title}
                  onChange={(e) => setContent(prev => ({ ...prev, online_store_title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={content.online_store_description}
                  onChange={(e) => setContent(prev => ({ ...prev, online_store_description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={content.online_store_button_text}
                    onChange={(e) => setContent(prev => ({ ...prev, online_store_button_text: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Button Link</Label>
                  <Input
                    value={content.online_store_link}
                    onChange={(e) => setContent(prev => ({ ...prev, online_store_link: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveContent} disabled={saving} className="bg-gradient-warm">
              {saving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Store Locations</h3>
            <Dialog open={locationDialogOpen} onOpenChange={(open) => {
              setLocationDialogOpen(open);
              if (!open) resetLocationForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
                  <DialogDescription>Enter the store location details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input
                      value={locationForm.name}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Joy House Downtown"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      value={locationForm.address}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={locationForm.city}
                        onChange={(e) => setLocationForm(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={locationForm.state}
                        onChange={(e) => setLocationForm(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP</Label>
                      <Input
                        value={locationForm.zip}
                        onChange={(e) => setLocationForm(prev => ({ ...prev, zip: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={locationForm.phone}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={locationForm.description}
                      onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="Tell visitors about this location..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours of Operation</Label>
                    <div className="space-y-2 border rounded-lg p-3">
                      {locationForm.hours.map((hour, idx) => (
                        <div key={hour.day} className="grid grid-cols-3 gap-2 items-center">
                          <span className="text-sm font-medium">{hour.day}</span>
                          <Input
                            value={hour.open}
                            onChange={(e) => handleHoursChange(idx, "open", e.target.value)}
                            placeholder="10:00 AM"
                            className="text-sm"
                          />
                          <Input
                            value={hour.close}
                            onChange={(e) => handleHoursChange(idx, "close", e.target.value)}
                            placeholder="6:00 PM"
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveLocation}>{editingLocation ? "Update" : "Add"} Location</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {locations.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No locations added yet. Click "Add Location" to get started.
            </Card>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <Card key={location.id} className={!location.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{location.name}</h4>
                          {!location.is_active && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">Hidden</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {location.address}, {location.city}, {location.state} {location.zip}
                        </div>
                        {location.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {location.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleImageSelect("location", location.id)}
                          title="Add image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleToggleActive(location)}
                          title={location.is_active ? "Hide" : "Show"}
                        >
                          {location.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditLocation(location)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteLocation(location.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Location Images */}
                    {images.filter(img => img.location_id === location.id).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {images.filter(img => img.location_id === location.id).map(img => (
                          <div key={img.id} className="relative group w-20 h-20">
                            <img
                              src={img.image_url}
                              alt={img.caption || "Store image"}
                              className="w-full h-full object-cover rounded"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteImage(img.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">General Gallery Images</h3>
            <Button onClick={() => handleImageSelect("gallery")} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Image
            </Button>
          </div>
          
          {images.filter(img => !img.location_id).length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No gallery images yet. Add images to showcase your stores.
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.filter(img => !img.location_id).map(img => (
                <div key={img.id} className="relative group aspect-square">
                  <img
                    src={img.image_url}
                    alt={img.caption || "Gallery image"}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={selectedImage}
        onCropComplete={handleCropComplete}
        aspectRatio={uploadTarget === "hero" ? 16 / 9 : 1}
        title="Crop Image"
        description="Adjust the crop area"
      />
    </div>
  );
};

export default JoyHouseStoresManager;
