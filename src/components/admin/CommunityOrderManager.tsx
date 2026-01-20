import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Eye, EyeOff, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CommunitySection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
  visible_to_roles: string[] | null;
}

const ALL_ROLES = ['supporter', 'bestie', 'caregiver', 'moderator', 'admin', 'owner'] as const;

interface SortableItemProps {
  section: CommunitySection;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onConfigureRoles: (section: CommunitySection) => void;
}

const SortableItem = ({ section, onToggleVisibility, onConfigureRoles }: SortableItemProps) => {
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

  const showRoleConfig = section.section_key === 'newsfeed';

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
        {showRoleConfig && section.visible_to_roles && section.visible_to_roles.length > 0 && (
          <p className="text-xs text-primary mt-1">
            Visible to: {section.visible_to_roles.join(', ')}
          </p>
        )}
      </div>

      {showRoleConfig && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onConfigureRoles(section)}
          title="Configure role access"
        >
          <Settings className="w-4 h-4" />
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
  );
};

const CommunityOrderManager = () => {
  const [sections, setSections] = useState<CommunitySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<CommunitySection | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
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
        .from("community_sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSections((data || []).map(section => ({
        ...section,
        content: (section.content as Record<string, any>) || {},
        visible_to_roles: section.visible_to_roles as string[] | null
      })));
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to load community sections",
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
        .from("community_sections")
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

  const handleConfigureRoles = (section: CommunitySection) => {
    setSelectedSection(section);
    setSelectedRoles(section.visible_to_roles || []);
    setRoleDialogOpen(true);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedSection) return;

    try {
      // Empty array means all roles can access (save as null)
      const rolesToSave = selectedRoles.length === 0 
        ? null 
        : selectedRoles as ("admin" | "bestie" | "caregiver" | "owner" | "supporter" | "vendor")[];
      
      const { error } = await supabase
        .from("community_sections")
        .update({ visible_to_roles: rolesToSave })
        .eq("id", selectedSection.id);

      if (error) throw error;

      setSections((prev) =>
        prev.map((section) =>
          section.id === selectedSection.id 
            ? { ...section, visible_to_roles: rolesToSave } 
            : section
        )
      );

      toast({
        title: "Success",
        description: "Role access updated",
      });
      setRoleDialogOpen(false);
    } catch (error) {
      console.error("Error updating roles:", error);
      toast({
        title: "Error",
        description: "Failed to update role access",
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
          .from("community_sections")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Community section order saved successfully",
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Community Page Section Order</CardTitle>
          <CardDescription>
            Drag sections to reorder them. Click the eye icon to show/hide sections.
            For the Feed tab, click the settings icon to control which roles can access it.
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
                    onConfigureRoles={handleConfigureRoles}
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

      {/* Role Configuration Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Feed Access</DialogTitle>
            <DialogDescription>
              Select which roles can see the Feed tab. If no roles are selected, 
              all authenticated users can access the Feed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {ALL_ROLES.map(role => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="capitalize cursor-pointer">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {selectedRoles.length === 0 
                ? "Currently: All roles can access the Feed"
                : `Currently: Only ${selectedRoles.join(', ')} can access the Feed`
              }
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommunityOrderManager;
