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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Eye, EyeOff, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TourStepBuilder } from "./TourStepBuilder";
import { useNavigate } from "react-router-dom";

export function TourManager() {
  const [tours, setTours] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<any | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    visible_to_roles: ["supporter", "bestie", "caregiver", "admin", "owner"] as string[],
    duration_minutes: "",
    icon: "HelpCircle",
    steps: [] as any[],
    display_order: "0",
    is_active: true,
  });

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = async () => {
    const { data, error } = await supabase
      .from("help_tours")
      .select("*")
      .order("display_order");

    if (data) setTours(data);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tours",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.steps.length === 0) {
      toast({
        title: "No steps",
        description: "Please add at least one step to the tour",
        variant: "destructive",
      });
      return;
    }

    const tourData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      visible_to_roles: formData.visible_to_roles as ("admin" | "bestie" | "caregiver" | "owner" | "supporter")[],
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      icon: formData.icon,
      display_order: parseInt(formData.display_order),
      steps: formData.steps,
      is_active: formData.is_active,
    };

    if (editingTour) {
      const { error } = await supabase
        .from("help_tours")
        .update(tourData)
        .eq("id", editingTour.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update tour",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Tour updated successfully" });
    } else {
      const { error } = await supabase.from("help_tours").insert([tourData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create tour",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Tour created successfully" });
    }

    setIsDialogOpen(false);
    resetForm();
    loadTours();
  };

  const handleEdit = (tour: any) => {
    setEditingTour(tour);
    setFormData({
      title: tour.title,
      description: tour.description,
      category: tour.category,
      visible_to_roles: tour.visible_to_roles || ["supporter", "bestie", "caregiver", "admin", "owner"],
      duration_minutes: tour.duration_minutes?.toString() || "",
      icon: tour.icon,
      steps: Array.isArray(tour.steps) ? tour.steps : [],
      display_order: tour.display_order.toString(),
      is_active: tour.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tour?")) return;

    const { error } = await supabase.from("help_tours").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete tour",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Tour deleted successfully" });
    loadTours();
  };

  const toggleActive = async (tour: any) => {
    const { error } = await supabase
      .from("help_tours")
      .update({ is_active: !tour.is_active })
      .eq("id", tour.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to toggle tour visibility",
        variant: "destructive",
      });
      return;
    }

    loadTours();
  };

  const resetForm = () => {
    setEditingTour(null);
    setFormData({
      title: "",
      description: "",
      category: "general",
      visible_to_roles: ["supporter", "bestie", "caregiver", "admin", "owner"],
      duration_minutes: "",
      icon: "HelpCircle",
      steps: [],
      display_order: "0",
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Product Tours</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Tour
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTour ? "Edit Tour" : "Add New Tour"}</DialogTitle>
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
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="role-specific">Role Specific</SelectItem>
                      <SelectItem value="getting-started">Getting Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Visible to Roles</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {["supporter", "bestie", "caregiver", "admin", "owner"].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={formData.visible_to_roles.includes(role)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              visible_to_roles: [...formData.visible_to_roles, role],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              visible_to_roles: formData.visible_to_roles.filter((r) => r !== role),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`role-${role}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                      >
                        {role}
                      </label>
                    </div>
                  ))}
                </div>
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

              <div>
                <Label>Tour Steps</Label>
                <div className="mt-2">
                  <TourStepBuilder
                    steps={formData.steps}
                    onChange={(steps) => setFormData({ ...formData, steps })}
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
                  {editingTour ? "Update Tour" : "Create Tour"}
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
        {tours.map((tour) => (
          <Card key={tour.id}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{tour.title}</h4>
                <p className="text-sm text-muted-foreground">{tour.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-muted rounded">{tour.category}</span>
                  <span className="text-xs px-2 py-1 bg-muted rounded capitalize">
                    {tour.visible_to_roles?.join(", ") || "all"}
                  </span>
                  {tour.duration_minutes && (
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {tour.duration_minutes} min
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 bg-muted rounded">
                    {tour.steps?.length || 0} steps
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const targetRoute = tour.required_route || '/';
                    navigate(`${targetRoute}?tour=${tour.id}`);
                  }}
                  title="Preview Tour"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleActive(tour)}
                  title={tour.is_active ? "Deactivate" : "Activate"}
                  className={
                    tour.is_active
                      ? "bg-green-100 hover:bg-green-200 border-green-300"
                      : "bg-red-100 hover:bg-red-200 border-red-300"
                  }
                >
                  {tour.is_active ? (
                    <Eye className="w-4 h-4 text-green-700" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-red-700" />
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEdit(tour)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(tour.id)}
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
