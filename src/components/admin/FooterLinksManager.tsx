import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, GripVertical, Plus } from "lucide-react";
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
import { INTERNAL_PAGES } from "@/lib/internalPages";

interface FooterSection {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
}

interface FooterLink {
  id: string;
  section_id: string;
  label: string;
  href: string;
  display_order: number;
  is_active: boolean;
}

interface SortableSectionProps {
  section: FooterSection;
  links: FooterLink[];
  onEditSection: (section: FooterSection) => void;
  onDeleteSection: (id: string) => void;
  onToggleSectionActive: (id: string, isActive: boolean) => void;
  onEditLink: (link: FooterLink) => void;
  onDeleteLink: (id: string) => void;
  onToggleLinkActive: (id: string, isActive: boolean) => void;
  onAddLink: (sectionId: string) => void;
  onDragEndLinks: (event: DragEndEvent, sectionId: string) => void;
}

const SortableSection = ({
  section,
  links,
  onEditSection,
  onDeleteSection,
  onToggleSectionActive,
  onEditLink,
  onDeleteLink,
  onToggleLinkActive,
  onAddLink,
  onDragEndLinks,
}: SortableSectionProps) => {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-background p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">{section.title}</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleSectionActive(section.id, section.is_active)}
          >
            {section.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditSection(section)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteSection(section.id)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="ml-8 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => onDragEndLinks(event, section.id)}
        >
          <SortableContext
            items={links.map(link => link.id)}
            strategy={verticalListSortingStrategy}
          >
            {links.map((link) => (
              <SortableLink
                key={link.id}
                link={link}
                onEdit={onEditLink}
                onDelete={onDeleteLink}
                onToggleActive={onToggleLinkActive}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddLink(section.id)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </Button>
      </div>
    </div>
  );
};

interface SortableLinkProps {
  link: FooterLink;
  onEdit: (link: FooterLink) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const SortableLink = ({ link, onEdit, onDelete, onToggleActive }: SortableLinkProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border rounded bg-card"
    >
      <div className="flex items-center gap-2 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{link.label}</p>
          <p className="text-xs text-muted-foreground">{link.href}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleActive(link.id, link.is_active)}
        >
          {link.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(link)}
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(link.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export const FooterLinksManager = () => {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState({
    title: "",
  });
  const [linkFormData, setLinkFormData] = useState({
    section_id: "",
    label: "",
    href: "",
  });
  const [isCustomUrl, setIsCustomUrl] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sectionsResult, linksResult] = await Promise.all([
        supabase.from("footer_sections").select("*").order("display_order", { ascending: true }),
        supabase.from("footer_links").select("*").order("display_order", { ascending: true }),
      ]);

      if (sectionsResult.error) throw sectionsResult.error;
      if (linksResult.error) throw linksResult.error;

      setSections(sectionsResult.data || []);
      setLinks(linksResult.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load footer data");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSectionId) {
        const { error } = await supabase
          .from("footer_sections")
          .update({ title: sectionFormData.title })
          .eq("id", editingSectionId);

        if (error) throw error;
        toast.success("Section updated successfully");
      } else {
        const { error } = await supabase
          .from("footer_sections")
          .insert([{ ...sectionFormData, display_order: sections.length }]);

        if (error) throw error;
        toast.success("Section created successfully");
      }

      resetSectionForm();
      loadData();
    } catch (error) {
      console.error("Error saving section:", error);
      toast.error("Failed to save section");
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingLinkId) {
        const { error } = await supabase
          .from("footer_links")
          .update({ label: linkFormData.label, href: linkFormData.href })
          .eq("id", editingLinkId);

        if (error) throw error;
        toast.success("Link updated successfully");
      } else {
        const sectionLinks = links.filter(l => l.section_id === linkFormData.section_id);
        const { error } = await supabase
          .from("footer_links")
          .insert([{ ...linkFormData, display_order: sectionLinks.length }]);

        if (error) throw error;
        toast.success("Link created successfully");
      }

      resetLinkForm();
      loadData();
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Failed to save link");
    }
  };

  const handleDragEndSections = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const newSections = arrayMove(sections, oldIndex, newIndex);
    setSections(newSections);

    try {
      for (const [index, section] of newSections.entries()) {
        const { error } = await supabase
          .from("footer_sections")
          .update({ display_order: index })
          .eq("id", section.id);
        if (error) throw error;
      }
      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      loadData();
    }
  };

  const handleDragEndLinks = async (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionLinks = links.filter(l => l.section_id === sectionId);
    const oldIndex = sectionLinks.findIndex((l) => l.id === active.id);
    const newIndex = sectionLinks.findIndex((l) => l.id === over.id);
    const newLinks = arrayMove(sectionLinks, oldIndex, newIndex);

    setLinks(prev => [
      ...prev.filter(l => l.section_id !== sectionId),
      ...newLinks
    ]);

    try {
      for (const [index, link] of newLinks.entries()) {
        const { error } = await supabase
          .from("footer_links")
          .update({ display_order: index })
          .eq("id", link.id);
        if (error) throw error;
      }
      toast.success("Order updated successfully");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
      loadData();
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all links in this section.")) return;

    try {
      const { error } = await supabase.from("footer_sections").delete().eq("id", id);
      if (error) throw error;
      toast.success("Section deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const { error } = await supabase.from("footer_links").delete().eq("id", id);
      if (error) throw error;
      toast.success("Link deleted successfully");
      loadData();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    }
  };

  const toggleSectionActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("footer_sections")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Section ${!isActive ? "activated" : "deactivated"}`);
      loadData();
    } catch (error) {
      console.error("Error toggling section:", error);
      toast.error("Failed to update section");
    }
  };

  const toggleLinkActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("footer_links")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Link ${!isActive ? "activated" : "deactivated"}`);
      loadData();
    } catch (error) {
      console.error("Error toggling link:", error);
      toast.error("Failed to update link");
    }
  };

  const resetSectionForm = () => {
    setEditingSectionId(null);
    setSectionFormData({ title: "" });
  };

  const resetLinkForm = () => {
    setEditingLinkId(null);
    setLinkFormData({ section_id: "", label: "", href: "" });
    setIsCustomUrl(false);
  };

  if (loading) {
    return <div>Loading footer settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingSectionId ? "Edit" : "Create"} Footer Section</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="section-title">Section Title</Label>
              <Input
                id="section-title"
                value={sectionFormData.title}
                onChange={(e) => setSectionFormData({ title: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingSectionId ? "Update" : "Create"} Section</Button>
              {editingSectionId && (
                <Button type="button" variant="outline" onClick={resetSectionForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingLinkId ? "Edit" : "Add"} Footer Link</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLinkSubmit} className="space-y-4">
            <div>
              <Label htmlFor="link-section">Section</Label>
              <select
                id="link-section"
                className="w-full p-2 border rounded"
                value={linkFormData.section_id}
                onChange={(e) => setLinkFormData({ ...linkFormData, section_id: e.target.value })}
                required
                disabled={!!editingLinkId}
              >
                <option value="">Select a section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="link-label">Link Label</Label>
              <Input
                id="link-label"
                value={linkFormData.label}
                onChange={(e) => setLinkFormData({ ...linkFormData, label: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="link-href">Link URL</Label>
              <select
                id="link-page-select"
                className="w-full p-2 border rounded mb-2"
                value={isCustomUrl ? "custom" : linkFormData.href}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") {
                    setIsCustomUrl(true);
                    setLinkFormData({ ...linkFormData, href: "" });
                  } else {
                    setIsCustomUrl(false);
                    setLinkFormData({ ...linkFormData, href: value });
                  }
                }}
              >
                <option value="">Select a page</option>
                {INTERNAL_PAGES.map((page) => (
                  <option key={page.value} value={page.value}>
                    {page.label}
                  </option>
                ))}
                <option value="custom">Custom URL</option>
              </select>
              {isCustomUrl && (
                <Input
                  id="link-href"
                  value={linkFormData.href}
                  onChange={(e) => setLinkFormData({ ...linkFormData, href: e.target.value })}
                  placeholder="https://example.com or /custom-path"
                  required
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingLinkId ? "Update" : "Add"} Link</Button>
              {editingLinkId && (
                <Button type="button" variant="outline" onClick={resetLinkForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Sections & Links</CardTitle>
          <p className="text-sm text-muted-foreground">Drag and drop to reorder sections and links</p>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndSections}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    links={links.filter(l => l.section_id === section.id)}
                    onEditSection={(s) => {
                      setEditingSectionId(s.id);
                      setSectionFormData({ title: s.title });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onDeleteSection={deleteSection}
                    onToggleSectionActive={toggleSectionActive}
                    onEditLink={(l) => {
                      setEditingLinkId(l.id);
                      // Check if the href matches any predefined page
                      const isPredefined = INTERNAL_PAGES.some(p => p.value === l.href);
                      setIsCustomUrl(!isPredefined);
                      setLinkFormData({ section_id: l.section_id, label: l.label, href: l.href });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onDeleteLink={deleteLink}
                    onToggleLinkActive={toggleLinkActive}
                    onAddLink={(sectionId) => {
                      setLinkFormData({ section_id: sectionId, label: "", href: "" });
                      setIsCustomUrl(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onDragEndLinks={handleDragEndLinks}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};
