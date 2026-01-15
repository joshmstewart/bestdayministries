import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, ExternalLink, Eye, EyeOff, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor, RichTextEditorRef } from "./newsletter/RichTextEditor";
import { ImageCropDialog } from "@/components/ImageCropDialog";

const ICONS = [
  "FileText", "Shield", "DollarSign", "Heart", "Home", "Briefcase",
  "Users", "GraduationCap", "Laptop", "PiggyBank", "Ticket", "HeartHandshake", "BookOpen"
];

const RESOURCE_TYPES = [
  { value: "link", label: "External Link Only" },
  { value: "form", label: "Form/Application" },
  { value: "guide", label: "Guide" },
  { value: "article", label: "Article/Content Page" },
];

const DEFAULT_CATEGORIES = [
  "Government Benefits",
  "Healthcare",
  "Financial Planning",
  "Housing",
  "Employment",
  "Caregiver Support",
  "Education",
  "Technology",
  "Legal",
  "Transportation",
];

interface Attachment {
  name: string;
  url: string;
}

interface ResourceFormData {
  title: string;
  description: string;
  category: string;
  resource_type: string;
  url: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  content: string;
  has_content_page: boolean;
  cover_image_url: string;
  attachments: Attachment[];
}

const defaultFormData: ResourceFormData = {
  title: "",
  description: "",
  category: "Government Benefits",
  resource_type: "link",
  url: "",
  icon: "FileText",
  is_active: true,
  display_order: 0,
  content: "",
  has_content_page: false,
  cover_image_url: "",
  attachments: [],
};

export function GuardianResourcesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ResourceFormData>(defaultFormData);
  const [customCategory, setCustomCategory] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState("");
  const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);

  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["admin-guardian-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_resources")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const existingCategories = [...new Set(resources.map((r) => r.category))];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])].sort();

  const saveMutation = useMutation({
    mutationFn: async (data: ResourceFormData) => {
      const categoryToUse = data.category === "custom" ? customCategory : data.category;
      const payload = { 
        ...data, 
        category: categoryToUse,
        attachments: JSON.parse(JSON.stringify(data.attachments)),
      };

      if (editingId) {
        const { error } = await supabase
          .from("guardian_resources")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("guardian_resources")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardian-resources"] });
      toast.success(editingId ? "Resource updated" : "Resource created");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Failed to save resource: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guardian_resources")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardian-resources"] });
      toast.success("Resource deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("guardian_resources")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guardian-resources"] });
      toast.success("Visibility updated");
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(defaultFormData);
    setCustomCategory("");
    setActiveTab("basic");
  };

  const handleEdit = (resource: any) => {
    setEditingId(resource.id);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      category: resource.category,
      resource_type: resource.resource_type,
      url: resource.url || "",
      icon: resource.icon || "FileText",
      is_active: resource.is_active,
      display_order: resource.display_order,
      content: resource.content || "",
      has_content_page: resource.has_content_page || false,
      cover_image_url: resource.cover_image_url || "",
      attachments: (resource.attachments as Attachment[]) || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      const fileName = `cover-${Date.now()}.jpg`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("guardian-resources")
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("guardian-resources")
        .getPublicUrl(filePath);

      setFormData({ ...formData, cover_image_url: publicUrl });
      setCropDialogOpen(false);
      toast.success("Cover image uploaded");
    } catch (error: any) {
      toast.error("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `attachment-${Date.now()}-${file.name}`;
      const filePath = `attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("guardian-resources")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("guardian-resources")
        .getPublicUrl(filePath);

      setFormData({
        ...formData,
        attachments: [...formData.attachments, { name: file.name, url: publicUrl }],
      });
      toast.success("Attachment uploaded");
    } catch (error: any) {
      toast.error("Failed to upload attachment: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Guardian Resources</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(defaultFormData)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Resource" : "Add Resource"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="content">Content Page</TabsTrigger>
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Resource title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description shown in the resource list"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">+ Custom Category</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.category === "custom" && (
                        <Input
                          placeholder="Enter custom category"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.resource_type}
                        onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESOURCE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">External URL (optional)</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Link to external resource, government website, or form
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={formData.icon}
                        onValueChange={(value) => setFormData({ ...formData, icon: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICONS.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display_order">Display Order</Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active (visible to users)</Label>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <Switch
                      id="has_content_page"
                      checked={formData.has_content_page}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_content_page: checked })}
                    />
                    <div>
                      <Label htmlFor="has_content_page" className="font-medium">Enable Content Page</Label>
                      <p className="text-sm text-muted-foreground">
                        Create a full page with rich content, images, and detailed information
                      </p>
                    </div>
                  </div>

                  {formData.has_content_page && (
                    <>
                      <div className="space-y-2">
                        <Label>Cover Image</Label>
                        {formData.cover_image_url ? (
                          <div className="relative">
                            <img
                              src={formData.cover_image_url}
                              alt="Cover"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => setFormData({ ...formData, cover_image_url: "" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleCoverImageSelect}
                              className="hidden"
                              id="cover-upload"
                            />
                            <Label
                              htmlFor="cover-upload"
                              className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              <div className="text-center">
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  Click to upload cover image
                                </span>
                              </div>
                            </Label>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Page Content</Label>
                        <div className="border rounded-lg">
                          <RichTextEditor
                            ref={editorRef}
                            content={formData.content}
                            onChange={(html) => setFormData({ ...formData, content: html })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="attachments" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>File Attachments</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload PDFs, forms, or other documents for users to download
                    </p>
                    
                    <div>
                      <Input
                        type="file"
                        onChange={handleAttachmentUpload}
                        className="hidden"
                        id="attachment-upload"
                        disabled={uploading}
                      />
                      <Label
                        htmlFor="attachment-upload"
                        className="flex items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {uploading ? "Uploading..." : "Click to upload file"}
                          </span>
                        </div>
                      </Label>
                    </div>

                    {formData.attachments.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {formData.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{attachment.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                  {saveMutation.isPending ? "Saving..." : "Save Resource"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources yet. Add your first resource above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content Page</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate">{resource.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{resource.category}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{resource.resource_type}</TableCell>
                    <TableCell>
                      {resource.has_content_page ? (
                        <Badge variant="default" className="bg-green-600">
                          <FileText className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Link Only</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={resource.is_active ? "default" : "secondary"}>
                        {resource.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {resource.has_content_page && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(`/guardian-resources/${resource.id}`, "_blank")}
                            title="Preview Page"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {resource.url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(resource.url, "_blank")}
                            title="Open External URL"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleActiveMutation.mutate({ id: resource.id, is_active: !resource.is_active })}
                          title={resource.is_active ? "Hide" : "Show"}
                        >
                          {resource.is_active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-red-600" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEdit(resource)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(resource.id)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={imageToCrop}
        onCropComplete={handleCroppedImage}
        allowAspectRatioChange={true}
        selectedRatioKey={aspectRatioKey}
        onAspectRatioKeyChange={setAspectRatioKey}
        title="Crop Cover Image"
        description="Adjust the crop area for the cover image"
      />
    </Card>
  );
}
