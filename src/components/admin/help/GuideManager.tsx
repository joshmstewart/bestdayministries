import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function GuideManager() {
  const [guides, setGuides] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<any | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    category: "general",
    target_audience: "all",
    reading_time_minutes: "",
    icon: "BookOpen",
    display_order: "0",
    is_active: true,
  });

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    const { data, error } = await supabase
      .from("help_guides")
      .select("*")
      .order("display_order");

    if (data) setGuides(data);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load guides",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const guideData = {
      ...formData,
      reading_time_minutes: formData.reading_time_minutes ? parseInt(formData.reading_time_minutes) : null,
      display_order: parseInt(formData.display_order),
    };

    if (editingGuide) {
      const { error } = await supabase
        .from("help_guides")
        .update(guideData)
        .eq("id", editingGuide.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update guide",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Guide updated successfully" });
    } else {
      const { error } = await supabase.from("help_guides").insert([guideData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create guide",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Guide created successfully" });
    }

    setIsDialogOpen(false);
    resetForm();
    loadGuides();
  };

  const handleEdit = (guide: any) => {
    setEditingGuide(guide);
    setFormData({
      title: guide.title,
      description: guide.description,
      content: guide.content,
      category: guide.category,
      target_audience: guide.target_audience,
      reading_time_minutes: guide.reading_time_minutes?.toString() || "",
      icon: guide.icon,
      display_order: guide.display_order.toString(),
      is_active: guide.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;

    const { error } = await supabase.from("help_guides").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete guide",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Guide deleted successfully" });
    loadGuides();
  };

  const toggleActive = async (guide: any) => {
    const { error } = await supabase
      .from("help_guides")
      .update({ is_active: !guide.is_active })
      .eq("id", guide.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to toggle guide visibility",
        variant: "destructive",
      });
      return;
    }

    loadGuides();
  };

  const resetForm = () => {
    setEditingGuide(null);
    setFormData({
      title: "",
      description: "",
      content: "",
      category: "general",
      target_audience: "all",
      reading_time_minutes: "",
      icon: "BookOpen",
      display_order: "0",
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Guides</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Guide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGuide ? "Edit Guide" : "Add New Guide"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="content">Content (Markdown supported)</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="getting-started">Getting Started</SelectItem>
                      <SelectItem value="features">Features</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Select
                    value={formData.target_audience}
                    onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="bestie">Besties</SelectItem>
                      <SelectItem value="caregiver">Caregivers</SelectItem>
                      <SelectItem value="supporter">Supporters</SelectItem>
                      <SelectItem value="vendor">Vendors</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reading_time">Reading Time (minutes)</Label>
                  <Input
                    id="reading_time"
                    type="number"
                    value={formData.reading_time_minutes}
                    onChange={(e) => setFormData({ ...formData, reading_time_minutes: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingGuide ? "Update Guide" : "Create Guide"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {guides.map((guide) => (
          <Card key={guide.id}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{guide.title}</h4>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-muted rounded">{guide.category}</span>
                  <span className="text-xs px-2 py-1 bg-muted rounded">{guide.target_audience}</span>
                  {guide.reading_time_minutes && (
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {guide.reading_time_minutes} min read
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleActive(guide)}
                  title={guide.is_active ? "Deactivate" : "Activate"}
                  className={
                    guide.is_active
                      ? "bg-green-100 hover:bg-green-200 border-green-300"
                      : "bg-red-100 hover:bg-red-200 border-red-300"
                  }
                >
                  {guide.is_active ? (
                    <Eye className="w-4 h-4 text-green-700" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-red-700" />
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEdit(guide)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(guide.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
