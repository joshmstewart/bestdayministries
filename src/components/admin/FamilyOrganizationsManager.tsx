import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import * as Icons from "lucide-react";

// Common icons for community/organization sites
const availableIcons = [
  'Heart', 'Coffee', 'Home', 'Users', 'MapPin', 'Phone', 'Mail', 
  'Calendar', 'Clock', 'Gift', 'Star', 'Sparkles', 'Church',
  'BookOpen', 'Music', 'Palette', 'Camera', 'Video', 'Mic',
  'Hand', 'Handshake', 'PartyPopper', 'Cake', 'Smile',
  'Sun', 'Cloud', 'Rainbow', 'Flower', 'TreePine',
  'Building', 'Store', 'ShoppingBag', 'Utensils', 'Pizza',
  'MessageCircle', 'MessageSquare', 'Share2', 'Link', 'ExternalLink'
];

// Gradient color options
const gradientColors = [
  { label: 'Primary', value: 'from-primary/20 to-primary-variant/20' },
  { label: 'Orange/Amber', value: 'from-amber-500/20 to-orange-500/20' },
  { label: 'Blue', value: 'from-blue-500/20 to-cyan-500/20' },
  { label: 'Green', value: 'from-green-500/20 to-emerald-500/20' },
  { label: 'Purple', value: 'from-purple-500/20 to-pink-500/20' },
  { label: 'Red', value: 'from-red-500/20 to-rose-500/20' },
  { label: 'Yellow', value: 'from-yellow-500/20 to-amber-500/20' },
];

interface FamilyOrg {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  button_text: string;
  display_order: number;
  is_active: boolean;
}

export const FamilyOrganizationsManager = () => {
  const [orgs, setOrgs] = useState<FamilyOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    icon: "Heart",
    color: "from-primary/20 to-primary-variant/20",
    button_text: "Visit Website",
    display_order: 0,
  });

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from("family_organizations")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setOrgs(data || []);
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const orgData = {
        ...formData,
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from("family_organizations")
          .update(orgData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Organization updated successfully");
      } else {
        const { error } = await supabase
          .from("family_organizations")
          .insert([orgData]);

        if (error) throw error;
        toast.success("Organization created successfully");
      }

      resetForm();
      loadOrgs();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast.error("Failed to save organization");
    }
  };

  const handleEdit = (org: FamilyOrg) => {
    setEditingId(org.id);
    setFormData({
      name: org.name,
      description: org.description,
      url: org.url,
      icon: org.icon,
      color: org.color,
      button_text: org.button_text,
      display_order: org.display_order,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;

    try {
      const { error } = await supabase
        .from("family_organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Organization deleted successfully");
      loadOrgs();
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Failed to delete organization");
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("family_organizations")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Organization ${!isActive ? "activated" : "deactivated"}`);
      loadOrgs();
    } catch (error) {
      console.error("Error toggling organization:", error);
      toast.error("Failed to update organization");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      url: "",
      icon: "Heart",
      color: "from-primary/20 to-primary-variant/20",
      button_text: "Visit Website",
      display_order: 0,
    });
  };

  const renderIconPreview = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    if (!IconComponent) return null;
    return <IconComponent className="w-5 h-5" />;
  };

  if (loading) {
    return <div>Loading organizations...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit" : "Create"} Family Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
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
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="url">URL or Anchor Link</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
                placeholder="https://... or #section"
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {renderIconPreview(formData.icon)}
                      <span>{formData.icon}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        {renderIconPreview(icon)}
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="color">Color Gradient</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-6 rounded bg-gradient-to-r ${formData.color}`} />
                      <span>{gradientColors.find(c => c.value === formData.color)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {gradientColors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-6 rounded bg-gradient-to-r ${color.value}`} />
                        <span>{color.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="button_text">Button Text</Label>
              <Input
                id="button_text"
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Create"} Organization</Button>
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
          <CardTitle>Existing Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${org.color} flex items-center justify-center`}>
                    {renderIconPreview(org.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">{org.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(org.id, org.is_active)}
                  >
                    {org.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(org)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(org.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};