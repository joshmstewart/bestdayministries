import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2, Upload, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FeaturedBestie {
  id: string;
  bestie_id: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  featured_month: string;
  is_active: boolean;
  profiles: {
    display_name: string;
  };
}

interface Bestie {
  id: string;
  display_name: string;
}

export const FeaturedBestieManager = () => {
  const { toast } = useToast();
  const [featuredBesties, setFeaturedBesties] = useState<FeaturedBestie[]>([]);
  const [besties, setBesties] = useState<Bestie[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [selectedBestieId, setSelectedBestieId] = useState("");
  const [description, setDescription] = useState("");
  const [featuredMonth, setFeaturedMonth] = useState<Date>();
  const [isActive, setIsActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [featuredData, bestiesData] = await Promise.all([
        supabase
          .from("featured_besties")
          .select("*, profiles!featured_besties_bestie_id_fkey(display_name)")
          .order("featured_month", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, display_name")
          .eq("role", "bestie")
      ]);

      if (featuredData.error) throw featuredData.error;
      if (bestiesData.error) throw bestiesData.error;

      setFeaturedBesties(featuredData.data as any);
      setBesties(bestiesData.data);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = "";
      let audioUrl = null;

      // Upload image (required)
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, "featured-bestie-images");
      } else if (!editingId) {
        throw new Error("Image is required");
      }

      // Upload audio (optional)
      if (audioFile) {
        audioUrl = await uploadFile(audioFile, "featured-bestie-audio");
      }

      const data = {
        bestie_id: selectedBestieId,
        description,
        featured_month: featuredMonth?.toISOString().split("T")[0],
        is_active: isActive,
        ...(imageUrl && { image_url: imageUrl }),
        ...(audioUrl && { voice_note_url: audioUrl }),
      };

      if (editingId) {
        const { error } = await supabase
          .from("featured_besties")
          .update(data)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Featured bestie updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("featured_besties")
          .insert([data]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Featured bestie created successfully",
        });
      }

      resetForm();
      setDialogOpen(false);
      loadData();
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

  const handleEdit = (featured: FeaturedBestie) => {
    setEditingId(featured.id);
    setSelectedBestieId(featured.bestie_id);
    setDescription(featured.description);
    setFeaturedMonth(new Date(featured.featured_month));
    setIsActive(featured.is_active);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this featured bestie?")) return;

    try {
      const { error } = await supabase
        .from("featured_besties")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Featured bestie deleted successfully",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("featured_besties")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Featured bestie ${!currentStatus ? "activated" : "deactivated"}`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedBestieId("");
    setDescription("");
    setFeaturedMonth(undefined);
    setIsActive(false);
    setImageFile(null);
    setAudioFile(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Featured Besties</h2>
          <p className="text-muted-foreground">Manage your featured community members</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Featured Bestie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Featured Bestie</DialogTitle>
              <DialogDescription>
                Add a new featured bestie with their photo, description, and optional voice message
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bestie">Select Bestie</Label>
                <Select value={selectedBestieId} onValueChange={setSelectedBestieId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bestie" />
                  </SelectTrigger>
                  <SelectContent>
                    {besties.map((bestie) => (
                      <SelectItem key={bestie.id} value={bestie.id}>
                        {bestie.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Photo (Required)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  required={!editingId}
                />
                <p className="text-sm text-muted-foreground">Max 5MB • JPG, PNG, WEBP, GIF</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio">Voice Note (Optional)</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-muted-foreground">Max 10MB • MP3, WAV, WEBM</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about this amazing person..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Featured Month</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !featuredMonth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {featuredMonth ? format(featuredMonth, "MMMM yyyy") : "Pick a month"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={featuredMonth}
                      onSelect={setFeaturedMonth}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">Activate immediately</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredBesties.map((featured) => (
          <Card key={featured.id}>
            <CardHeader className="relative">
              <img
                src={featured.image_url}
                alt={featured.profiles.display_name}
                className="w-full h-48 object-cover rounded-t-lg -mt-6 -mx-6 mb-4"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Switch
                  checked={featured.is_active}
                  onCheckedChange={() => toggleActive(featured.id, featured.is_active)}
                />
              </div>
              <CardTitle>{featured.profiles.display_name}</CardTitle>
              <CardDescription>
                {format(new Date(featured.featured_month), "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {featured.description}
              </p>
              {featured.voice_note_url && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Music className="w-4 h-4" />
                  Voice note available
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(featured)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(featured.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-center">
                Status: <span className={featured.is_active ? "text-green-600" : "text-gray-400"}>
                  {featured.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {featuredBesties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No featured besties yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
