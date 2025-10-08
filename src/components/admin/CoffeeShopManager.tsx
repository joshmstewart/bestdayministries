import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Coffee, ExternalLink } from "lucide-react";

const CoffeeShopManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState({
    hero_heading: "Coffee with Purpose. Community with Heart.",
    hero_subheading: "Welcome to Best Day Ever Coffee & Crepes, where every cup and crepe creates opportunities for adults with disabilities in Longmont.",
    hero_image_url: "/images/bestie_and_friend.jpg",
    mission_title: "Our Mission",
    mission_description: "At Best Day Ever, we believe in creating opportunities and fostering independence for adults with disabilities through meaningful employment in a joyful café environment. Our Besties are the heart of our café, bringing smiles and warmth to every cup of coffee and crepe we serve.",
    menu_button_text: "View Our Menu",
    about_button_text: "Meet Our Besties",
    hours_title: "Visit Us",
    hours_content: "Monday - Friday: 7am - 2pm\nSaturday: 8am - 2pm\nSunday: Closed",
    address: "123 Main Street, Longmont, CO",
    phone: "(555) 123-4567"
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

  const handleChange = (field: string, value: string) => {
    setContent(prev => ({ ...prev, [field]: value }));
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
        <Button
          onClick={() => window.open('https://bestdayevercoffeeandcrepes.com', '_blank')}
          variant="outline"
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Site
        </Button>
      </div>

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
            <Label htmlFor="hero_image_url">Hero Image URL</Label>
            <Input
              id="hero_image_url"
              value={content.hero_image_url}
              onChange={(e) => handleChange("hero_image_url", e.target.value)}
              placeholder="/images/hero.jpg"
            />
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
    </div>
  );
};

export default CoffeeShopManager;
