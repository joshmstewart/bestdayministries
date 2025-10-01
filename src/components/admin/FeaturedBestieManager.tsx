import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Heart, Upload, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FeaturedBestie {
  id: string;
  bestie_id: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  featured_month: string;
  is_active: boolean;
  profiles?: {
    display_name: string;
  };
}

interface BestieProfile {
  id: string;
  display_name: string;
  role: string;
}

export const FeaturedBestieManager = () => {
  const { toast } = useToast();
  const [featuredBesties, setFeaturedBesties] = useState<FeaturedBestie[]>([]);
  const [bestieProfiles, setBestieProfiles] = useState<BestieProfile[]>([]);
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
      // Load featured besties
      const { data: featured, error: featuredError } = await supabase
        .from("featured_besties")
        .select(`
          *,
          profiles:bestie_id (display_name)
        `)
        .order("featured_month", { ascending: false });

      if (featuredError) throw featuredError;
      setFeaturedBesties(featured || []);

      // Load bestie profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("role", "bestie");

      if (profilesError) throw profilesError;
      setBestieProfiles(profiles || []);
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
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!selectedBestieId || !description || !featuredMonth || (!imageFile && !editingId)) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = "";
      let voiceNoteUrl = null;

      // Upload image if new file selected
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, "featured-bestie-images");
      }
      
      // Upload audio if provided
      if (audioFile) {
        voiceNoteUrl = await uploadFile(audioFile, "featured-bestie-audio");
      }

      const data: any = {
        bestie_id: selectedBestieId,
        description,
        featured_month: format(featuredMonth, "yyyy-MM-dd"),
        is_active: isActive,
      };

      if (imageFile) {
        data.image_url = imageUrl;
      }
      
      if (audioFile) {
        data.voice_note_url = voiceNoteUrl;
      }

      if (editingId) {
        const { error } = await supabase
          .from("featured_besties")
          .update(data)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Featured bestie updated successfully" });
      } else {
        if (!imageFile) {
          throw new Error("Image is required for new featured bestie");
        }
        const { error } = await supabase
          .from("featured_besties")
          .insert(data);

        if (error) throw error;
        toast({ title: "Featured bestie created successfully" });
      }

      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving featured bestie",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (bestie: FeaturedBestie) => {
    setEditingId(bestie.id);
    setSelectedBestieId(bestie.bestie_id);
    setDescription(bestie.description);
    setFeaturedMonth(new Date(bestie.featured_month));
    setIsActive(bestie.is_active);
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
      toast({ title: "Featured bestie deleted successfully" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting featured bestie",
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
      toast({ title: `Featured bestie ${!currentStatus ? "activated" : "deactivated"}` });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating status",
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
          <p className="text-muted-foreground">Manage featured community members</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Featured Bestie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Create"} Featured Bestie
              </DialogTitle>
              <DialogDescription>
                Feature a community member and schedule when they'll be highlighted
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bestie">Bestie *</Label>
                <Select value={selectedBestieId} onValueChange={setSelectedBestieId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bestie" />
                  </SelectTrigger>
                  <SelectContent>
                    {bestieProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about this amazing person..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Featured Month *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !featuredMonth && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {featuredMonth ? format(featuredMonth, "MMMM yyyy") : "Pick a month"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={featuredMonth}
                      onSelect={setFeaturedMonth}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image {!editingId && "*"} (JPEG, PNG, WEBP, GIF - max 5MB)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                {editingId && <p className="text-xs text-muted-foreground">Leave empty to keep current image</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio">Voice Note (MP3, WAV - max 10MB)</Label>
                <Input
                  id="audio"
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp3,audio/webm"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
                {editingId && <p className="text-xs text-muted-foreground">Leave empty to keep current audio</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">Active (visible to community)</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} disabled={uploading} className="flex-1">
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredBesties.map((bestie) => (
          <Card key={bestie.id} className={cn(
            "relative",
            bestie.is_active && "ring-2 ring-primary"
          )}>
            {bestie.is_active && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
                ACTIVE
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="aspect-video relative overflow-hidden rounded-lg mb-2">
                <img
                  src={bestie.image_url}
                  alt={bestie.profiles?.display_name}
                  className="object-cover w-full h-full"
                />
              </div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                {bestie.profiles?.display_name}
              </CardTitle>
              <CardDescription>
                {format(new Date(bestie.featured_month), "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bestie.description}
              </p>
              {bestie.voice_note_url && (
                <audio controls className="w-full">
                  <source src={bestie.voice_note_url} type="audio/mpeg" />
                </audio>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(bestie.id, bestie.is_active)}
                  className="flex-1"
                >
                  {bestie.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(bestie)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(bestie.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {featuredBesties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Featured Besties Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start featuring community members to highlight their stories
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Featured Bestie
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
