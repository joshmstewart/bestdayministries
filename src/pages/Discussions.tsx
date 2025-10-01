import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Heart, ArrowLeft, Trash2, Image as ImageIcon, X, Mic, Edit } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { ImageCropDialog } from "@/components/ImageCropDialog";

interface Profile {
  id: string;
  display_name: string;
  role: string;
  avatar_url?: string;
  avatar_number?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  audio_url?: string | null;
  author?: Profile;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  visible_to_roles?: string[];
  author?: Profile;
  comments?: Comment[];
}

const Discussions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [canCreatePosts, setCanCreatePosts] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [commentAudio, setCommentAudio] = useState<{ [key: string]: Blob | null }>({});
  const [showAudioRecorder, setShowAudioRecorder] = useState<{ [key: string]: boolean }>({});
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['caregiver', 'bestie', 'supporter']);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await fetchProfile(session.user.id);
    await loadPosts();
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
    setCanCreatePosts(['caregiver', 'admin', 'owner'].includes(data?.role));
  };

  const loadPosts = async () => {
      const { data: postsData, error: postsError } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles!discussion_posts_author_id_fkey(id, display_name, role, avatar_number)
      `)
      .eq("is_moderated", true)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error loading posts:", postsError);
      toast({
        title: "Error loading posts",
        description: postsError.message,
        variant: "destructive",
      });
      return;
    }

    // Load comments for each post
    const postsWithComments = await Promise.all(
      (postsData || []).map(async (post) => {
        const { data: commentsData } = await supabase
          .from("discussion_comments")
          .select(`
            *,
            author:profiles!discussion_comments_author_id_fkey(id, display_name, role, avatar_number)
          `)
          .eq("post_id", post.id)
          .eq("is_moderated", true)
          .order("created_at", { ascending: true });

        return { ...post, comments: commentsData || [] };
      })
    );

    setPosts(postsWithComments);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB before compression)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 20MB",
        variant: "destructive",
      });
      return;
    }

    // Store original file and open crop dialog
    setOriginalImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File(
      [croppedImageBlob], 
      originalImageFile?.name || 'cropped-image.jpg',
      { type: 'image/jpeg' }
    );
    
    setSelectedImage(croppedFile);
    
    // Create preview from blob
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(croppedImageBlob);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageToCrop(null);
    setOriginalImageFile(null);
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      toast({
        title: "Missing fields",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingImage(true);

      // Moderate text content
      const { data: textModeration, error: textModerationError } = await supabase.functions.invoke('moderate-content', {
        body: { 
          content: `${newPost.title}\n\n${newPost.content}`,
          contentType: 'post'
        }
      });

      if (textModerationError) {
        console.error("Text moderation error:", textModerationError);
        toast({
          title: "Error checking content",
          description: "Please try again",
          variant: "destructive",
        });
        setUploadingImage(false);
        return;
      }

      let imageUrl: string | null = null;
      let imageModerationNotes: string | null = null;

      // Moderate and upload image if present
      if (selectedImage && imagePreview) {
        const { data: imageModeration, error: imageModerationError } = await supabase.functions.invoke('moderate-image', {
          body: { imageUrl: imagePreview }
        });

        if (imageModerationError) {
          console.error("Image moderation error:", imageModerationError);
          toast({
            title: "Error checking image",
            description: "Please try again",
            variant: "destructive",
          });
          setUploadingImage(false);
          return;
        }

        const imageApproved = imageModeration?.approved ?? true;

        if (!imageApproved) {
          imageModerationNotes = `${imageModeration.severity} severity: ${imageModeration.reason}`;
        }

        // Compress image before uploading
        const compressedImage = await compressImage(selectedImage, 4.5); // Slightly under 5MB limit

        // Upload compressed image to storage
        const fileName = `${user?.id}/${Date.now()}_${selectedImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('discussion-images')
          .upload(fileName, compressedImage);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Error uploading image",
            description: uploadError.message,
            variant: "destructive",
          });
          setUploadingImage(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('discussion-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const textIsApproved = textModeration?.approved ?? true;
      const textReason = textModeration?.reason || "";
      const textSeverity = textModeration?.severity || "";

      // Combine moderation notes
      let finalModerationNotes = null;
      if (!textIsApproved || imageModerationNotes) {
        const notes = [];
        if (!textIsApproved) notes.push(`Text: ${textSeverity} severity - ${textReason}`);
        if (imageModerationNotes) notes.push(`Image: ${imageModerationNotes}`);
        finalModerationNotes = notes.join('; ');
      }

      // Always include admin and owner roles
      const finalVisibleRoles = [...new Set([...visibleToRoles, 'admin', 'owner'])] as any;

      const { error } = await supabase
        .from("discussion_posts")
        .insert({
          title: newPost.title,
          content: newPost.content,
          author_id: user?.id,
          image_url: imageUrl,
          visible_to_roles: finalVisibleRoles,
          is_moderated: textIsApproved && !imageModerationNotes,
          moderation_notes: finalModerationNotes,
        });

      if (error) {
        toast({
          title: "Error creating post",
          description: error.message,
          variant: "destructive",
        });
        setUploadingImage(false);
        return;
      }

      if (textIsApproved && !imageModerationNotes) {
        toast({ title: "Post created successfully!" });
      } else {
        toast({ 
          title: "Post submitted for review",
          description: "Your post will be reviewed by moderators before being published.",
        });
      }

      setNewPost({ title: "", content: "" });
      setSelectedImage(null);
      setImagePreview(null);
      setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
      setShowNewPost(false);
      setUploadingImage(false);
      loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
      setUploadingImage(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = newComment[postId];
    const audioBlob = commentAudio[postId];
    
    // Must have either text or audio
    if (!content?.trim() && !audioBlob) return;

    try {
      let audioUrl: string | null = null;

      // Upload audio if provided
      if (audioBlob) {
        const fileName = `${user?.id}/${Date.now()}_comment.webm`;
        const { error: uploadError } = await supabase.storage
          .from('discussion-images') // Reusing the same bucket for simplicity
          .upload(fileName, audioBlob);

        if (uploadError) {
          toast({
            title: "Error uploading audio",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('discussion-images')
          .getPublicUrl(fileName);

        audioUrl = publicUrl;
      }

      // Moderate text content if provided
      let isApproved = true;
      let moderationNotes = null;

      if (content?.trim()) {
        const { data: moderationResult, error: moderationError } = await supabase.functions.invoke('moderate-content', {
          body: { 
            content: content,
            contentType: 'comment'
          }
        });

        if (moderationError) {
          console.error("Moderation error:", moderationError);
          toast({
            title: "Error checking content",
            description: "Please try again",
            variant: "destructive",
          });
          return;
        }

        isApproved = moderationResult?.approved ?? true;
        const reason = moderationResult?.reason || "";
        const severity = moderationResult?.severity || "";
        moderationNotes = isApproved ? null : `${severity} severity: ${reason}`;
      }

      const { error } = await supabase
        .from("discussion_comments")
        .insert({
          post_id: postId,
          content: content || '',
          audio_url: audioUrl,
          author_id: user?.id,
          is_moderated: isApproved,
          moderation_notes: moderationNotes,
        });

      if (error) {
        toast({
          title: "Error adding comment",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (isApproved) {
        toast({ title: audioUrl ? "Audio comment added!" : "Comment added!" });
      } else {
        toast({ 
          title: "Comment submitted for review",
          description: "Your comment will be reviewed by moderators.",
        });
      }

      setNewComment({ ...newComment, [postId]: "" });
      setCommentAudio({ ...commentAudio, [postId]: null });
      setShowAudioRecorder({ ...showAudioRecorder, [postId]: false });
      loadPosts();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("discussion_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Post deleted successfully" });
    loadPosts();
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("discussion_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Comment deleted successfully" });
    loadPosts();
  };

  const canDeleteContent = (authorId: string) => {
    return profile && (
      ['admin', 'owner'].includes(profile.role) || 
      profile.id === authorId
    );
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      owner: "bg-purple-500 text-white",
      admin: "bg-red-500 text-white",
      moderator: "bg-orange-500 text-white",
      caregiver: "bg-blue-500 text-white",
      bestie: "bg-pink-500 text-white",
      supporter: "bg-green-500 text-white",
    };
    return colors[role] || "bg-gray-500 text-white";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={() => navigate("/community")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black text-foreground">
                Community <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Discussions</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Share updates, stories, and connect with the community
              </p>
            </div>
            {canCreatePosts && (
              <Button onClick={() => setShowNewPost(!showNewPost)} size="lg">
                <MessageSquare className="w-4 h-4 mr-2" />
                New Post
              </Button>
            )}
          </div>

          {/* New Post Form */}
          {showNewPost && canCreatePosts && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Post</CardTitle>
                <CardDescription>Share something with the community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What's this about?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Share your thoughts..."
                    rows={4}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Image (optional, auto-compressed)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image')?.click()}
                      disabled={uploadingImage}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {selectedImage ? 'Change Image' : 'Add Image'}
                    </Button>
                    {selectedImage && (
                      <span className="text-sm text-muted-foreground">{selectedImage.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Images are automatically compressed. Max 20MB.</p>
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-xs max-h-48 rounded-lg"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => {
                            if (!imageToCrop && imagePreview) {
                              setImageToCrop(imagePreview);
                            }
                            setCropDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={removeImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Label>Visible To (Admin & Owner always included)</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-caregiver"
                        checked={visibleToRoles.includes('caregiver')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'caregiver']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'caregiver'));
                          }
                        }}
                      />
                      <label htmlFor="role-caregiver" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Guardians
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-bestie"
                        checked={visibleToRoles.includes('bestie')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'bestie']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'bestie'));
                          }
                        }}
                      />
                      <label htmlFor="role-bestie" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Besties
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-supporter"
                        checked={visibleToRoles.includes('supporter')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'supporter']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'supporter'));
                          }
                        }}
                      />
                      <label htmlFor="role-supporter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Supporters
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreatePost} disabled={uploadingImage}>
                    {uploadingImage ? "Posting..." : "Post"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowNewPost(false);
                    removeImage();
                    setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
                  }} disabled={uploadingImage}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to start a discussion!
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <AvatarDisplay 
                          avatarNumber={post.author?.avatar_number || null}
                          displayName={post.author?.display_name || "Unknown"}
                          size="md"
                        />
                      <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl">{post.title}</CardTitle>
                            <TextToSpeech text={`${post.title}. ${post.content}`} />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm font-medium text-foreground">
                              {post.author?.display_name || "Unknown"}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role || "")}`}>
                              {post.author?.role}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {canDeleteContent(post.author_id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

                    {/* Display Image if present */}
                    {post.image_url && (
                      <div className="rounded-lg overflow-hidden">
                        <img 
                          src={post.image_url} 
                          alt="Post image" 
                          className="w-full max-h-96 object-cover"
                        />
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comments ({post.comments?.length || 0})
                      </h4>

                      {/* Comments List */}
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <AvatarDisplay 
                                avatarNumber={comment.author?.avatar_number || null}
                                displayName={comment.author?.display_name || "Unknown"}
                                size="sm"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{comment.author?.display_name}</span>
                                  {comment.content && (
                                    <TextToSpeech text={comment.content} size="sm" />
                                  )}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.author?.role || "")}`}>
                                    {comment.author?.role}
                                  </span>
                                   <span className="text-xs text-muted-foreground">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {comment.content && <p className="text-sm">{comment.content}</p>}
                                {comment.audio_url && (
                                  <AudioPlayer src={comment.audio_url} />
                                )}
                              </div>
                            </div>
                            {canDeleteContent(comment.author_id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteComment(comment.id, post.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add Comment */}
                      <div className="space-y-3">
                        {!showAudioRecorder[post.id] ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a comment..."
                              value={newComment[post.id] || ""}
                              onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => setShowAudioRecorder({ ...showAudioRecorder, [post.id]: true })}
                            >
                              <Mic className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => handleAddComment(post.id)}
                              disabled={!newComment[post.id]?.trim() && !commentAudio[post.id]}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {!commentAudio[post.id] ? (
                              <>
                                <AudioRecorder
                                  onRecordingComplete={(blob) => {
                                    setCommentAudio({ ...commentAudio, [post.id]: blob });
                                  }}
                                  onRecordingCancel={() => {
                                    setShowAudioRecorder({ ...showAudioRecorder, [post.id]: false });
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowAudioRecorder({ ...showAudioRecorder, [post.id]: false });
                                  }}
                                  className="w-full"
                                >
                                  Back to Text
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="p-4 border rounded-lg bg-muted/50">
                                  <p className="text-sm font-medium mb-2">Audio ready to post:</p>
                                  <audio controls className="w-full">
                                    <source src={URL.createObjectURL(commentAudio[post.id])} type="audio/webm" />
                                    Your browser does not support audio playback.
                                  </audio>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setCommentAudio({ ...commentAudio, [post.id]: null });
                                    }}
                                  >
                                    Re-record
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setCommentAudio({ ...commentAudio, [post.id]: null });
                                      setShowAudioRecorder({ ...showAudioRecorder, [post.id]: false });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleAddComment(post.id)}
                                    className="flex-1"
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Post Audio Comment
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Image Crop Dialog */}
      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          title="Crop Post Image"
          description="Adjust the image to show what will be visible in the post (16:9 format)"
        />
      )}
    </div>
  );
};

export default Discussions;