import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Eye, EyeOff, Lock } from "lucide-react";
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

interface HomepageSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
}

interface SortableItemProps {
  section: HomepageSection;
  onToggleVisibility: (id: string, visible: boolean) => void;
  isLocked?: boolean;
}

const LockedItem = ({ section }: { section: HomepageSection }) => {
  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 border-2 border-primary/20 rounded-lg">
      <div className="cursor-not-allowed">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      
      <div className="flex-1">
        <p className="font-medium flex items-center gap-2">
          {section.section_name}
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Locked</span>
        </p>
        <p className="text-sm text-muted-foreground">{section.section_key}</p>
      </div>

      <div className="text-sm text-muted-foreground">Always visible</div>
    </div>
  );
};

const SortableItem = ({ section, onToggleVisibility, isLocked }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isLocked) {
    return <LockedItem section={section} />;
  }

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

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggleVisibility(section.id, !section.is_visible)}
      >
        {section.is_visible ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

const HomepageOrderManager = () => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
        .from("homepage_sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to load homepage sections",
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
    // Prevent toggling hero section
    const section = sections.find(s => s.id === id);
    if (section?.section_key === 'hero') {
      toast({
        title: "Cannot modify hero",
        description: "The hero banner is locked and cannot be hidden",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("homepage_sections")
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
      // Update display_order for each section
      const updates = sections.map((section, index) => ({
        id: section.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("homepage_sections")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Homepage section order saved successfully",
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
        <CardTitle>Homepage Section Order</CardTitle>
        <CardDescription>
          Drag sections to reorder them. Click the eye icon to show/hide sections.
          The hero banner is locked in place and always visible.
          Changes are saved when you click "Save Order".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  isLocked={section.section_key === 'hero'}
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
    </Card>
  );
};

export default HomepageOrderManager;
