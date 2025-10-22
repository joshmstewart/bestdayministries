import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Upload, Play, Pause, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AudioPlayer from "@/components/AudioPlayer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioClip {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  duration: number | null;
  category: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const CATEGORIES = [
  "notification",
  "background",
  "effects",
  "voice",
  "music",
  "other",
];

export const AudioClipsManager = () => {
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClip, setEditingClip] = useState<AudioClip | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    file: null as File | null,
  });

  useEffect(() => {
    fetchClips();
  }, []);

  const fetchClips = async () => {
    try {
      const { data, error } = await supabase
        .from("audio_clips")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClips(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let fileUrl = editingClip?.file_url || "";

      // Upload new file if provided
      if (formData.file) {
        const fileExt = formData.file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("audio-clips")
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("audio-clips").getPublicUrl(filePath);

        fileUrl = publicUrl;

        // Get duration from audio file
        const audio = new Audio(URL.createObjectURL(formData.file));
        await new Promise((resolve) => {
          audio.addEventListener("loadedmetadata", resolve);
        });
      }

      if (editingClip) {
        // Update existing clip
        const { error } = await supabase
          .from("audio_clips")
          .update({
            title: formData.title,
            description: formData.description || null,
            category: formData.category,
            file_url: fileUrl,
          })
          .eq("id", editingClip.id);

        if (error) throw error;
        toast({ title: "Audio clip updated successfully" });
      } else {
        // Create new clip
        const { data: user } = await supabase.auth.getUser();
        const { error } = await supabase.from("audio_clips").insert({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          file_url: fileUrl,
          created_by: user.user?.id,
        });

        if (error) throw error;
        toast({ title: "Audio clip added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchClips();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "other",
      file: null,
    });
    setEditingClip(null);
  };

  const openEditDialog = (clip: AudioClip) => {
    setEditingClip(clip);
    setFormData({
      title: clip.title,
      description: clip.description || "",
      category: clip.category || "other",
      file: null,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this audio clip?")) return;

    try {
      // Delete from storage
      const path = fileUrl.split("/audio-clips/")[1];
      if (path) {
        await supabase.storage.from("audio-clips").remove([path]);
      }

      // Delete from database
      const { error } = await supabase.from("audio_clips").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Audio clip deleted successfully" });
      fetchClips();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleVisibility = async (clip: AudioClip) => {
    try {
      const { error } = await supabase
        .from("audio_clips")
        .update({ is_active: !clip.is_active })
        .eq("id", clip.id);

      if (error) throw error;
      fetchClips();
      toast({
        title: clip.is_active ? "Audio clip hidden" : "Audio clip activated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredClips = clips.filter((clip) => {
    const matchesSearch = clip.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || clip.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audio Clips</h2>
          <p className="text-muted-foreground">
            Manage reusable audio clips for your app
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Audio Clip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClip ? "Edit Audio Clip" : "Add Audio Clip"}
              </DialogTitle>
              <DialogDescription>
                {editingClip
                  ? "Update the audio clip details"
                  : "Upload a new audio clip and add details"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file">
                  Audio File {editingClip ? "(optional - leave empty to keep current)" : "*"}
                </Label>
                <Input
                  id="file"
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    setFormData({ ...formData, file: e.target.files?.[0] || null })
                  }
                  required={!editingClip}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : editingClip ? "Update" : "Add"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search audio clips..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audio clips found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClips.map((clip) => (
                  <TableRow key={clip.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{clip.title}</div>
                        {clip.description && (
                          <div className="text-sm text-muted-foreground">
                            {clip.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {clip.category || "other"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AudioPlayer src={clip.file_url} className="w-48" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleVisibility(clip)}
                        title={clip.is_active ? "Hide" : "Show"}
                      >
                        {clip.is_active ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(clip)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(clip.id, clip.file_url)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
