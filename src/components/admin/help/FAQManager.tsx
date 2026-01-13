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

export function FAQManager() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const { toast } = useToast();

  type UserRole = "admin" | "bestie" | "caregiver" | "owner" | "supporter" | "vendor";
  
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    visible_to_roles: [] as UserRole[],
    display_order: "0",
    is_active: true,
  });

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    const { data, error } = await supabase
      .from("help_faqs")
      .select("*")
      .order("display_order");

    if (data) setFaqs(data);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load FAQs",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const faqData = {
      question: formData.question,
      answer: formData.answer,
      category: formData.category,
      visible_to_roles: formData.visible_to_roles.length > 0 
        ? formData.visible_to_roles 
        : (['supporter', 'bestie', 'caregiver', 'admin', 'owner'] as UserRole[]),
      display_order: parseInt(formData.display_order),
      is_active: formData.is_active,
    };

    if (editingFaq) {
      const { error } = await supabase
        .from("help_faqs")
        .update(faqData)
        .eq("id", editingFaq.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update FAQ",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "FAQ updated successfully" });
    } else {
      const { error } = await supabase.from("help_faqs").insert([faqData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create FAQ",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "FAQ created successfully" });
    }

    setIsDialogOpen(false);
    resetForm();
    loadFaqs();
  };

  const handleEdit = (faq: any) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      visible_to_roles: faq.visible_to_roles || [],
      display_order: faq.display_order.toString(),
      is_active: faq.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    const { error } = await supabase.from("help_faqs").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete FAQ",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "FAQ deleted successfully" });
    loadFaqs();
  };

  const toggleActive = async (faq: any) => {
    const { error } = await supabase
      .from("help_faqs")
      .update({ is_active: !faq.is_active })
      .eq("id", faq.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to toggle FAQ visibility",
        variant: "destructive",
      });
      return;
    }

    loadFaqs();
  };

  const resetForm = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      category: "general",
      visible_to_roles: [],
      display_order: "0",
      is_active: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">FAQs</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={6}
                  required
                />
              </div>

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
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="games">Games</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="bestie">Bestie</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="supporter">Supporter</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Visible to Roles</Label>
                <div className="space-y-2 p-3 border rounded-md">
                  {(['supporter', 'bestie', 'caregiver', 'admin', 'owner'] as UserRole[]).map((role) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.visible_to_roles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              visible_to_roles: [...formData.visible_to_roles, role as UserRole]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              visible_to_roles: formData.visible_to_roles.filter(r => r !== role)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="capitalize text-sm">{role}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave unchecked to show to all roles
                </p>
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
                  {editingFaq ? "Update FAQ" : "Create FAQ"}
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
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold">{faq.question}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-muted rounded">{faq.category}</span>
                  {faq.visible_to_roles && faq.visible_to_roles.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {faq.visible_to_roles.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleActive(faq)}
                  title={faq.is_active ? "Deactivate" : "Activate"}
                  className={
                    faq.is_active
                      ? "bg-green-100 hover:bg-green-200 border-green-300"
                      : "bg-red-100 hover:bg-red-200 border-red-300"
                  }
                >
                  {faq.is_active ? (
                    <Eye className="w-4 h-4 text-green-700" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-red-700" />
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEdit(faq)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(faq.id)}
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
