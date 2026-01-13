import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GripVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import * as Icons from "lucide-react";
import { INTERNAL_PAGES } from "@/lib/internalPages";

const availableIcons = [
  "Heart", "Gift", "Users", "Coffee", "Home", "Church", "Calendar", "Award",
  "Star", "Sparkles", "HandHeart", "Target", "BookOpen", "Globe", "MapPin",
  "Mail", "Phone", "MessageCircle", "Shield", "Briefcase", "GraduationCap",
  "Building", "Lightbulb", "Palette", "Music", "Camera", "Video", "Newspaper",
  "FileText", "Download", "Upload", "ExternalLink", "Link", "Settings", "Bell",
  "Search", "Filter", "Plus", "Minus", "Check", "X", "ChevronRight", "ChevronLeft",
  "Menu", "Share2", "Send", "Eye", "EyeOff", "Lock", "Unlock", "User", "UserPlus",
  "LogIn", "LogOut", "Trash2", "Edit", "Save", "RefreshCw", "MoreVertical", "MoreHorizontal"
];

const gradientColors = [
  { label: "Primary/Secondary", value: "from-primary/20 to-secondary/5" },
  { label: "Primary Variant", value: "from-primary/20 to-primary-variant/20" },
  { label: "Secondary", value: "from-secondary/10 to-secondary/5" },
  { label: "Accent", value: "from-accent/20 to-accent/10" },
  { label: "Warm Sunset", value: "from-orange-500/20 to-pink-500/20" },
  { label: "Cool Ocean", value: "from-blue-500/20 to-cyan-500/20" },
  { label: "Forest Green", value: "from-green-500/20 to-emerald-500/20" },
  { label: "Purple Dream", value: "from-purple-500/20 to-pink-500/20" },
  { label: "Gold Shine", value: "from-yellow-500/20 to-amber-500/20" },
];

interface QuickLink {
  id: string;
  label: string;
  href: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface SortableLinkProps {
  link: QuickLink;
  onEdit: (link: QuickLink) => void;
  onDelete: (id: string) => void;
  toggleActive: (id: string, isActive: boolean) => void;
  renderIconPreview: (iconName: string) => JSX.Element;
}

function SortableLink({ link, onEdit, onDelete, toggleActive, renderIconPreview }: SortableLinkProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-card border rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color} flex-shrink-0`}>
        {renderIconPreview(link.icon)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{link.label}</p>
        <p className="text-sm text-muted-foreground truncate">{link.href}</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={link.is_active}
          onCheckedChange={(checked) => toggleActive(link.id, checked)}
        />
        <Button variant="ghost" size="sm" onClick={() => onEdit(link)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(link.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function QuickLinksManager() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: "",
    label: "",
    href: "",
    icon: "Link",
    color: "from-primary/20 to-secondary/5",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomUrl, setIsCustomUrl] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("community_quick_links")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error: any) {
      toast.error("Failed to load quick links");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isEditing) {
        const { error } = await supabase
          .from("community_quick_links")
          .update({
            label: formData.label,
            href: formData.href,
            icon: formData.icon,
            color: formData.color,
          })
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Quick link updated");
      } else {
        const { error } = await supabase
          .from("community_quick_links")
          .insert({
            label: formData.label,
            href: formData.href,
            icon: formData.icon,
            color: formData.color,
            display_order: links.length,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Quick link created");
      }

      setFormData({ id: "", label: "", href: "", icon: "Link", color: "from-primary/20 to-secondary/5" });
      setIsEditing(false);
      setIsCustomUrl(false);
      loadLinks();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleEdit = (link: QuickLink) => {
    const isPredefined = INTERNAL_PAGES.some(p => p.value === link.href);
    setIsCustomUrl(!isPredefined);
    setFormData({
      id: link.id,
      label: link.label,
      href: link.href,
      icon: link.icon,
      color: link.color,
    });
    setIsEditing(true);
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quick link?")) return;

    try {
      const { error } = await supabase
        .from("community_quick_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Quick link deleted");
      loadLinks();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("community_quick_links")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Quick link ${isActive ? "activated" : "deactivated"}`);
      loadLinks();
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);

    const newLinks = arrayMove(links, oldIndex, newIndex);
    setLinks(newLinks);

    try {
      const updates = newLinks.map((link, index) => ({
        id: link.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("community_quick_links")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      toast.success("Order updated");
    } catch (error: any) {
      toast.error("Failed to update order");
      console.error(error);
      loadLinks();
    }
  };

  const renderIconPreview = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return <Icons.Link className="h-6 w-6" />;
    return <IconComponent className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading quick links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? "Edit Quick Link" : "Add Quick Link"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Sponsor a Bestie"
                required
              />
            </div>
            <div>
              <Label htmlFor="href">Link URL</Label>
              <Select 
                value={isCustomUrl ? "custom" : formData.href} 
                onValueChange={(value) => {
                  if (value === "custom") {
                    setIsCustomUrl(true);
                    setFormData({ ...formData, href: "" });
                  } else {
                    setIsCustomUrl(false);
                    setFormData({ ...formData, href: value });
                  }
                }}
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
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
              {isCustomUrl && (
                <Input
                  id="href"
                  value={formData.href}
                  onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                  placeholder="/custom-path or https://example.com"
                  className="mt-2"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        {renderIconPreview(icon)}
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="color">Gradient Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradientColors.map((gradient) => (
                    <SelectItem key={gradient.value} value={gradient.value}>
                      {gradient.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              {isEditing ? "Update" : "Add"} Quick Link
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({ id: "", label: "", href: "", icon: "Link", color: "from-primary/20 to-secondary/5" });
                  setIsEditing(false);
                  setIsCustomUrl(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quick Links</h3>
        {links.length === 0 ? (
          <p className="text-muted-foreground">No quick links yet. Add one above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {links.map((link) => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    toggleActive={toggleActive}
                    renderIconPreview={renderIconPreview}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
