import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, Coins, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const defaultFormData = {
  name: "", description: "", preview_image_url: "", character_prompt: "",
  is_free: false, price_coins: 100, display_order: 0, is_active: true,
};

export function FitnessAvatarManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<any>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const { data: avatars, isLoading } = useQuery({
    queryKey: ["admin-fitness-avatars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fitness_avatars").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        name: data.name, description: data.description || null,
        preview_image_url: data.preview_image_url || null, character_prompt: data.character_prompt,
        is_free: data.is_free, price_coins: data.is_free ? 0 : data.price_coins,
        display_order: data.display_order, is_active: data.is_active,
      };
      if (data.id) {
        const { error } = await supabase.from("fitness_avatars").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fitness_avatars").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] });
      toast.success(editingAvatar ? "Avatar updated!" : "Avatar created!");
      handleCloseDialog();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fitness_avatars").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }); toast.success("Avatar deleted"); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("fitness_avatars").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-fitness-avatars"] }),
  });

  const handleEdit = (avatar: any) => {
    setEditingAvatar(avatar);
    setFormData({ name: avatar.name, description: avatar.description || "", preview_image_url: avatar.preview_image_url || "",
      character_prompt: avatar.character_prompt, is_free: avatar.is_free, price_coins: avatar.price_coins,
      display_order: avatar.display_order, is_active: avatar.is_active });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditingAvatar(null); setFormData(defaultFormData); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.character_prompt) { toast.error("Name and character prompt are required"); return; }
    saveMutation.mutate({ ...formData, id: editingAvatar?.id });
  };

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fitness Avatars</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setFormData(defaultFormData)}><Plus className="h-4 w-4 mr-1" />Add Avatar</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingAvatar ? "Edit Avatar" : "Create Avatar"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Sporty Cat" /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>Preview Image URL</Label><Input value={formData.preview_image_url} onChange={(e) => setFormData({ ...formData, preview_image_url: e.target.value })} /></div>
                <div className="space-y-2"><Label>Character Prompt *</Label><Textarea value={formData.character_prompt} onChange={(e) => setFormData({ ...formData, character_prompt: e.target.value })} rows={3} /><p className="text-xs text-muted-foreground">Describes the character for AI generation</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Display Order</Label><Input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>Coin Price</Label><Input type="number" value={formData.price_coins} onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })} disabled={formData.is_free} /></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Switch checked={formData.is_free} onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked })} /><Label>Free</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} /><Label>Active</Label></div>
                </div>
                <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Avatar</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {avatars?.map((avatar) => (
              <TableRow key={avatar.id}>
                <TableCell><div className="w-10 h-10 rounded-md bg-muted overflow-hidden">{avatar.preview_image_url ? <img src={avatar.preview_image_url} alt={avatar.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🏃</div>}</div></TableCell>
                <TableCell><p className="font-medium">{avatar.name}</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{avatar.character_prompt}</p></TableCell>
                <TableCell>{avatar.is_free ? <Badge variant="secondary">Free</Badge> : <Badge variant="outline" className="gap-1"><Coins className="h-3 w-3" />{avatar.price_coins}</Badge>}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => toggleActiveMutation.mutate({ id: avatar.id, is_active: !avatar.is_active })}>{avatar.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</Button></TableCell>
                <TableCell className="text-right"><div className="flex items-center justify-end gap-1"><Button size="icon" variant="outline" onClick={() => handleEdit(avatar)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(avatar.id); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
