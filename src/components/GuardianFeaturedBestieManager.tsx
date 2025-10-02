import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import { format } from "date-fns";

interface FeaturedBestie {
  id: string;
  bestie_id: string;
  bestie_name: string;
  description: string;
  image_url: string | null;
  voice_note_url: string | null;
  start_date: string;
  end_date: string;
  available_for_sponsorship: boolean;
  is_fully_funded: boolean;
  is_active: boolean;
  approval_status: string;
  approved_at: string | null;
}

interface GuardianFeaturedBestieManagerProps {
  bestieId: string;
  bestieName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuardianFeaturedBestieManager = ({
  bestieId,
  bestieName,
  open,
  onOpenChange,
}: GuardianFeaturedBestieManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingPosts, setExistingPosts] = useState<FeaturedBestie[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [availableForSponsorship, setAvailableForSponsorship] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [voiceNoteFile, setVoiceNoteFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      loadExistingPosts();
    }
  }, [open, bestieId]);

  const loadExistingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("featured_besties")
        .select("*")
        .eq("bestie_id", bestieId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setExistingPosts(data || []);
    } catch (error: any) {
      console.error("Error loading posts:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoiceNoteFile(file);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile && !editingId) {
      toast({
        title: "Missing image",
        description: "Please upload an image",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let imageUrl = imagePreview;
      let voiceNoteUrl = null;

      // Upload image if new file selected
      if (imageFile) {
        const imagePath = `${bestieId}/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadFile(imageFile, "featured-bestie-images", imagePath);
      }

      // Upload voice note if selected
      if (voiceNoteFile) {
        const voicePath = `${bestieId}/${Date.now()}-${voiceNoteFile.name}`;
        voiceNoteUrl = await uploadFile(voiceNoteFile, "featured-bestie-audio", voicePath);
      }

      const data: any = {
        bestie_id: bestieId,
        bestie_name: bestieName,
        description: description.trim(),
        available_for_sponsorship: availableForSponsorship,
        image_url: imageUrl,
        voice_note_url: voiceNoteUrl,
        approval_status: 'pending_approval', // Always set to pending for guardian posts
      };

      if (editingId) {
        const { error } = await supabase
          .from("featured_besties")
          .update(data)
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Post updated",
          description: "Your changes have been submitted for approval",
        });
      } else {
        const { error } = await supabase
          .from("featured_besties")
          .insert(data);

        if (error) throw error;

        toast({
          title: "Post created",
          description: "Your post has been submitted for admin approval",
        });
      }

      resetForm();
      loadExistingPosts();
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

  const handleEdit = (post: FeaturedBestie) => {
    setEditingId(post.id);
    setDescription(post.description);
    setAvailableForSponsorship(post.available_for_sponsorship);
    setImagePreview(post.image_url || "");
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("featured_besties")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Featured bestie post has been deleted",
      });

      loadExistingPosts();
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
    setDescription("");
    setAvailableForSponsorship(true);
    setImageFile(null);
    setVoiceNoteFile(null);
    setImagePreview("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Featured Posts for {bestieName}
          </DialogTitle>
          <DialogDescription>
            Create and manage featured posts for this bestie. All posts require admin approval and date assignment before being published.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">
              {editingId ? "Edit Post" : "Create New Post"}
            </h3>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a description..."
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Available for Sponsorship</Label>
              <Switch
                checked={availableForSponsorship}
                onCheckedChange={setAvailableForSponsorship}
              />
            </div>

            <div className="space-y-2">
              <Label>Image {!editingId && "*"}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Voice Note (Optional)</Label>
              <Input
                type="file"
                accept="audio/*"
                onChange={handleVoiceNoteChange}
              />
              {voiceNoteFile && (
                <p className="text-sm text-muted-foreground">
                  {voiceNoteFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : editingId ? (
                  "Update Post"
                ) : (
                  "Create Post"
                )}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Existing Posts Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Existing Posts</h3>
            {existingPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts yet</p>
            ) : (
              <div className="space-y-3">
                {existingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                  <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium line-clamp-2">
                            {post.description}
                          </p>
                          {post.approval_status === 'pending_approval' && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              Pending
                            </span>
                          )}
                          {post.approval_status === 'rejected' && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                              Rejected
                            </span>
                          )}
                          {post.approval_status === 'approved' && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Approved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(post.start_date), "MMM d")} -{" "}
                          {format(new Date(post.end_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(post)}
                        className="flex-1"
                        disabled={post.approval_status === 'approved'}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive"
                        disabled={post.approval_status === 'approved'}
                      >
                        Delete
                      </Button>
                    </div>
                    {post.approval_status === 'approved' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved posts cannot be edited. Contact an admin to make changes.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
