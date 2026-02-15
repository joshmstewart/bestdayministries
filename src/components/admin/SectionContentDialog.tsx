import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INTERNAL_PAGES } from "@/lib/internalPages";
import CommunityFeaturesManager from "@/components/admin/CommunityFeaturesManager";
import { Separator } from "@/components/ui/separator";

interface SectionContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: {
    id: string;
    section_key: string;
    section_name: string;
    content: Record<string, any>;
  };
  onSave: () => void;
  tableName?: string; // Default to 'homepage_sections', but can be overridden
}

const SectionContentDialog = ({ open, onOpenChange, section, onSave, tableName = 'homepage_sections' }: SectionContentDialogProps) => {
  const [content, setContent] = useState(section.content || {});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFieldName, setImageFieldName] = useState<string>("image_url");
  const [uploading, setUploading] = useState(false);
  const [albums, setAlbums] = useState<Array<{ id: string; title: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; title: string; video_url: string; video_type?: string; youtube_url?: string | null }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load albums for Joy Rocks section
  useEffect(() => {
    if (section.section_key === 'joy_rocks') {
      const loadAlbums = async () => {
        const { data } = await supabase
          .from('albums')
          .select('id, title')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (data) {
          setAlbums(data);
        }
      };
      loadAlbums();
    }
  }, [section.section_key]);

  // Load videos for Homepage Video section
  useEffect(() => {
    if (section.section_key === 'homepage_video') {
      const loadVideos = async () => {
        const { data } = await supabase
          .from('videos')
          .select('id, title, video_url, video_type, youtube_url')
          .eq('is_active', true)
          .order('title', { ascending: true });
        
        if (data) {
          setVideos(data);
        }
      };
      loadVideos();
    }
  }, [section.section_key]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string = "image_url") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageFile(file);
    setImageFieldName(fieldName);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedContent = { ...content };

      // Upload image if file is selected
      if (imageFile) {
        setUploading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const compressedImage = await compressImage(imageFile, 4.5);
        const fileName = `${user.id}/${Date.now()}_section_${imageFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(fileName, compressedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("app-assets")
          .getPublicUrl(fileName);

        updatedContent[imageFieldName] = publicUrl;
        setUploading(false);
      }

      let error;
      
      // For about_sections table
      if (tableName === 'about_sections') {
        if (section.section_key === 'youtube_channel') {
          // Update youtube_channel content directly in about_sections
          const { error: updateError } = await supabase
            .from("about_sections")
            .update({ content: updatedContent })
            .eq("section_key", "youtube_channel");
          error = updateError;
        } else {
          // For about_content, update the homepage_sections 'about' content (shared content)
          const { error: updateError } = await supabase
            .from("homepage_sections")
            .update({ content: updatedContent })
            .eq("section_key", "about");
          error = updateError;
        }
      } else {
        const { error: updateError } = await supabase
          .from("homepage_sections")
          .update({ content: updatedContent })
          .eq("id", section.id);
        error = updateError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Section content updated successfully",
      });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        title: "Error",
        description: "Failed to update section content",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const renderFields = () => {
    switch (section.section_key) {
      case "hero":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Textarea
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradient_text">Gradient Text (optional)</Label>
              <Input
                id="gradient_text"
                value={content.gradient_text || ""}
                onChange={(e) => setContent({ ...content, gradient_text: e.target.value })}
                placeholder="e.g., BEST DAY EVER"
              />
              <p className="text-xs text-muted-foreground">
                This text will be styled with an orange-to-yellow gradient. Leave empty for no gradient effect.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={content.description || ""}
                onChange={(e) => setContent({ ...content, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={content.button_text || ""}
                onChange={(e) => setContent({ ...content, button_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button_url_type">Button Link Type</Label>
              <Select
                value={content.button_url_type || "internal"}
                onValueChange={(value) => setContent({ ...content, button_url_type: value, button_url: "" })}
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
            {content.button_url_type === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="button_url">Custom URL</Label>
                <Input
                  id="button_url"
                  value={content.button_url || ""}
                  onChange={(e) => setContent({ ...content, button_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="button_url">Internal Page</Label>
                <Select
                  value={content.button_url || ""}
                  onValueChange={(value) => setContent({ ...content, button_url: value })}
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
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stat1_number">Stat 1 Number</Label>
                <Input
                  id="stat1_number"
                  value={content.stat1_number || ""}
                  onChange={(e) => setContent({ ...content, stat1_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat1_label">Stat 1 Label</Label>
                <Input
                  id="stat1_label"
                  value={content.stat1_label || ""}
                  onChange={(e) => setContent({ ...content, stat1_label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat2_number">Stat 2 Number</Label>
                <Input
                  id="stat2_number"
                  value={content.stat2_number || ""}
                  onChange={(e) => setContent({ ...content, stat2_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat2_label">Stat 2 Label</Label>
                <Input
                  id="stat2_label"
                  value={content.stat2_label || ""}
                  onChange={(e) => setContent({ ...content, stat2_label: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Hero Image</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview || content.image_url ? (
                <div className="relative">
                  <img
                    src={imagePreview || content.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
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
                    Upload a hero image
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
        );

      case "mission":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stat1_number">Stat 1 Number</Label>
                <Input
                  id="stat1_number"
                  value={content.stat1_number || ""}
                  onChange={(e) => setContent({ ...content, stat1_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat1_label">Stat 1 Label</Label>
                <Input
                  id="stat1_label"
                  value={content.stat1_label || ""}
                  onChange={(e) => setContent({ ...content, stat1_label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat2_number">Stat 2 Number</Label>
                <Input
                  id="stat2_number"
                  value={content.stat2_number || ""}
                  onChange={(e) => setContent({ ...content, stat2_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat2_label">Stat 2 Label</Label>
                <Input
                  id="stat2_label"
                  value={content.stat2_label || ""}
                  onChange={(e) => setContent({ ...content, stat2_label: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit1_title">Benefit 1 Title</Label>
              <Input
                id="benefit1_title"
                value={content.benefit1_title || ""}
                onChange={(e) => setContent({ ...content, benefit1_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit1_description">Benefit 1 Description</Label>
              <Input
                id="benefit1_description"
                value={content.benefit1_description || ""}
                onChange={(e) => setContent({ ...content, benefit1_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit2_title">Benefit 2 Title</Label>
              <Input
                id="benefit2_title"
                value={content.benefit2_title || ""}
                onChange={(e) => setContent({ ...content, benefit2_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit2_description">Benefit 2 Description</Label>
              <Input
                id="benefit2_description"
                value={content.benefit2_description || ""}
                onChange={(e) => setContent({ ...content, benefit2_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit3_title">Benefit 3 Title</Label>
              <Input
                id="benefit3_title"
                value={content.benefit3_title || ""}
                onChange={(e) => setContent({ ...content, benefit3_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit3_description">Benefit 3 Description</Label>
              <Input
                id="benefit3_description"
                value={content.benefit3_description || ""}
                onChange={(e) => setContent({ ...content, benefit3_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit4_title">Benefit 4 Title</Label>
              <Input
                id="benefit4_title"
                value={content.benefit4_title || ""}
                onChange={(e) => setContent({ ...content, benefit4_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit4_description">Benefit 4 Description</Label>
              <Input
                id="benefit4_description"
                value={content.benefit4_description || ""}
                onChange={(e) => setContent({ ...content, benefit4_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mission_statement">Mission Statement</Label>
              <Textarea
                id="mission_statement"
                value={content.mission_statement || ""}
                onChange={(e) => setContent({ ...content, mission_statement: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mission_description">Mission Description</Label>
              <Textarea
                id="mission_description"
                value={content.mission_description || ""}
                onChange={(e) => setContent({ ...content, mission_description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        );

      case "joy_rocks":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paragraph1">Paragraph 1</Label>
              <Textarea
                id="paragraph1"
                value={content.paragraph1 || ""}
                onChange={(e) => setContent({ ...content, paragraph1: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paragraph2">Paragraph 2</Label>
              <Textarea
                id="paragraph2"
                value={content.paragraph2 || ""}
                onChange={(e) => setContent({ ...content, paragraph2: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="highlight_text">Highlight Text</Label>
              <Input
                id="highlight_text"
                value={content.highlight_text || ""}
                onChange={(e) => setContent({ ...content, highlight_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={content.button_text || ""}
                onChange={(e) => setContent({ ...content, button_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button_url_type">Button Link Type</Label>
              <Select
                value={content.button_url_type || "internal"}
                onValueChange={(value) => setContent({ ...content, button_url_type: value, button_url: "" })}
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
            {content.button_url_type === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="button_url">Custom URL</Label>
                <Input
                  id="button_url"
                  value={content.button_url || ""}
                  onChange={(e) => setContent({ ...content, button_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="button_url">Internal Page</Label>
                <Select
                  value={content.button_url || ""}
                  onValueChange={(value) => setContent({ ...content, button_url: value })}
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
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stat_number">Stat Number</Label>
                <Input
                  id="stat_number"
                  value={content.stat_number || ""}
                  onChange={(e) => setContent({ ...content, stat_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stat_label">Stat Label</Label>
                <Input
                  id="stat_label"
                  value={content.stat_label || ""}
                  onChange={(e) => setContent({ ...content, stat_label: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_type">Display Type</Label>
              <Select
                value={content.display_type || "image"}
                onValueChange={(value) => setContent({ ...content, display_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Static Image</SelectItem>
                  <SelectItem value="album">Album Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {content.display_type === "album" ? (
              <div className="space-y-2">
                <Label htmlFor="album_id">Select Album</Label>
                <Select
                  value={content.album_id || ""}
                  onValueChange={(value) => setContent({ ...content, album_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an album" />
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
            ) : (
              <div className="space-y-2">
                <Label htmlFor="image">Joy Rocks Image</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview || content.image_url ? (
                  <div className="relative">
                    <img
                      src={imagePreview || content.image_url}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
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
                      Upload a Joy Rocks image
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
            )}
          </div>
        );

      case "featured_bestie":
      case "latest_album":
        return (
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={content.title || ""}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
            />
          </div>
        );

      case "youtube_channel":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
                placeholder="YouTube"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
                placeholder="Subscribe to Our Channel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={content.description || ""}
                onChange={(e) => setContent({ ...content, description: e.target.value })}
                rows={3}
                placeholder="Follow our journey and stay updated with our latest videos."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel_url">YouTube Channel URL</Label>
              <Input
                id="channel_url"
                value={content.channel_url || ""}
                onChange={(e) => setContent({ ...content, channel_url: e.target.value })}
                placeholder="https://youtube.com/@yourchannelname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={content.button_text || ""}
                onChange={(e) => setContent({ ...content, button_text: e.target.value })}
                placeholder="Visit Our Channel"
              />
            </div>
          </div>
        );

      case "community_features":
        return (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="badge_text">Badge Text</Label>
                <Input
                  id="badge_text"
                  value={content.badge_text || ""}
                  onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={content.title || ""}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={content.subtitle || ""}
                  onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                />
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Manage Individual Features</h3>
              <CommunityFeaturesManager />
            </div>
          </>
        );

      case "community_gallery":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              />
            </div>
          </>
        );

      case "donate":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="raised_amount">Amount Raised</Label>
                <Input
                  id="raised_amount"
                  type="number"
                  value={content.raised_amount || ""}
                  onChange={(e) => setContent({ ...content, raised_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal_amount">Goal Amount</Label>
                <Input
                  id="goal_amount"
                  type="number"
                  value={content.goal_amount || ""}
                  onChange={(e) => setContent({ ...content, goal_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </>
        );

      case "about":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setContent({ ...content, badge_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setContent({ ...content, heading: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="story_paragraph1">Story Paragraph 1</Label>
              <Textarea
                id="story_paragraph1"
                value={content.story_paragraph1 || ""}
                onChange={(e) => setContent({ ...content, story_paragraph1: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="story_paragraph2">Story Paragraph 2</Label>
              <Textarea
                id="story_paragraph2"
                value={content.story_paragraph2 || ""}
                onChange={(e) => setContent({ ...content, story_paragraph2: e.target.value })}
                rows={3}
              />
            </div>
            <div className="font-bold text-lg mt-6 mb-2">Documentary Section</div>
            <div className="space-y-2">
              <Label htmlFor="doc_title">Documentary Title</Label>
              <Input
                id="doc_title"
                value={content.doc_title || ""}
                onChange={(e) => setContent({ ...content, doc_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc_description">Documentary Description</Label>
              <Textarea
                id="doc_description"
                value={content.doc_description || ""}
                onChange={(e) => setContent({ ...content, doc_description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Documentary Image</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "doc_image_url")}
                  className="cursor-pointer"
                />
                {content.doc_image_url && (
                  <div className="relative inline-block">
                    <img
                      src={content.doc_image_url}
                      alt="Documentary Preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setContent({ ...content, doc_image_url: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t space-y-4">
              <div className="font-semibold">Documentary Platform URLs</div>
              <div className="space-y-2">
                <Label htmlFor="doc_youtube_url">YouTube URL</Label>
                <Input
                  id="doc_youtube_url"
                  type="url"
                  value={content.doc_youtube_url || ""}
                  onChange={(e) => setContent({ ...content, doc_youtube_url: e.target.value })}
                  placeholder="https://youtu.be/PKOW21IHNTG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_vimeo_url">Vimeo URL</Label>
                <Input
                  id="doc_vimeo_url"
                  type="url"
                  value={content.doc_vimeo_url || ""}
                  onChange={(e) => setContent({ ...content, doc_vimeo_url: e.target.value })}
                  placeholder="https://vimeo.com/1007746953"
                />
              </div>
            </div>
            <div className="font-bold text-lg mt-6 mb-2">Best Day Ever Section</div>
            <div className="space-y-2">
              <Label htmlFor="bde_description1">BDE Description 1</Label>
              <Textarea
                id="bde_description1"
                value={content.bde_description1 || ""}
                onChange={(e) => setContent({ ...content, bde_description1: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bde_description2">BDE Description 2</Label>
              <Textarea
                id="bde_description2"
                value={content.bde_description2 || ""}
                onChange={(e) => setContent({ ...content, bde_description2: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>BDE Logo</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "bde_logo_url")}
                  className="cursor-pointer"
                />
                {content.bde_logo_url && (
                  <div className="relative inline-block">
                    <img
                      src={content.bde_logo_url}
                      alt="BDE Logo Preview"
                      className="w-full h-32 object-contain rounded bg-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setContent({ ...content, bde_logo_url: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bde_address">BDE Address</Label>
                <Input
                  id="bde_address"
                  value={content.bde_address || ""}
                  onChange={(e) => setContent({ ...content, bde_address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bde_city">BDE City</Label>
                <Input
                  id="bde_city"
                  value={content.bde_city || ""}
                  onChange={(e) => setContent({ ...content, bde_city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bde_status">BDE Status</Label>
                <Input
                  id="bde_status"
                  value={content.bde_status || ""}
                  onChange={(e) => setContent({ ...content, bde_status: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bde_button_text">BDE Button Text</Label>
                <Input
                  id="bde_button_text"
                  value={content.bde_button_text || ""}
                  onChange={(e) => setContent({ ...content, bde_button_text: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bde_button_link_type">BDE Button Link Type</Label>
              <Select
                value={content.bde_button_link_type || "custom"}
                onValueChange={(value) => setContent({ ...content, bde_button_link_type: value, bde_button_link: "" })}
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
            {content.bde_button_link_type === "custom" ? (
              <div className="space-y-2">
                <Label htmlFor="bde_button_link">BDE Button Link</Label>
                <Input
                  id="bde_button_link"
                  type="url"
                  placeholder="https://example.com"
                  value={content.bde_button_link || ""}
                  onChange={(e) => setContent({ ...content, bde_button_link: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="bde_button_link">BDE Internal Page</Label>
                <Select
                  value={content.bde_button_link || "/"}
                  onValueChange={(value) => setContent({ ...content, bde_button_link: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
            <div className="space-y-2">
              <Label>BDE Image</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e, "bde_image_url")}
                  className="cursor-pointer"
                />
                {content.bde_image_url && (
                  <div className="relative inline-block">
                    <img
                      src={content.bde_image_url}
                      alt="BDE Preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setContent({ ...content, bde_image_url: "" })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "homepage_video":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                placeholder="Featured Video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={content.description || ""}
                onChange={(e) => setContent({ ...content, description: e.target.value })}
                rows={2}
                placeholder="A brief description of the video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video_type">Video Type</Label>
              <Select
                value={content.video_type === 'uploaded' ? 'upload' : (content.video_type || "upload")}
                onValueChange={(value: 'upload' | 'youtube') => {
                  setContent({ 
                    ...content, 
                    video_type: value,
                    video_id: undefined,
                    video_url: undefined,
                    youtube_url: undefined
                  });
                }}
              >
                <SelectTrigger id="video_type">
                  <SelectValue placeholder="Select video type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Uploaded Video</SelectItem>
                  <SelectItem value="youtube">YouTube Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(content.video_type === "upload" || content.video_type === "uploaded") ? (
              <div className="space-y-2">
                <Label htmlFor="video_id">Select Video</Label>
                <Select
                  value={content.video_id || ""}
                  onValueChange={(value) => {
                    const selectedVideo = videos.find(v => v.id === value);
                    if (selectedVideo) {
                      setContent({
                        ...content,
                        video_id: value,
                        video_type: 'upload',
                        video_url: selectedVideo.video_url,
                        youtube_url: undefined
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a video" />
                  </SelectTrigger>
                  <SelectContent>
                    {videos.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No videos available
                      </SelectItem>
                    ) : (
                      videos.map((video) => (
                        <SelectItem key={video.id} value={video.id}>
                          {video.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Upload videos through Admin → Videos tab first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  value={content.youtube_url || ""}
                  onChange={(e) => setContent({ 
                    ...content, 
                    youtube_url: e.target.value,
                    video_id: undefined,
                    video_url: undefined
                  })}
                  placeholder="https://www.youtube.com/watch?v=... or video ID"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the full YouTube URL or just the video ID
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Content (JSON)</Label>
            <Textarea
              value={JSON.stringify(content, null, 2)}
              onChange={(e) => {
                try {
                  setContent(JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${section.section_key === 'community_features' ? 'max-w-6xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Edit {section.section_name}</DialogTitle>
          <DialogDescription>
            {section.section_key === 'community_features' 
              ? 'Update section content and manage individual features'
              : 'Update the content for this landing page section.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderFields()}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving || uploading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectionContentDialog;
