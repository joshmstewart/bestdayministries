import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ImageUploadWithCrop } from "@/components/common/ImageUploadWithCrop";
import { Edit, Trash2, Plus, GripVertical, Users, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
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

interface TeamMember {
  id: string;
  name: string;
  role_title: string | null;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface SortableTeamMemberProps {
  member: TeamMember;
  onToggleActive: (member: TeamMember) => void;
  onEdit: (member: TeamMember) => void;
  onDelete: (id: string) => void;
}

const SortableTeamMemberItem = ({ member, onToggleActive, onEdit, onDelete }: SortableTeamMemberProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={!member.is_active ? "opacity-50" : ""}>
      <CardContent className="p-3 flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-primary transition-colors">
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
        {member.image_url ? (
          <img src={member.image_url} alt={member.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{member.name}</p>
          {member.role_title && <p className="text-xs text-muted-foreground truncate">{member.role_title}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="icon" variant="outline" onClick={() => onToggleActive(member)} title={member.is_active ? "Hide" : "Show"}>
            {member.is_active ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-destructive" />}
          </Button>
          <Button size="icon" variant="outline" onClick={() => onEdit(member)} title="Edit">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(member.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function TeamMembersManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .order("display_order", { ascending: true });
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const resetForm = () => {
    setName("");
    setRoleTitle("");
    setDescription("");
    setImagePreview(null);
    setImageFile(null);
    setIsActive(true);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setName(member.name);
    setRoleTitle(member.role_title || "");
    setDescription(member.description || "");
    setImagePreview(member.image_url);
    setImageFile(null);
    setIsActive(member.is_active);
    setDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `team-members/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("app-assets").upload(path, file);
    if (error) {
      toast.error("Failed to upload image");
      return null;
    }
    const { data } = supabase.storage.from("app-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);

    let imageUrl = editing?.image_url || null;
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (uploaded) imageUrl = uploaded;
    } else if (!imagePreview) {
      imageUrl = null;
    }

    const payload = {
      name: name.trim(),
      role_title: roleTitle.trim() || null,
      description: description.trim() || null,
      image_url: imageUrl,
      is_active: isActive,
    };

    if (editing) {
      const { error } = await supabase.from("team_members").update(payload).eq("id", editing.id);
      if (error) toast.error("Failed to update");
      else toast.success("Team member updated");
    } else {
      const maxOrder = members.length > 0 ? Math.max(...members.map((m) => m.display_order)) : 0;
      const { error } = await supabase.from("team_members").insert({ ...payload, display_order: maxOrder + 1 });
      if (error) toast.error("Failed to create");
      else toast.success("Team member added");
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this team member?")) return;
    await supabase.from("team_members").delete().eq("id", id);
    toast.success("Deleted");
    fetchMembers();
  };

  const toggleActive = async (member: TeamMember) => {
    await supabase.from("team_members").update({ is_active: !member.is_active }).eq("id", member.id);
    fetchMembers();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = members.findIndex((m) => m.id === active.id);
    const newIndex = members.findIndex((m) => m.id === over.id);
    const newMembers = arrayMove(members, oldIndex, newIndex);
    setMembers(newMembers);

    try {
      for (let i = 0; i < newMembers.length; i++) {
        await supabase
          .from("team_members")
          .update({ display_order: i + 1 })
          .eq("id", newMembers[i].id);
      }
      toast.success("Order updated");
    } catch {
      toast.error("Failed to update order");
      fetchMembers();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Members</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Member
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground text-sm">No team members yet. Add your first one!</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {members.map((member) => (
                <SortableTeamMemberItem
                  key={member.id}
                  member={member}
                  onToggleActive={toggleActive}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Johnson" />
            </div>
            <div>
              <Label>Role / Title</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Executive Director" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short bio..." rows={3} />
            </div>
            <ImageUploadWithCrop
              label="Photo"
              imagePreview={imagePreview}
              onImageChange={(file, preview) => {
                setImageFile(file);
                setImagePreview(preview);
              }}
              aspectRatio="1:1"
              allowAspectRatioChange={false}
            />
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Visible on page</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
