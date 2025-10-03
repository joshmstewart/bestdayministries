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
import { Plus, Edit, Trash2, Heart, Upload, Mic, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { compressImage, compressAudio } from "@/lib/imageUtils";
import AudioRecorder from "../AudioRecorder";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface SponsorBestie {
  id: string;
  bestie_id: string | null;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  is_active: boolean;
  is_fully_funded: boolean;
  approval_status: string;
  approved_at: string | null;
  approved_by: string | null;
  monthly_goal: number | null;
  aspect_ratio: string;
  heading_font: string;
  heading_color: string;
  body_font: string;
  body_color: string;
}

export const SponsorBestieManager = () => {
  const { toast } = useToast();
  const [sponsorBesties, setSponsorBesties] = useState<SponsorBestie[]>([]);
  const [bestieAccounts, setBestieAccounts] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [linkedBestieId, setLinkedBestieId] = useState<string>("");
  const [bestieName, setBestieName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFullyFunded, setIsFullyFunded] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('9:16');
  const [headingFont, setHeadingFont] = useState<string>('serif');
  const [headingColor, setHeadingColor] = useState<string>('#D4A574');
  const [bodyFont, setBodyFont] = useState<string>('sans-serif');
  const [bodyColor, setBodyColor] = useState<string>('#000000');

  useEffect(() => {
    loadData();
    loadBestieAccounts();
  }, []);

  const loadBestieAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, display_name")
        .eq("role", "bestie")
        .order("display_name");

      if (error) throw error;
      setBestieAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading bestie accounts:", error);
    }
  };

  const loadData = async () => {
    try {
      const { data: sponsor, error: sponsorError } = await supabase
        .from("sponsor_besties")
        .select("*")
        .order("created_at", { ascending: false });

      if (sponsorError) throw sponsorError;
      setSponsorBesties(sponsor || []);
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
    if (!bestieName || !description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (name and description)",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile && !editingId) {
      toast({
        title: "Missing image",
        description: "Please upload an image for the sponsor bestie",
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
        const compressedImage = await compressImage(imageFile, 4.5);
        imageUrl = await uploadFile(compressedImage, "featured-bestie-images");
      }
      
      // Compress and upload audio if provided
      const audioToUpload = audioBlob || audioFile;
      if (audioToUpload) {
        if (audioBlob) {
          const audioFileFromBlob = new File([audioBlob], `recorded_${Date.now()}.webm`, { type: 'audio/webm' });
          voiceNoteUrl = await uploadFile(audioFileFromBlob, "featured-bestie-audio");
        } else if (audioFile) {
          const compressedAudio = await compressAudio(audioFile, 9.5);
          voiceNoteUrl = await uploadFile(compressedAudio, "featured-bestie-audio");
        }
      }

      // Check if funding goal is met
      let autoFullyFunded = isFullyFunded;
      if (linkedBestieId && monthlyGoal && parseFloat(monthlyGoal) > 0) {
        const { data: sponsorships } = await supabase
          .from("sponsorships")
          .select("amount")
          .eq("bestie_id", linkedBestieId)
          .eq("status", "active")
          .eq("frequency", "monthly");

        if (sponsorships) {
          const currentPledges = sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);
          const goal = parseFloat(monthlyGoal);
          if (currentPledges >= goal) {
            autoFullyFunded = true;
          }
        }
      }

      const data: any = {
        bestie_id: linkedBestieId || null,
        bestie_name: bestieName,
        description,
        is_active: isActive,
        is_fully_funded: autoFullyFunded,
        approval_status: 'approved',
        monthly_goal: monthlyGoal ? parseFloat(monthlyGoal) : null,
        aspect_ratio: aspectRatioKey,
        heading_font: headingFont,
        heading_color: headingColor,
        body_font: bodyFont,
        body_color: bodyColor,
      };

      if (imageFile) {
        data.image_url = imageUrl;
      }
      
      if (audioFile || audioBlob) {
        data.voice_note_url = voiceNoteUrl;
      }

      if (editingId) {
        const { error } = await supabase
          .from("sponsor_besties")
          .update(data)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Sponsor bestie updated successfully" });
      } else {
        if (!imageFile) {
          throw new Error("Image is required for new sponsor bestie");
        }
        const { error } = await supabase
          .from("sponsor_besties")
          .insert(data);

        if (error) throw error;
        toast({ title: "Sponsor bestie created successfully" });
      }

      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving sponsor bestie",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (bestie: SponsorBestie) => {
    setEditingId(bestie.id);
    setLinkedBestieId(bestie.bestie_id || "");
    setBestieName(bestie.bestie_name);
    setDescription(bestie.description);
    setIsActive(bestie.is_active);
    setIsFullyFunded(bestie.is_fully_funded);
    setMonthlyGoal(bestie.monthly_goal ? bestie.monthly_goal.toString() : "");
    setCurrentImageUrl(bestie.image_url);
    setCurrentAudioUrl(bestie.voice_note_url);
    setAspectRatioKey(bestie.aspect_ratio || '9:16');
    setHeadingFont(bestie.heading_font || 'serif');
    setHeadingColor(bestie.heading_color || '#D4A574');
    setBodyFont(bestie.body_font || 'sans-serif');
    setBodyColor(bestie.body_color || '#000000');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sponsor bestie?")) return;

    try {
      const { error } = await supabase
        .from("sponsor_besties")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sponsor bestie deleted successfully" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting sponsor bestie",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("sponsor_besties")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Sponsor bestie ${!currentStatus ? "activated" : "deactivated"}` });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFullyFunded = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("sponsor_besties")
        .update({ is_fully_funded: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Marked as ${!currentStatus ? "fully funded" : "accepting sponsors"}` });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating funding status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setLinkedBestieId("");
    setBestieName("");
    setDescription("");
    setIsActive(true);
    setIsFullyFunded(false);
    setMonthlyGoal("");
    setImageFile(null);
    setAudioFile(null);
    setAudioBlob(null);
    setShowAudioRecorder(false);
    setCurrentImageUrl("");
    setCurrentAudioUrl(null);
    setRawImageUrl(null);
    setImagePreview(null);
    setShowCropDialog(false);
    setAspectRatioKey('9:16');
    setHeadingFont('serif');
    setHeadingColor('#D4A574');
    setBodyFont('sans-serif');
    setBodyColor('#000000');
  };

  const handleCroppedImage = (blob: Blob) => {
    const file = new File([blob], "cropped-bestie.jpg", { type: "image/jpeg" });
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(blob);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sponsorships</h2>
          <p className="text-muted-foreground">Manage besties available for sponsorship</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor Bestie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Create"} Sponsor Bestie
              </DialogTitle>
              <DialogDescription>
                Add a bestie available for sponsorship
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="linked-bestie">Link to Bestie Account (Optional)</Label>
                <Select value={linkedBestieId || "none"} onValueChange={(value) => setLinkedBestieId(value === "none" ? "" : value)}>
                  <SelectTrigger className="bg-background z-50">
                    <SelectValue placeholder="Select a bestie account..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="none">None - No account linked</SelectItem>
                    {bestieAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <Label>Image Aspect Ratio</Label>
                <div className="flex flex-wrap gap-2">
                  {['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'].map((ratio) => (
                    <Button
                      key={ratio}
                      type="button"
                      variant={aspectRatioKey === ratio ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAspectRatioKey(ratio)}
                    >
                      {ratio}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image {!editingId && "*"}</Label>
                {editingId && currentImageUrl && !imagePreview && (
                  <div className="mb-2">
                    <div className="relative inline-block">
                      <img src={currentImageUrl} alt="Current" className="w-32 h-32 object-cover rounded border" />
                      <div className="absolute top-1 right-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setRawImageUrl(currentImageUrl);
                            setShowCropDialog(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {imagePreview && (
                  <div className="mb-2">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowCropDialog(true)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            setRawImageUrl(null);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setRawImageUrl(reader.result as string);
                        setShowCropDialog(true);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio">Voice Note (Optional)</Label>
                {editingId && currentAudioUrl && (
                  <audio controls className="w-full mb-2">
                    <source src={currentAudioUrl} type="audio/mpeg" />
                  </audio>
                )}
                
                {!showAudioRecorder ? (
                  <div className="space-y-2">
                    <Input
                      id="audio"
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp3,audio/webm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAudioFile(file);
                          setAudioBlob(null);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("audio")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {audioFile ? "Change Audio" : "Upload Audio"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAudioRecorder(true)}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Record
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!audioBlob ? (
                      <>
                        <AudioRecorder
                          onRecordingComplete={(blob) => {
                            setAudioBlob(blob);
                            setAudioFile(null);
                          }}
                          onRecordingCancel={() => setShowAudioRecorder(false)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAudioRecorder(false)}
                          className="w-full"
                        >
                          Back
                        </Button>
                      </>
                    ) : (
                      <>
                        <audio controls className="w-full">
                          <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                        </audio>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setAudioBlob(null)}>
                            Re-record
                          </Button>
                          <Button type="button" variant="outline" onClick={() => {
                            setAudioBlob(null);
                            setShowAudioRecorder(false);
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Text Styling</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heading-font">Heading Font</Label>
                    <Select value={headingFont} onValueChange={setHeadingFont}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="sans-serif">Sans Serif</SelectItem>
                        <SelectItem value="monospace">Monospace</SelectItem>
                        <SelectItem value="cursive">Cursive</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heading-color">Heading Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="heading-color"
                        type="color"
                        value={headingColor}
                        onChange={(e) => setHeadingColor(e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={headingColor}
                        onChange={(e) => setHeadingColor(e.target.value)}
                        placeholder="#D4A574"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-font">Body Font</Label>
                    <Select value={bodyFont} onValueChange={setBodyFont}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="sans-serif">Sans Serif</SelectItem>
                        <SelectItem value="monospace">Monospace</SelectItem>
                        <SelectItem value="cursive">Cursive</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-color">Body Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="body-color"
                        type="color"
                        value={bodyColor}
                        onChange={(e) => setBodyColor(e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={bodyColor}
                        onChange={(e) => setBodyColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Heading will automatically be displayed larger (2rem) than body text (1rem)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly-goal">Monthly Sponsorship Goal ($)</Label>
                <Input
                  id="monthly-goal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(e.target.value)}
                  placeholder="e.g., 500.00"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">Active (will show on sponsorship page)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="fully-funded"
                  checked={isFullyFunded}
                  onCheckedChange={setIsFullyFunded}
                />
                <Label htmlFor="fully-funded">Fully Funded</Label>
              </div>

              <div className="flex gap-2 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setDialogOpen(false);
                  }}
                  disabled={uploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ImageCropDialog
        open={showCropDialog}
        onOpenChange={setShowCropDialog}
        imageUrl={rawImageUrl || ""}
        onCropComplete={handleCroppedImage}
        selectedRatioKey={aspectRatioKey as any}
        onAspectRatioKeyChange={(key) => setAspectRatioKey(key)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sponsorBesties.map((bestie) => (
          <Card key={bestie.id} className={cn(
            "relative",
            bestie.is_active && "ring-2 ring-primary"
          )}>
            {bestie.is_active && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
                ACTIVE
              </div>
            )}
            {bestie.is_fully_funded && (
              <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
                ✓ FUNDED
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
              {bestie.monthly_goal && (
                <CardDescription>Goal: ${bestie.monthly_goal}/month</CardDescription>
              )}
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
              <div className="flex flex-col gap-2">
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
                <Button
                  variant={bestie.is_fully_funded ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleFullyFunded(bestie.id, bestie.is_fully_funded)}
                  className="w-full"
                >
                  {bestie.is_fully_funded ? "Mark Accepting Sponsors" : "Mark Fully Funded"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
