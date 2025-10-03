import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link_url: string;
  link_text: string;
  is_active: boolean;
  display_order: number;
}

export const FeaturedItemManager = () => {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    link_url: "",
    link_text: "Learn More",
    display_order: 0,
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading featured items:", error);
      toast.error("Failed to load featured items");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const itemData = {
        ...formData,
        created_by: user.id,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("featured_items")
          .update(itemData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Featured item updated successfully");
      } else {
        const { error } = await supabase
          .from("featured_items")
          .insert([itemData]);

        if (error) throw error;
        toast.success("Featured item created successfully");
      }

      resetForm();
      loadItems();
    } catch (error) {
      console.error("Error saving featured item:", error);
      toast.error("Failed to save featured item");
    }
  };

  const handleEdit = (item: FeaturedItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url || "",
      link_url: item.link_url,
      link_text: item.link_text,
      display_order: item.display_order,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this featured item?")) return;

    try {
      const { error } = await supabase
        .from("featured_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Featured item deleted successfully");
      loadItems();
    } catch (error) {
      console.error("Error deleting featured item:", error);
      toast.error("Failed to delete featured item");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("featured_items")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Featured item ${!isActive ? "activated" : "deactivated"}`);
      loadItems();
    } catch (error) {
      console.error("Error toggling featured item:", error);
      toast.error("Failed to update featured item");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      image_url: "",
      link_url: "",
      link_text: "Learn More",
      display_order: 0,
    });
  };

  if (loading) {
    return <div>Loading featured items...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Create"} Featured Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL (optional)</label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Link URL</label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                required
                placeholder="https://... or /events"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <Input
                value={formData.link_text}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update" : "Create"} Featured Item
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Featured Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground">No featured items yet.</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Link: {item.link_url} | Order: {item.display_order}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded inline-block mt-2 ${
                        item.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(item.id, item.is_active)}
                    >
                      {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
