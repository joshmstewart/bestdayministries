import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Coffee, ExternalLink, Upload } from "lucide-react";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { INTERNAL_PAGES } from "@/lib/internalPages";
import { compressImage } from "@/lib/imageUtils";
import CoffeeShopMenuManager from "./CoffeeShopMenuManager";

const CoffeeShopManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [content, setContent] = useState({
    hero_heading: "Coffee with Purpose. Community with Heart.",
    hero_subheading: "Welcome to Best Day Ever Coffee & Crepes, where every cup and crepe creates opportunities for adults with disabilities in Longmont.",
    hero_image_url: "/images/bestie_and_friend.jpg",
    mission_title: "Our Mission",
    mission_description: "At Best Day Ever, we believe in creating opportunities and fostering independence for adults with disabilities through meaningful employment in a joyful café environment. Our Besties are the heart of our café, bringing smiles and warmth to every cup of coffee and crepe we serve.",
    menu_button_text: "View Our Menu",
    menu_button_link: "#menu",
    menu_button_link_type: "custom" as "internal" | "custom",
    about_button_text: "Meet Our Besties",
    about_button_link: "/about",
    about_button_link_type: "internal" as "internal" | "custom",
    hours_title: "Visit Us",
    hours_content: "Monday - Friday: 7am - 2pm\nSaturday: 8am - 2pm\nSunday: Closed",
    address: "123 Main Street, Longmont, CO",
    phone: "(555) 123-4567",
    show_menu: true
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "coffee_shop_content")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const parsedContent = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        setContent(parsedContent);
      }
    } catch (error) {
      console.error("Error loading coffee shop content:", error);
      toast.error("Failed to load coffee shop content");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "coffee_shop_content",
          setting_value: content,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Coffee shop content updated successfully!");
    } catch (error) {
      console.error("Error saving coffee shop content:", error);
      toast.error("Failed to save coffee shop content");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      // Convert Blob to File first
      const tempFile = new File([croppedBlob], `hero-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      
      // Then compress the file
      const compressedFile = await compressImage(tempFile, 4.5);
      const filePath = `coffee-shop/${compressedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, compressedFile, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      handleChange("hero_image_url", publicUrl);
      toast.success("Hero image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Coffee className="w-6 h-6" />
            Coffee Shop Website
          </h2>
          <p className="text-muted-foreground">
            Manage content for bestdayevercoffeeandcrepes.com
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/coffee-shop', '_blank')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </Button>
          <Button
            onClick={() => window.open('https://bestdayevercoffeeandcrepes.com', '_blank')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Live Site
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Site Settings</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <CoffeeShopMenuManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>Main landing page content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero_heading">Heading</Label>
            <Input
              id="hero_heading"
              value={content.hero_heading}
              onChange={(e) => handleChange("hero_heading", e.target.value)}
              placeholder="Coffee with Purpose. Community with Heart."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_subheading">Subheading</Label>
            <Textarea
              id="hero_subheading"
              value={content.hero_subheading}
              onChange={(e) => handleChange("hero_subheading", e.target.value)}
              placeholder="Welcome message..."
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("hero-image-upload")?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Image
              </Button>
              <input
                id="hero-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu_button_text">Menu Button Text</Label>
              <Input
                id="menu_button_text"
                value={content.menu_button_text}
                onChange={(e) => handleChange("menu_button_text", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="about_button_text">About Button Text</Label>
              <Input
                id="about_button_text"
                value={content.about_button_text}
                onChange={(e) => handleChange("about_button_text", e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Menu Button Link Type</Label>
              <Select
                value={content.menu_button_link_type}
                onValueChange={(value: "internal" | "custom") => handleChange("menu_button_link_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Page</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>About Button Link Type</Label>
              <Select
                value={content.about_button_link_type}
                onValueChange={(value: "internal" | "custom") => handleChange("about_button_link_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal Page</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Menu Button Link</Label>
              {content.menu_button_link_type === "internal" ? (
                <Select
                  value={content.menu_button_link}
                  onValueChange={(value) => handleChange("menu_button_link", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
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
                  value={content.menu_button_link}
                  onChange={(e) => handleChange("menu_button_link", e.target.value)}
                  placeholder="#menu or https://..."
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>About Button Link</Label>
              {content.about_button_link_type === "internal" ? (
                <Select
                  value={content.about_button_link}
                  onValueChange={(value) => handleChange("about_button_link", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select page" />
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
                  value={content.about_button_link}
                  onChange={(e) => handleChange("about_button_link", e.target.value)}
                  placeholder="https://..."
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mission Section</CardTitle>
          <CardDescription>Your cafe's mission and purpose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mission_title">Title</Label>
            <Input
              id="mission_title"
              value={content.mission_title}
              onChange={(e) => handleChange("mission_title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mission_description">Description</Label>
            <Textarea
              id="mission_description"
              value={content.mission_description}
              onChange={(e) => handleChange("mission_description", e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Contact Info</CardTitle>
          <CardDescription>Hours, address, and phone number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours_title">Hours Section Title</Label>
            <Input
              id="hours_title"
              value={content.hours_title}
              onChange={(e) => handleChange("hours_title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours_content">Hours of Operation</Label>
            <Textarea
              id="hours_content"
              value={content.hours_content}
              onChange={(e) => handleChange("hours_content", e.target.value)}
              placeholder="Monday - Friday: 7am - 2pm&#10;Saturday: 8am - 2pm"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={content.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={content.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu Display Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Settings</CardTitle>
          <CardDescription>Control menu visibility on the website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="show_menu"
              checked={content.show_menu}
              onChange={(e) => handleChange("show_menu", e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="show_menu">Display full menu on website</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            The menu content is sourced from your existing menu.html page. Toggle this to show or hide it on the main site.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-gradient-warm"
        >
          {saving && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={selectedImage}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
        title="Crop Hero Image"
        description="Adjust the crop area for the hero image"
      />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoffeeShopManager;
