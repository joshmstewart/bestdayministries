import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Eye, EyeOff, Plus, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  display_order: number;
  is_active: boolean;
}

interface FeatureFormData {
  title: string;
  description: string;
  icon: string;
  gradient: string;
}

const ICON_OPTIONS = [
  "Heart", "Calendar", "MessageSquare", "Users", "Gift", "Link2", 
  "Volume2", "Shield", "Star", "Award", "BookOpen", "Camera",
  "Coffee", "Compass", "Smile", "Sparkles", "Target", "TrendingUp"
];

const GRADIENT_OPTIONS = [
  { label: "Primary/Primary Light", value: "from-primary/20 to-primary/5" },
  { label: "Secondary/Secondary Light", value: "from-secondary/20 to-secondary/5" },
  { label: "Accent/Accent Light", value: "from-accent/20 to-accent/5" },
  { label: "Primary/Secondary", value: "from-primary/20 to-secondary/5" },
  { label: "Secondary/Accent", value: "from-secondary/20 to-accent/5" },
  { label: "Accent/Primary", value: "from-accent/20 to-primary/5" },
  { label: "Primary/Accent", value: "from-primary/20 to-accent/5" },
  { label: "Secondary/Primary", value: "from-secondary/20 to-primary/5" },
];

interface SortableItemProps {
  feature: Feature;
  onToggleActive: (id: string, active: boolean) => void;
  onEdit: (feature: Feature) => void;
  onDelete: (id: string) => void;
}

const SortableItem = ({ feature, onToggleActive, onEdit, onDelete }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-card border rounded-lg ${
        !feature.is_active ? "opacity-60" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{feature.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{feature.description}</p>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(feature)}
          title="Edit feature"
          className="h-8 w-8"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToggleActive(feature.id, !feature.is_active)}
          title={feature.is_active ? "Hide feature" : "Show feature"}
          className={`h-8 w-8 ${feature.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}`}
        >
          {feature.is_active ? (
            <Eye className="w-3 h-3 text-green-700" />
          ) : (
            <EyeOff className="w-3 h-3 text-red-700" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(feature.id)}
          title="Delete feature"
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const CommunityFeaturesManager = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState<FeatureFormData>({
    title: "",
    description: "",
    icon: "Heart",
    gradient: "from-primary/20 to-primary/5",
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("community_features")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error("Error fetching features:", error);
      toast({
        title: "Error",
        description: "Failed to load community features",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = features.findIndex((item) => item.id === active.id);
      const newIndex = features.findIndex((item) => item.id === over.id);
      const newFeatures = arrayMove(features, oldIndex, newIndex);
      
      setFeatures(newFeatures);

      try {
        const updates = newFeatures.map((feature, index) => ({
          id: feature.id,
          display_order: index + 1,
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from("community_features")
            .update({ display_order: update.display_order })
            .eq("id", update.id);

          if (error) throw error;
        }

        toast({
          title: "Success",
          description: "Feature order updated",
        });
      } catch (error) {
        console.error("Error updating order:", error);
        toast({
          title: "Error",
          description: "Failed to update feature order",
          variant: "destructive",
        });
        fetchFeatures();
      }
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("community_features")
        .update({ is_active: active })
        .eq("id", id);

      if (error) throw error;

      setFeatures((prev) =>
        prev.map((feature) =>
          feature.id === id ? { ...feature, is_active: active } : feature
        )
      );

      toast({
        title: "Success",
        description: "Feature visibility updated",
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update feature visibility",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      title: feature.title,
      description: feature.description,
      icon: feature.icon,
      gradient: feature.gradient,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingFeature(null);
    setFormData({
      title: "",
      description: "",
      icon: "Heart",
      gradient: "from-primary/20 to-primary/5",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingFeature) {
        const { error } = await supabase
          .from("community_features")
          .update({
            title: formData.title,
            description: formData.description,
            icon: formData.icon,
            gradient: formData.gradient,
          })
          .eq("id", editingFeature.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_features")
          .insert({
            ...formData,
            created_by: user?.id,
            display_order: features.length + 1,
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingFeature ? "Feature updated" : "Feature added",
      });

      setDialogOpen(false);
      fetchFeatures();
    } catch (error) {
      console.error("Error saving feature:", error);
      toast({
        title: "Error",
        description: "Failed to save feature",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;

    try {
      const { error } = await supabase
        .from("community_features")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feature deleted",
      });

      fetchFeatures();
    } catch (error) {
      console.error("Error deleting feature:", error);
      toast({
        title: "Error",
        description: "Failed to delete feature",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading features...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag to reorder, click eye to show/hide features
        </p>
        <Button onClick={handleAdd} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={features.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {features.map((feature) => (
              <SortableItem
                key={feature.id}
                feature={feature}
                onToggleActive={handleToggleActive}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {features.length === 0 && (
        <p className="text-center text-muted-foreground py-4 text-sm">
          No features added yet. Click "Add Feature" to get started.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingFeature ? "Edit Feature" : "Add Feature"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Featured Bestie of the Month"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this feature..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData({ ...formData, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradient">Gradient</Label>
                <Select
                  value={formData.gradient}
                  onValueChange={(value) => setFormData({ ...formData, gradient: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADIENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingFeature ? "Update" : "Add"} Feature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityFeaturesManager;
