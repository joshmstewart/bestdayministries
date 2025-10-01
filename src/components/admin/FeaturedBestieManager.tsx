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
import { compressImage, compressAudio } from "@/lib/imageUtils";

interface FeaturedBestie {
  id: string;
  bestie_id: string | null;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export const FeaturedBestieManager = () => {
  const { toast } = useToast();
  const [featuredBesties, setFeaturedBesties] = useState<FeaturedBestie[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [bestieName, setBestieName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: featured, error: featuredError } = await supabase
        .from("featured_besties")
        .select("*")
        .order("start_date", { ascending: false });

      if (featuredError) throw featuredError;
      setFeaturedBesties(featured || []);
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
    console.log("Submit clicked", { bestieName, description, startDate, endDate, imageFile, editingId });
    
    if (!bestieName || !description || !startDate || !endDate) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields including start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile && !editingId) {
      toast({
        title: "Missing image",
        description: "Please upload an image for the featured bestie",
        variant: "destructive",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: "Invalid date range",
        description: "End date must be after or equal to start date",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = "";
      let voiceNoteUrl = null;

      // Compress and upload image if new file selected
      if (imageFile) {
        const compressedImage = await compressImage(imageFile, 4.5); // Slightly under 5MB limit
        imageUrl = await uploadFile(compressedImage, "featured-bestie-images");
      }
      
      // Compress and upload audio if provided
      if (audioFile) {
        const compressedAudio = await compressAudio(audioFile, 9.5); // Slightly under 10MB limit
        voiceNoteUrl = await uploadFile(compressedAudio, "featured-bestie-audio");
      }

      const data: any = {
        bestie_name: bestieName,
        description,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        is_active: isActive,
      };

      if (imageFile) {
        data.image_url = imageUrl;
      }
      
      if (audioFile) {
        data.voice_note_url = voiceNoteUrl;
      }

      if (editingId) {
        console.log("Updating bestie with data:", data);
        const { error } = await supabase
          .from("featured_besties")
          .update(data)
          .eq("id", editingId);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        console.log("Update successful");
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
    setBestieName(bestie.bestie_name);
    setDescription(bestie.description);
    setStartDate(new Date(bestie.start_date));
    setEndDate(new Date(bestie.end_date));
    setIsActive(bestie.is_active);
    setCurrentImageUrl(bestie.image_url);
    setCurrentAudioUrl(bestie.voice_note_url);
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
    setBestieName("");
    setDescription("");
    setStartDate(undefined);
    setEndDate(undefined);
    setIsActive(true);
    setImageFile(null);
    setAudioFile(null);
    setCurrentImageUrl("");
    setCurrentAudioUrl(null);
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Create"} Featured Bestie
              </DialogTitle>
              <DialogDescription>
                Feature a community member and schedule when they'll be highlighted
              </DialogDescription>
            </DialogHeader>
            
            <div className="overflow-y-auto flex-1 px-1">
              <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="bestie-name">Bestie Name *</Label>
                <Input
                  id="bestie-name"
                  value={bestieName}
                  onChange={(e) => setBestieName(e.target.value)}
                  placeholder="Enter the bestie's name"
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "Pick end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose specific dates or select the 1st day of a month for both to feature for the whole month
              </p>

              <div className="space-y-2">
                <Label htmlFor="image">Image {!editingId && "*"} (JPEG, PNG, WEBP, GIF - max 5MB)</Label>
                {editingId && currentImageUrl && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Current image:</p>
                    <img src={currentImageUrl} alt="Current" className="w-32 h-32 object-cover rounded border" />
                  </div>
                )}
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
                {editingId && currentAudioUrl && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Current audio:</p>
                    <audio controls className="w-full">
                      <source src={currentAudioUrl} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
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
                <Label htmlFor="active">
                  Active (will show during featured dates)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                This bestie will only appear publicly when both Active is ON and today is within their featured date range
              </p>

              </div>
            </div>

            <div className="border-t pt-4 bg-background">
              <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Update button clicked!");
                    handleSubmit();
                  }} 
                  disabled={uploading} 
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                  alt={bestie.bestie_name}
                  className="object-cover w-full h-full"
                />
              </div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                {bestie.bestie_name}
              </CardTitle>
              <CardDescription>
                {format(new Date(bestie.start_date), "MMM d, yyyy")} - {format(new Date(bestie.end_date), "MMM d, yyyy")}
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
