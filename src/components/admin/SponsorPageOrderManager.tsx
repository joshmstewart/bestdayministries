import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Eye, EyeOff } from "lucide-react";
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

interface SponsorPageSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
}

interface SortableItemProps {
  section: SponsorPageSection;
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
        variant={section.is_visible ? "outline" : "outline"}
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

export const SponsorPageOrderManager = () => {
  const [sections, setSections] = useState<SponsorPageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSections();

    const channel = supabase
      .channel('sponsor_page_sections_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sponsor_page_sections' 
      }, () => {
        loadSections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsor_page_sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections((data || []).map(section => ({
        ...section,
        content: section.content as Record<string, any>
      })));
    } catch (error) {
      console.error('Error loading sections:', error);
      toast({
        title: "Error",
        description: "Failed to load sponsor page sections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((item) => item.id === active.id);
      const newIndex = sections.findIndex((item) => item.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);

      try {
        const updates = newSections.map((section, index) => ({
          id: section.id,
          display_order: index + 1,
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from('sponsor_page_sections')
            .update({ display_order: update.display_order })
            .eq('id', update.id);

          if (error) throw error;
        }

        toast({
          title: "Success",
          description: "Section order updated successfully",
        });
      } catch (error) {
        console.error('Error updating order:', error);
        toast({
          title: "Error",
          description: "Failed to update section order",
          variant: "destructive",
        });
        loadSections();
      }
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from('sponsor_page_sections')
        .update({ is_visible: visible })
        .eq('id', id);

      if (error) throw error;

      setSections(sections.map(section => 
        section.id === id ? { ...section, is_visible: visible } : section
      ));

      toast({
        title: "Success",
        description: `Section ${visible ? 'shown' : 'hidden'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update section visibility",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading sections...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sponsor Page Section Order</CardTitle>
        <CardDescription>
          Drag sections to reorder them on the sponsor page. Toggle visibility with the eye icon.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
