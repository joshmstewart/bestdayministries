import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Upload, Play, Pause, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill' },
];

export const AudioClipsManager = () => {
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClip, setEditingClip] = useState<AudioClip | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [audioSource, setAudioSource] = useState<"upload" | "generate">("upload");
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    file: null as File | null,
    generateText: "",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
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

  const handleGenerateAudio = async () => {
    if (!formData.generateText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to generate audio",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-generate-audio-clip', {
        body: {
          text: formData.generateText,
          voiceId: formData.voiceId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedFileUrl(data.fileUrl);
      toast({ title: "Audio generated successfully!" });
    } catch (error: any) {
      toast({
        title: "Error generating audio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let fileUrl = editingClip?.file_url || "";

      if (audioSource === "generate") {
        // Use generated audio
        if (!generatedFileUrl && !editingClip) {
          throw new Error("Please generate audio first");
        }
        if (generatedFileUrl) {
          fileUrl = generatedFileUrl;
        }
      } else {
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
      generateText: "",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
    });
    setEditingClip(null);
    setAudioSource("upload");
    setGeneratedFileUrl(null);
  };

  const openEditDialog = (clip: AudioClip) => {
    setEditingClip(clip);
    setFormData({
      title: clip.title,
      description: clip.description || "",
      category: clip.category || "other",
      file: null,
      generateText: "",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
    });
    setAudioSource("upload");
    setGeneratedFileUrl(null);
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
                  : "Upload or generate a new audio clip"}
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
                  rows={2}
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

              <Tabs value={audioSource} onValueChange={(v) => setAudioSource(v as "upload" | "generate")}>
                <TabsList className="w-full">
                  <TabsTrigger value="upload" className="flex-1 gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="generate" className="flex-1 gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-4 space-y-2">
                  <Label htmlFor="file">
                    Audio File {editingClip ? "(optional)" : "*"}
                  </Label>
                  <Input
                    id="file"
                    type="file"
                    accept="audio/*"
                    onChange={(e) =>
                      setFormData({ ...formData, file: e.target.files?.[0] || null })
                    }
                    required={!editingClip && audioSource === "upload"}
                  />
                </TabsContent>
                <TabsContent value="generate" className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="voice">Voice</Label>
                    <Select
                      value={formData.voiceId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, voiceId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ELEVENLABS_VOICES.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="generateText">Text to speak *</Label>
                    <Textarea
                      id="generateText"
                      value={formData.generateText}
                      onChange={(e) =>
                        setFormData({ ...formData, generateText: e.target.value })
                      }
                      placeholder="Enter the text you want to convert to speech..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateAudio}
                    disabled={generating || !formData.generateText.trim()}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Audio
                      </>
                    )}
                  </Button>
                  {generatedFileUrl && (
                    <div className="p-3 bg-muted rounded-lg">
                      <Label className="text-sm text-muted-foreground mb-2 block">Preview</Label>
                      <AudioPlayer src={generatedFileUrl} className="w-full" />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading || (audioSource === "generate" && !generatedFileUrl && !editingClip)}
                >
                  {uploading ? "Saving..." : editingClip ? "Update" : "Add"}
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
