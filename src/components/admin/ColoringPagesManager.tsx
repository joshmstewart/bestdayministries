import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";

export function ColoringPagesManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    difficulty: "easy",
    display_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-coloring-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coloring_pages")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = editingPage?.image_url;

      if (imageFile) {
        setUploading(true);
        const compressed = await compressImage(imageFile);
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("app-assets")
          .upload(`coloring-pages/${fileName}`, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("app-assets")
          .getPublicUrl(`coloring-pages/${fileName}`);
        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      if (!imageUrl) throw new Error("Image is required");

      const payload = { ...data, image_url: imageUrl };

      if (editingPage) {
        const { error } = await supabase
          .from("coloring_pages")
          .update(payload)
          .eq("id", editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coloring_pages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      toast.success(editingPage ? "Page updated!" : "Page created!");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Failed to save: " + (error as Error).message);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coloring_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
      toast.success("Page deleted!");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("coloring_pages")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coloring-pages"] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPage(null);
    setFormData({ title: "", description: "", category: "general", difficulty: "easy", display_order: 0 });
    setImageFile(null);
  };

  const handleEdit = (page: any) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      description: page.description || "",
      category: page.category || "general",
      difficulty: page.difficulty || "easy",
      display_order: page.display_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Coloring Pages</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit" : "Add"} Coloring Page</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Line Art Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  required={!editingPage}
                />
                {editingPage?.image_url && !imageFile && (
                  <img src={editingPage.image_url} alt="Current" className="mt-2 w-32 h-32 object-cover rounded" />
                )}
              </div>
              <Button type="submit" disabled={saveMutation.isPending || uploading} className="w-full">
                {uploading ? "Uploading..." : saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !pages?.length ? (
          <p className="text-muted-foreground">No coloring pages yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pages.map((page) => (
              <div key={page.id} className="relative group border rounded-lg overflow-hidden">
                <img src={page.image_url} alt={page.title} className="w-full aspect-square object-cover" />
                <div className="p-2">
                  <p className="font-medium text-sm truncate">{page.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{page.difficulty}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => toggleActiveMutation.mutate({ id: page.id, is_active: !page.is_active })}
                  >
                    {page.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-red-600" />}
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEdit(page)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => deleteMutation.mutate(page.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
