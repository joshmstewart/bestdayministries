import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GripVertical, Eye, EyeOff, Loader2, ShoppingBag, Gift, Settings, Plus, Trash2, Edit } from "lucide-react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SupportPageSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
}

interface WayToGive {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient_from: string;
  gradient_to: string;
  icon_gradient_from: string;
  icon_gradient_to: string;
  hover_border_color: string;
  button_text: string;
  button_url: string;
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
}

interface SortableItemProps {
  section: SupportPageSection;
  onToggleVisibility: (id: string, visible: boolean) => void;
}

const SortableItem = ({ section, onToggleVisibility }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${
        !section.is_visible ? "opacity-60" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1">
        <p className="font-medium">{section.section_name}</p>
        <p className="text-sm text-muted-foreground">{section.section_key}</p>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onToggleVisibility(section.id, !section.is_visible)}
        title={section.is_visible ? "Hide section" : "Show section"}
        className={section.is_visible ? 
          "bg-green-100 hover:bg-green-200 border-green-300" : 
          "bg-red-100 hover:bg-red-200 border-red-300"}
      >
        {section.is_visible ? (
          <Eye className="w-4 h-4 text-green-700" />
        ) : (
          <EyeOff className="w-4 h-4 text-red-700" />
        )}
      </Button>
    </div>
  );
};

export const SupportPageManager = () => {
  const [sections, setSections] = useState<SupportPageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amazonUrl, setAmazonUrl] = useState("");
  const [walmartUrl, setWalmartUrl] = useState("");
  const [editingSection, setEditingSection] = useState<SupportPageSection | null>(null);
  const [waysToGive, setWaysToGive] = useState<WayToGive[]>([]);
  const [editingWay, setEditingWay] = useState<WayToGive | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [videos, setVideos] = useState<Array<{ id: string; title: string; video_url: string; video_type?: string; youtube_url?: string | null }>>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSections();
    loadWishlistSettings();
    loadWaysToGive();
    loadVideos();
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from("support_page_sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (data) setSections(data as SupportPageSection[]);
    } catch (error) {
      console.error("Error loading sections:", error);
      toast.error("Failed to load page sections");
    } finally {
      setLoading(false);
    }
  };

  const loadWishlistSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "support_wishlist_urls")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const settings = data.setting_value as any;
        setAmazonUrl(settings.amazon_wishlist_url || "");
        setWalmartUrl(settings.walmart_wishlist_url || "");
      }
    } catch (error) {
      console.error("Error loading wishlist settings:", error);
    }
  };

  const loadWaysToGive = async () => {
    try {
      const { data, error } = await supabase
        .from("ways_to_give")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (data) setWaysToGive(data as WayToGive[]);
    } catch (error) {
      console.error("Error loading ways to give:", error);
      toast.error("Failed to load ways to give");
    }
  };

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, video_url, video_type, youtube_url")
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) throw error;
      if (data) setVideos(data);
    } catch (error) {
      console.error("Error loading videos:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    const newSections = arrayMove(sections, oldIndex, newIndex);
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      display_order: index,
    }));

    setSections(updatedSections);

    try {
      const updates = updatedSections.map((section) =>
        supabase
          .from("support_page_sections")
          .update({ display_order: section.display_order })
          .eq("id", section.id)
      );

      await Promise.all(updates);
      toast.success("Section order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update section order");
      loadSections();
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from("support_page_sections")
        .update({ is_visible: visible })
        .eq("id", id);

      if (error) throw error;

      setSections(sections.map(s => 
        s.id === id ? { ...s, is_visible: visible } : s
      ));
      
      toast.success(visible ? "Section shown" : "Section hidden");
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update section visibility");
    }
  };

  const handleSaveWishlists = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "support_wishlist_urls",
          setting_value: {
            amazon_wishlist_url: amazonUrl,
            walmart_wishlist_url: walmartUrl,
          },
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;
      toast.success("Wishlist URLs saved successfully");
    } catch (error) {
      console.error("Error saving wishlist settings:", error);
      toast.error("Failed to save wishlist settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (!editingSection) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("support_page_sections")
        .update({ content: editingSection.content })
        .eq("id", editingSection.id);

      if (error) throw error;

      setSections(sections.map(s => 
        s.id === editingSection.id ? editingSection : s
      ));
      
      toast.success("Content saved successfully");
      setEditingSection(null);
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWay = async () => {
    if (!editingWay) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (isAddingNew) {
        const { error } = await supabase
          .from("ways_to_give")
          .insert({
            ...editingWay,
            created_by: user?.id
          });

        if (error) throw error;
        toast.success("Way to give created successfully");
      } else {
        const { error } = await supabase
          .from("ways_to_give")
          .update(editingWay)
          .eq("id", editingWay.id);

        if (error) throw error;
        toast.success("Way to give updated successfully");
      }

      await loadWaysToGive();
      setEditingWay(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error saving way to give:", error);
      toast.error("Failed to save way to give");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWay = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("ways_to_give")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadWaysToGive();
      toast.success("Way to give deleted successfully");
    } catch (error) {
      console.error("Error deleting way to give:", error);
      toast.error("Failed to delete way to give");
    }
  };

  const handleToggleWayActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("ways_to_give")
        .update({ is_active: active })
        .eq("id", id);

      if (error) throw error;

      setWaysToGive(waysToGive.map(w => 
        w.id === id ? { ...w, is_active: active } : w
      ));
      
      toast.success(active ? "Item activated" : "Item deactivated");
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    }
  };

  const renderContentEditor = (section: SupportPageSection) => {
    const content = section.content;

    switch (section.section_key) {
      case "header":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="badge_text">Badge Text</Label>
              <Input
                id="badge_text"
                value={content.badge_text || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, badge_text: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="heading">Main Heading</Label>
              <Input
                id="heading"
                value={content.heading || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, heading: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={content.subtitle || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, subtitle: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case "sponsor_bestie":
      case "other_ways":
      case "wishlists":
      case "donation_form":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Section Title</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={content.description || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, description: e.target.value }
                })}
              />
            </div>
          </div>
        );

      case "support_video":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Section Title (Optional)</Label>
              <Input
                id="title"
                value={content.title || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, title: e.target.value }
                })}
                placeholder="Learn About Our Impact"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={content.description || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, description: e.target.value }
                })}
                rows={2}
                placeholder="A brief description of the video"
              />
            </div>
            <div>
              <Label htmlFor="video_type">Video Type</Label>
              <Select
                value={content.video_type === 'uploaded' ? 'upload' : (content.video_type || "upload")}
                onValueChange={(value: 'upload' | 'youtube') => {
                  setEditingSection({
                    ...section,
                    content: { 
                      ...content, 
                      video_type: value,
                      video_id: undefined,
                      video_url: undefined,
                      youtube_url: undefined
                    }
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
              <div>
                <Label htmlFor="video_id">Select Video</Label>
                <Select
                  value={content.video_id || ""}
                  onValueChange={(value) => {
                    const selectedVideo = videos.find(v => v.id === value);
                    if (selectedVideo) {
                      setEditingSection({
                        ...section,
                        content: {
                          ...content,
                          video_id: value,
                          video_type: 'upload',
                          video_url: selectedVideo.video_url,
                          youtube_url: undefined
                        }
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
                <p className="text-xs text-muted-foreground mt-1">
                  Upload videos through Admin → Videos tab first
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  value={content.youtube_url || ""}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: { 
                      ...content, 
                      youtube_url: e.target.value,
                      video_id: undefined,
                      video_url: undefined
                    }
                  })}
                  placeholder="https://www.youtube.com/watch?v=... or video ID"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the full YouTube URL or just the video ID
                </p>
              </div>
            )}
          </div>
        );

      case "impact":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="impact_title">Section Title</Label>
              <Input
                id="impact_title"
                value={content.title || ""}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, title: e.target.value }
                })}
              />
            </div>
            <div>
              <Label>Impact Items (one per line)</Label>
              <Textarea
                rows={6}
                value={(content.items || []).join("\n")}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, items: e.target.value.split("\n").filter(Boolean) }
                })}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">No editor available for this section.</p>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Support Us Page Manager</CardTitle>
        <CardDescription>
          Manage content, section order, and visibility for the Support Us page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="order" className="space-y-4">
          <TabsList>
            <TabsTrigger value="order">Section Order</TabsTrigger>
            <TabsTrigger value="content">Edit Content</TabsTrigger>
            <TabsTrigger value="ways">Ways to Give</TabsTrigger>
            <TabsTrigger value="wishlists">Wishlist URLs</TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Drag sections to reorder them. Click the eye icon to show/hide sections.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sections.map((section) => (
                    <SortableItem
                      key={section.id}
                      section={section}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {editingSection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{editingSection.section_name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(null)}
                  >
                    Cancel
                  </Button>
                </div>
                {renderContentEditor(editingSection)}
                <Button
                  onClick={handleSaveContent}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Select a section to edit its content
                </p>
                {sections.map((section) => (
                  <Button
                    key={section.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setEditingSection(section)}
                  >
                    <span>{section.section_name}</span>
                    <Settings className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ways" className="space-y-4">
            {editingWay ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{isAddingNew ? "Add New Way to Give" : "Edit Way to Give"}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingWay(null);
                      setIsAddingNew(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="way_title">Title</Label>
                    <Input
                      id="way_title"
                      value={editingWay.title}
                      onChange={(e) => setEditingWay({ ...editingWay, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="way_description">Description</Label>
                    <Textarea
                      id="way_description"
                      value={editingWay.description}
                      onChange={(e) => setEditingWay({ ...editingWay, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="way_icon">Icon Name (Lucide)</Label>
                      <Input
                        id="way_icon"
                        value={editingWay.icon}
                        onChange={(e) => setEditingWay({ ...editingWay, icon: e.target.value })}
                        placeholder="Heart, Gift, etc."
                      />
                    </div>

                    <div>
                      <Label htmlFor="way_button_text">Button Text</Label>
                      <Input
                        id="way_button_text"
                        value={editingWay.button_text}
                        onChange={(e) => setEditingWay({ ...editingWay, button_text: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="way_button_url">Button URL</Label>
                    <Input
                      id="way_button_url"
                      value={editingWay.button_url}
                      onChange={(e) => setEditingWay({ ...editingWay, button_url: e.target.value })}
                      placeholder="/sponsor-bestie or https://..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="way_popular"
                      checked={editingWay.is_popular}
                      onChange={(e) => setEditingWay({ ...editingWay, is_popular: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="way_popular">Mark as Popular (shows badge)</Label>
                  </div>
                </div>

                <Button
                  onClick={handleSaveWay}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isAddingNew ? "Create Item" : "Save Changes"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Manage "Other Ways to Give" buttons on the Support Us page
                  </p>
                  <Button
                    onClick={() => {
                      setEditingWay({
                        id: "",
                        title: "",
                        description: "",
                        icon: "Heart",
                        gradient_from: "primary/20",
                        gradient_to: "primary/5",
                        icon_gradient_from: "primary/20",
                        icon_gradient_to: "primary/5",
                        hover_border_color: "primary/50",
                        button_text: "Learn More",
                        button_url: "",
                        is_popular: false,
                        is_active: true,
                        display_order: waysToGive.length
                      });
                      setIsAddingNew(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {waysToGive.map((way) => (
                    <div
                      key={way.id}
                      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${
                        !way.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{way.title}</p>
                          {way.is_popular && (
                            <span className="text-xs bg-gradient-to-r from-primary via-accent to-secondary text-white px-2 py-0.5 rounded-full">
                              ⭐ POPULAR
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{way.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Button: {way.button_text} → {way.button_url}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleWayActive(way.id, !way.is_active)}
                          title={way.is_active ? "Deactivate" : "Activate"}
                          className={way.is_active ? 
                            "bg-green-100 hover:bg-green-200 border-green-300" : 
                            "bg-red-100 hover:bg-red-200 border-red-300"}
                        >
                          {way.is_active ? (
                            <Eye className="w-4 h-4 text-green-700" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-red-700" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingWay(way)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteWay(way.id)}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlists" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amazon-url" className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Amazon Wishlist URL
                </Label>
                <Input
                  id="amazon-url"
                  type="url"
                  placeholder="https://www.amazon.com/hz/wishlist/ls/..."
                  value={amazonUrl}
                  onChange={(e) => setAmazonUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL to your Amazon wishlist. Leave blank to hide.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="walmart-url" className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  Walmart Registry URL
                </Label>
                <Input
                  id="walmart-url"
                  type="url"
                  placeholder="https://www.walmart.com/lists/..."
                  value={walmartUrl}
                  onChange={(e) => setWalmartUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL to your Walmart registry. Leave blank to hide.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveWishlists}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Wishlist URLs
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};