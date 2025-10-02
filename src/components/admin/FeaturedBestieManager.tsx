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
import { Plus, Edit, Trash2, Heart, Upload, Calendar, Mic, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { compressImage, compressAudio } from "@/lib/imageUtils";
import AudioRecorder from "../AudioRecorder";
import { ImageCropDialog } from "@/components/ImageCropDialog";

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
  available_for_sponsorship: boolean;
  is_fully_funded: boolean;
  approval_status: string;
  approved_at: string | null;
  approved_by: string | null;
  monthly_goal: number | null;
}

export const FeaturedBestieManager = () => {
  const { toast } = useToast();
  const [featuredBesties, setFeaturedBesties] = useState<FeaturedBestie[]>([]);
  const [bestieAccounts, setBestieAccounts] = useState<{ id: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [linkedBestieId, setLinkedBestieId] = useState<string>("");
  const [bestieName, setBestieName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isActive, setIsActive] = useState(true);
  const [availableForSponsorship, setAvailableForSponsorship] = useState(true);
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
      // Check for date overlaps with other active besties
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      const { data: overlappingBesties, error: overlapError } = await supabase
        .from("featured_besties")
        .select("id, bestie_name, start_date, end_date")
        .eq("is_active", true)
        .or(`and(start_date.lte.${endDateStr},end_date.gte.${startDateStr})`);

      if (overlapError) throw overlapError;

      // Filter out the current bestie being edited
      const conflicts = overlappingBesties?.filter(b => b.id !== editingId) || [];
      
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(b => b.bestie_name).join(", ");
        toast({
          title: "Date overlap detected",
          description: `The selected dates overlap with: ${conflictNames}. Please choose different dates.`,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      let imageUrl = "";
      let voiceNoteUrl = null;

      // Compress and upload image if new file selected
      if (imageFile) {
        const compressedImage = await compressImage(imageFile, 4.5); // Slightly under 5MB limit
        imageUrl = await uploadFile(compressedImage, "featured-bestie-images");
      }
      
      // Compress and upload audio if provided (either file or recorded)
      const audioToUpload = audioBlob || audioFile;
      if (audioToUpload) {
        if (audioBlob) {
          // Convert Blob to File for upload
          const audioFileFromBlob = new File([audioBlob], `recorded_${Date.now()}.webm`, { type: 'audio/webm' });
          voiceNoteUrl = await uploadFile(audioFileFromBlob, "featured-bestie-audio");
        } else if (audioFile) {
          const compressedAudio = await compressAudio(audioFile, 9.5);
          voiceNoteUrl = await uploadFile(compressedAudio, "featured-bestie-audio");
        }
      }

      const data: any = {
        bestie_id: linkedBestieId || null,
        bestie_name: bestieName,
        description,
        start_date: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
        end_date: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
        is_active: isActive,
        available_for_sponsorship: availableForSponsorship,
        is_fully_funded: isFullyFunded,
        approval_status: 'approved', // Admin posts are auto-approved
        monthly_goal: monthlyGoal ? parseFloat(monthlyGoal) : null,
      };

      if (imageFile) {
        data.image_url = imageUrl;
      }
      
      if (audioFile || audioBlob) {
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
    setLinkedBestieId(bestie.bestie_id || "");
    setBestieName(bestie.bestie_name);
    setDescription(bestie.description);
    // Parse dates at noon local time to avoid timezone shifts
    setStartDate(new Date(bestie.start_date + 'T12:00:00'));
    setEndDate(new Date(bestie.end_date + 'T12:00:00'));
    setIsActive(bestie.is_active);
    setAvailableForSponsorship(bestie.available_for_sponsorship);
    setIsFullyFunded(bestie.is_fully_funded);
    setMonthlyGoal(bestie.monthly_goal ? bestie.monthly_goal.toString() : "");
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

  const toggleSponsorshipAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("featured_besties")
        .update({ available_for_sponsorship: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Sponsorship ${!currentStatus ? "enabled" : "disabled"}` });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating sponsorship availability",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFullyFunded = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("featured_besties")
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

  const handleApprove = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("featured_besties")
        .update({ 
          approval_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Post approved successfully" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error approving post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("featured_besties")
        .update({ 
          approval_status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Post rejected" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error rejecting post",
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
    setStartDate(undefined);
    setEndDate(undefined);
    setIsActive(true);
    setAvailableForSponsorship(true);
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
  };

  const handleCroppedImage = (blob: Blob) => {
    const file = new File([blob], "cropped-bestie.jpg", { type: "image/jpeg" });
    setImageFile(file);
    
    // Create preview
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
                <p className="text-xs text-muted-foreground">
                  Link this featured bestie to an actual bestie user account
                </p>
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
                {imagePreview && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">New cropped image:</p>
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setShowCropDialog(true);
                          }}
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
                {editingId && !imagePreview && <p className="text-xs text-muted-foreground">Leave empty to keep current image</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio">Voice Note (for Besties)</Label>
                {editingId && currentAudioUrl && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Current audio:</p>
                    <audio controls className="w-full">
                      <source src={currentAudioUrl} type="audio/mpeg" />
                    </audio>
                  </div>
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
                        {audioFile ? "Change Audio File" : "Upload Audio File"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAudioRecorder(true)}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Record Audio
                      </Button>
                    </div>
                    {audioFile && <span className="text-xs text-muted-foreground">{audioFile.name}</span>}
                    {editingId && <p className="text-xs text-muted-foreground">Leave empty to keep current audio</p>}
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
                          onRecordingCancel={() => {
                            setShowAudioRecorder(false);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAudioRecorder(false)}
                          className="w-full"
                        >
                          Back to File Upload
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="p-4 border rounded-lg bg-muted/50">
                          <p className="text-sm font-medium mb-2">Recorded audio ready:</p>
                          <audio controls className="w-full">
                            <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAudioBlob(null)}
                          >
                            Re-record
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setAudioBlob(null);
                              setShowAudioRecorder(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="sponsorship"
                  checked={availableForSponsorship}
                  onCheckedChange={setAvailableForSponsorship}
                />
                <Label htmlFor="sponsorship">
                  Available for Sponsorship
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, this bestie is eligible for sponsorships
              </p>

              {availableForSponsorship && (
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
                  <p className="text-xs text-muted-foreground">
                    Set the monthly sponsorship goal amount for this bestie
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="fully-funded"
                  checked={isFullyFunded}
                  onCheckedChange={setIsFullyFunded}
                  disabled={!availableForSponsorship}
                />
                <Label htmlFor="fully-funded" className={!availableForSponsorship ? "text-muted-foreground" : ""}>
                  Fully Funded
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, this bestie won't appear on the sponsorship page (already has enough sponsors)
              </p>

              <div className="flex gap-2 pt-6 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log("Cancel clicked");
                    resetForm();
                    setDialogOpen(false);
                  }}
                  disabled={uploading}
                  className="flex-1 pointer-events-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    console.log("Update button clicked!");
                    handleSubmit();
                  }}
                  disabled={uploading}
                  className="flex-1 pointer-events-auto z-50"
                >
                  {uploading ? "Uploading..." : editingId ? "Update" : "Create"}
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
            bestie.is_active && "ring-2 ring-primary",
            bestie.approval_status === 'pending_approval' && "ring-2 ring-yellow-500"
          )}>
            {bestie.is_active && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
                ACTIVE
              </div>
            )}
            {bestie.approval_status === 'pending_approval' && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
                PENDING
              </div>
            )}
            {bestie.approval_status === 'rejected' && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
                REJECTED
              </div>
            )}
            {bestie.available_for_sponsorship && !bestie.is_fully_funded && (
              <div className="absolute top-12 left-2 bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
                💝 SPONSOR
              </div>
            )}
            {bestie.is_fully_funded && (
              <div className="absolute top-12 left-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-bold z-10">
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
              <CardDescription>
                {format(new Date(bestie.start_date + 'T12:00:00'), "MMM d, yyyy")} - {format(new Date(bestie.end_date + 'T12:00:00'), "MMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {bestie.description}
              </p>
              {bestie.bestie_id && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  <Heart className="w-3 h-3" />
                  Linked to account
                </div>
              )}
              {bestie.voice_note_url && (
                <audio controls className="w-full">
                  <source src={bestie.voice_note_url} type="audio/mpeg" />
                </audio>
              )}
              <div className="flex flex-col gap-2">
                {bestie.approval_status === 'pending_approval' && (
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(bestie.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(bestie.id)}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
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
                <Button
                  variant={bestie.available_for_sponsorship ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleSponsorshipAvailability(bestie.id, bestie.available_for_sponsorship)}
                  className="w-full"
                  disabled={bestie.is_fully_funded}
                >
                  {bestie.available_for_sponsorship ? "💝 Sponsorship Enabled" : "Enable Sponsorship"}
                </Button>
                {bestie.available_for_sponsorship && (
                  <Button
                    variant={bestie.is_fully_funded ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFullyFunded(bestie.id, bestie.is_fully_funded)}
                    className="w-full"
                  >
                    {bestie.is_fully_funded ? "✓ Fully Funded" : "Mark as Fully Funded"}
                  </Button>
                )}
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
      
      {(rawImageUrl || imagePreview) && (
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageUrl={rawImageUrl || imagePreview || ""}
          onCropComplete={handleCroppedImage}
          aspectRatio={1}
          title="Crop Bestie Image"
          description="Adjust the crop area for the featured bestie image (square 1:1 aspect ratio)"
        />
      )}
    </div>
  );
};
