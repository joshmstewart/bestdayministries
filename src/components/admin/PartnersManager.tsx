import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Partner {
  id: string;
  name: string;
  description: string | null;
  logo_url: string;
  website_url: string;
  display_order: number;
  is_active: boolean;
}

interface PartnerFormData {
  name: string;
  description: string;
  logo_url: string;
  website_url: string;
}

function SortablePartnerItem({ partner, onEdit, onDelete, onToggleActive }: {
  partner: Partner;
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: partner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-card border rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      
      <img
        src={partner.logo_url}
        alt={partner.name}
        className="w-16 h-16 object-contain rounded"
      />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{partner.name}</h3>
        {partner.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{partner.description}</p>
        )}
        <a
          href={partner.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          {partner.website_url}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onToggleActive(partner.id, !partner.is_active)}
          title={partner.is_active ? "Deactivate" : "Activate"}
          className={partner.is_active ? 
            "bg-green-100 hover:bg-green-200 border-green-300" : 
            "bg-red-100 hover:bg-red-200 border-red-300"}
        >
          {partner.is_active ? (
            <Eye className="w-4 h-4 text-green-700" />
          ) : (
            <EyeOff className="w-4 h-4 text-red-700" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onEdit(partner)}
        >
          <Pencil className="w-4 h-4" />
        </Button>

        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(partner.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function PartnersManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>({
    name: "",
    description: "",
    logo_url: "",
    website_url: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `partners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("app-assets")
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.logo_url || !formData.website_url) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingPartner) {
        const { error } = await supabase
          .from("partners")
          .update({
            name: formData.name,
            description: formData.description || null,
            logo_url: formData.logo_url,
            website_url: formData.website_url,
          })
          .eq("id", editingPartner.id);

        if (error) throw error;
        toast.success("Partner updated successfully");
      } else {
        const { error } = await supabase
          .from("partners")
          .insert({
            name: formData.name,
            description: formData.description || null,
            logo_url: formData.logo_url,
            website_url: formData.website_url,
            display_order: partners.length,
          });

        if (error) throw error;
        toast.success("Partner added successfully");
      }

      setDialogOpen(false);
      setEditingPartner(null);
      setFormData({ name: "", description: "", logo_url: "", website_url: "" });
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to save partner");
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      description: partner.description || "",
      logo_url: partner.logo_url,
      website_url: partner.website_url,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partner?")) return;

    try {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Partner deleted successfully");
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to delete partner");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("partners")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Partner ${isActive ? "activated" : "deactivated"}`);
      fetchPartners();
    } catch (error: any) {
      toast.error("Failed to update partner status");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = partners.findIndex((p) => p.id === active.id);
      const newIndex = partners.findIndex((p) => p.id === over.id);

      const newPartners = arrayMove(partners, oldIndex, newIndex);
      setPartners(newPartners);

      // Update display_order in database
      try {
        const updates = newPartners.map((partner, index) => ({
          id: partner.id,
          display_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from("partners")
            .update({ display_order: update.display_order })
            .eq("id", update.id);
        }

        toast.success("Partner order updated");
      } catch (error: any) {
        toast.error("Failed to update order");
        fetchPartners();
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Partners</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPartner(null);
              setFormData({ name: "", description: "", logo_url: "", website_url: "" });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner" : "Add Partner"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="logo">Logo *</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-contain border rounded"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="website">Website URL *</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadingLogo}>
                  {editingPartner ? "Update" : "Add"} Partner
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Partners ({partners.filter(p => p.is_active).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={partners.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {partners.map((partner) => (
                  <SortablePartnerItem
                    key={partner.id}
                    partner={partner}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {partners.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No partners yet. Click "Add Partner" to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
