import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PetType {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  base_happiness: number;
  base_hunger: number;
  base_energy: number;
  unlock_cost: number;
  is_active: boolean;
  display_order: number;
}

function SortablePetType({
  petType,
  onUpdate,
  onDelete,
}: {
  petType: PetType;
  onUpdate: (id: string, updates: Partial<PetType>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: petType.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-8">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name</Label>
          <Input
            value={petType.name}
            onChange={(e) => onUpdate(petType.id, { name: e.target.value })}
            placeholder="Pet name"
          />
        </div>

        <div>
          <Label className="text-xs">Unlock Cost (coins)</Label>
          <Input
            type="number"
            min="0"
            value={petType.unlock_cost}
            onChange={(e) => onUpdate(petType.id, { unlock_cost: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="col-span-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={petType.description}
            onChange={(e) => onUpdate(petType.id, { description: e.target.value })}
            placeholder="Pet description"
            rows={2}
          />
        </div>

        <div className="col-span-2">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={petType.image_url || ""}
            onChange={(e) => onUpdate(petType.id, { image_url: e.target.value })}
            placeholder="https://example.com/pet.png"
          />
        </div>

        <div>
          <Label className="text-xs">Base Happiness (0-100)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={petType.base_happiness}
            onChange={(e) => onUpdate(petType.id, { base_happiness: parseInt(e.target.value) || 50 })}
          />
        </div>

        <div>
          <Label className="text-xs">Base Hunger (0-100)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={petType.base_hunger}
            onChange={(e) => onUpdate(petType.id, { base_hunger: parseInt(e.target.value) || 50 })}
          />
        </div>

        <div>
          <Label className="text-xs">Base Energy (0-100)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={petType.base_energy}
            onChange={(e) => onUpdate(petType.id, { base_energy: parseInt(e.target.value) || 50 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={petType.is_active}
            onCheckedChange={(checked) => onUpdate(petType.id, { is_active: checked })}
          />
          <div className={`p-1.5 rounded ${petType.is_active ? "bg-green-100" : "bg-red-100"}`}>
            {petType.is_active ? (
              <Eye className="h-4 w-4 text-green-700" />
            ) : (
              <EyeOff className="h-4 w-4 text-red-700" />
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(petType.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PetTypesManager() {
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPetTypes();
  }, []);

  const loadPetTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("pet_types")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPetTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading pet types",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddPetType = () => {
    const newPetType: PetType = {
      id: `temp-${Date.now()}`,
      name: "New Pet Type",
      description: "A wonderful companion",
      image_url: null,
      base_happiness: 50,
      base_hunger: 50,
      base_energy: 50,
      unlock_cost: 0,
      is_active: true,
      display_order: petTypes.length,
    };
    setPetTypes([...petTypes, newPetType]);
  };

  const handleUpdatePetType = (id: string, updates: Partial<PetType>) => {
    setPetTypes(petTypes.map((pt) => (pt.id === id ? { ...pt, ...updates } : pt)));
  };

  const handleDeletePetType = async (id: string) => {
    try {
      if (!id.startsWith("temp-")) {
        const { error } = await supabase.from("pet_types").delete().eq("id", id);
        if (error) throw error;
      }
      setPetTypes(petTypes.filter((pt) => pt.id !== id));
      toast({
        title: "Pet type deleted",
        description: "Pet type has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting pet type",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPetTypes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, display_order: index }));
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        petTypes.map(async (petType) => {
          const isNew = petType.id.startsWith("temp-");
          
          const petTypeData = {
            name: petType.name.trim(),
            description: petType.description.trim(),
            image_url: petType.image_url,
            base_happiness: petType.base_happiness,
            base_hunger: petType.base_hunger,
            base_energy: petType.base_energy,
            unlock_cost: petType.unlock_cost,
            is_active: petType.is_active,
            display_order: petType.display_order,
          };
          
          if (isNew) {
            const { error } = await supabase.from("pet_types").insert([petTypeData]);
            return { error, type: 'insert', petType };
          } else {
            const { error } = await supabase.from("pet_types").update(petTypeData).eq("id", petType.id);
            return { error, type: 'update', petType };
          }
        })
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to save ${errors.length} pet type(s)`);
      }

      toast({
        title: "Pet types saved",
        description: "All pet types have been updated successfully",
      });

      await loadPetTypes();
    } catch (error: any) {
      toast({
        title: "Error saving pet types",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pet Types Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={petTypes.map((pt) => pt.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {petTypes.map((petType) => (
                <SortablePetType
                  key={petType.id}
                  petType={petType}
                  onUpdate={handleUpdatePetType}
                  onDelete={handleDeletePetType}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <Button onClick={handleAddPetType} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Pet Type
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
