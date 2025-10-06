import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Eye, EyeOff, Pencil, ExternalLink, Info } from "lucide-react";
import SectionContentDialog from "./SectionContentDialog";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface AboutSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
}

interface SortableItemProps {
  section: AboutSection;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onEdit: (section: AboutSection) => void;
}

const SortableItem = ({ section, onToggleVisibility, onEdit }: SortableItemProps) => {
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
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <p className="font-medium">{section.section_name}</p>
        <p className="text-sm text-muted-foreground">{section.section_key}</p>
      </div>

      <div className="flex gap-1">
        {section.section_key === 'about_content' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(section)}
            title="Edit content"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToggleVisibility(section.id, !section.is_visible)}
          title={section.is_visible ? "Hide section" : "Show section"}
          className={section.is_visible ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
        >
          {section.is_visible ? (
            <Eye className="w-4 h-4 text-green-700" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-700" />
          )}
        </Button>
      </div>
    </div>
  );
};

const AboutPageManager = () => {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<AboutSection | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("about_sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSections((data || []).map(section => ({
        ...section,
        content: (section.content as Record<string, any>) || {}
      })));
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to load about page sections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from("about_sections")
        .update({ is_visible: visible })
        .eq("id", id);

      if (error) throw error;

      setSections((prev) =>
        prev.map((section) =>
          section.id === id ? { ...section, is_visible: visible } : section
        )
      );

      toast({
        title: "Success",
        description: "Section visibility updated",
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update section visibility",
        variant: "destructive",
      });
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updates = sections.map((section, index) => ({
        id: section.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("about_sections")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "About page section order saved successfully",
      });
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: "Error",
        description: "Failed to save section order",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>About Page Section Order</CardTitle>
            <CardDescription>
              Drag sections to reorder them. Click the eye icon to show/hide sections.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/about")}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Preview About Page
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> The "About Content" section shares its content with the About section on the homepage. 
            Changes made here will reflect on both pages.
          </AlertDescription>
        </Alert>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sections.map((section) => (
                <SortableItem
                  key={section.id}
                  section={section}
                  onToggleVisibility={handleToggleVisibility}
                  onEdit={setEditingSection}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          onClick={handleSaveOrder}
          disabled={saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Order"}
        </Button>
      </CardContent>

      {editingSection && (
        <SectionContentDialog
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          section={editingSection}
          onSave={fetchSections}
          tableName="about_sections"
        />
      )}
    </Card>
  );
};

export default AboutPageManager;
