import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Image as ImageIcon, X, Edit, Search, ArrowUpDown, Calendar, Crop } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { compressImage } from "@/lib/imageUtils";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { discussionPostSchema, validateInput } from "@/lib/validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEOHead } from "@/components/SEOHead";
import { DiscussionPostCard } from "@/components/DiscussionPostCard";
import { DiscussionDetailDialog } from "@/components/DiscussionDetailDialog";
import { awardCoinReward } from "@/utils/awardCoinReward";

interface Profile {
  id: string;
  display_name: string;
  role?: string;
  avatar_url?: string;
  avatar_number?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  audio_url?: string | null;
  approval_status?: string;
  author?: Profile;
}

interface Video {
  id: string;
  title: string;
  video_url?: string;
  youtube_url?: string;
  video_type?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  image_url?: string | null;
  video_id?: string | null;
  youtube_url?: string | null;
  visible_to_roles?: string[];
  approval_status?: string;
  author?: Profile;
  comments?: Comment[];
  video?: Video | null;
  album?: {
    id: string;
    title: string;
    cover_image_url: string | null;
    is_active: boolean;
  };
  album_images?: Array<{
    id: string;
    image_url: string;
    caption: string | null;
    display_order: number;
  }>;
  event?: {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
  };
}

const Discussions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
  const [canCreatePosts, setCanCreatePosts] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string }>>([]);
  const [videoInputType, setVideoInputType] = useState<"none" | "select" | "youtube">("none");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['caregiver', 'bestie', 'supporter']);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [editablePostIds, setEditablePostIds] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [allowOwnerClaim, setAllowOwnerClaim] = useState(false);
  const [allowAdminEdit, setAllowAdminEdit] = useState(false);
  const [allowOwnerEdit, setAllowOwnerEdit] = useState(false);
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('16:9');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

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

  // Scroll to post from notification
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId && posts.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`post-${postId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [searchParams, posts]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    const userProfile = await fetchProfile(session.user.id);
    await loadPosts(userProfile);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return null;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const profile = {
      ...profileData,
      role: roleData?.role || "supporter"
    };

    setProfile(profile);
    setCanCreatePosts(['caregiver', 'admin', 'owner'].includes(profile.role));
    
    if (['caregiver', 'admin', 'owner'].includes(profile.role)) {
      loadVideos();
      loadEvents();
    }
    
    return profile;
  };

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("id, title, video_url, youtube_url, video_type")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    if (data) setVideos(data);
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .eq("is_active", true)
      .order("event_date", { ascending: false })
      .limit(50);
    
    if (data) setEvents(data);
  };

  const loadPosts = async (userProfile?: any) => {
      const { data: postsData, error: postsError } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles_public!discussion_posts_author_id_fkey(id, display_name, avatar_number),
        album:albums(id, title, cover_image_url, is_active),
        video:videos(id, title, video_url, youtube_url, video_type),
        event:events(id, title, event_date, location)
      `)
      .order("created_at", { ascending: false});

    if (postsError) {
      console.error("Error loading posts:", postsError);
      toast({
        title: "Error loading posts",
        description: postsError.message,
        variant: "destructive",
      });
      return;
    }

    const postsWithComments = await Promise.all(
      (postsData || []).map(async (post) => {
        // Fetch author role
        const { data: authorRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", post.author_id)
          .maybeSingle();

        const { data: commentsData } = await supabase
          .from("discussion_comments")
          .select(`
            *,
            author:profiles_public!discussion_comments_author_id_fkey(id, display_name, avatar_number)
          `)
          .eq("post_id", post.id)
          .eq("is_moderated", true)
          .order("created_at", { ascending: true });

        // Fetch roles for all comment authors
        const commentsWithRoles = await Promise.all(
          (commentsData || []).map(async (comment) => {
            const { data: commentAuthorRole } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", comment.author_id)
              .maybeSingle();

            return {
              ...comment,
              updated_at: (comment as any).updated_at || comment.created_at,
              author: comment.author ? {
                ...comment.author,
                role: commentAuthorRole?.role
              } : undefined
            };
          })
        );

        let albumImages = [];
        if ((post as any).album_id) {
          const { data: imagesData } = await supabase
            .from("album_images")
            .select("*")
            .eq("album_id", (post as any).album_id)
            .order("display_order", { ascending: true });
          
          albumImages = imagesData || [];
        }

        return { 
          ...post,
          updated_at: post.updated_at || post.created_at,
          author: post.author ? {
            ...post.author,
            role: authorRole?.role
          } : undefined,
          comments: commentsWithRoles, 
          album_images: albumImages 
        };
      })
    );

    setPosts(postsWithComments);
    
    const profileToUse = userProfile || profile;
    
    if (profileToUse) {
      await loadEditablePostIds(postsWithComments, profileToUse);
    }
  };

  const loadEditablePostIds = async (postsToCheck: Post[], userProfile?: any) => {
    const profileToUse = userProfile || profile;
    
    if (!profileToUse || !user) return;
    
    const editable = new Set<string>();
    
    for (const post of postsToCheck) {
      // Can edit if it's their own post
      if (profileToUse.id === post.author_id) {
        editable.add(post.id);
        continue;
      }
      
      // Can edit if admin and allow_admin_edit is true (and author is not owner)
      if (profileToUse.role === 'admin' && (post as any).allow_admin_edit) {
        // Check if post author is not an owner
        const { data: authorRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', post.author_id)
          .maybeSingle();
        
        if (authorRole?.role !== 'owner') {
          editable.add(post.id);
          continue;
        }
      }
      
      // Can edit if owner and allow_owner_edit is true
      if (profileToUse.role === 'owner' && (post as any).allow_owner_edit) {
        editable.add(post.id);
        continue;
      }
      
      // Can edit if guardian of the bestie
      if (profileToUse.role === 'caregiver') {
        const { data: guardianLinks } = await supabase
          .from('caregiver_bestie_links')
          .select('id')
          .eq('caregiver_id', profileToUse.id)
          .eq('bestie_id', post.author_id)
          .maybeSingle();
        
        if (guardianLinks) {
          editable.add(post.id);
        }
      }
    }
    
    setEditablePostIds(editable);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 20MB",
        variant: "destructive",
      });
      return;
    }

    setOriginalImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    const croppedFile = new File(
      [croppedImageBlob], 
      originalImageFile?.name || 'cropped-image.jpg',
      { type: 'image/jpeg' }
    );
    
    setSelectedImage(croppedFile);
    
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
    const validation = validateInput(discussionPostSchema, {
      title: newPost.title,
      content: newPost.content,
      imageUrl: imagePreview || '',
    });

    if (!validation.success) {
      toast({
        title: "Validation error",
        description: validation.errors?.[0] || "Please check your input",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingImage(true);

      const { data: textModeration, error: textModerationError } = await supabase.functions.invoke('moderate-content', {
        body: { 
          content: `${validation.data!.title}\n\n${validation.data!.content}`,
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

      let imageUrl: string | null = imagePreview ? imagePreview : null;
      let imageModerationStatus: string | null = null;
      let imageModerationSeverity: string | null = null;
      let imageModerationReason: string | null = null;

      if (selectedImage && imagePreview) {
        const compressedImage = await compressImage(selectedImage, 4.5);
        // Sanitize filename: remove spaces and special characters
        const sanitizedFileName = selectedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${user?.id}/${Date.now()}_${sanitizedFileName}`;
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

        const { data: { publicUrl } } = supabase.storage
          .from('discussion-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;

        const { data: moderationSettings } = await supabase
          .from('moderation_settings')
          .select('discussion_post_image_policy')
          .maybeSingle();

        const imagePolicy = moderationSettings?.discussion_post_image_policy || 'flagged';

        if (imagePolicy === 'all') {
          imageModerationStatus = 'pending';
          imageModerationSeverity = 'manual_review';
          imageModerationReason = 'Admin policy requires all images to be reviewed';
        } else if (imagePolicy === 'flagged') {
          const { data: imageModeration, error: imageModerationError } = await supabase.functions.invoke('moderate-image', {
            body: { imageUrl: publicUrl }
          });

          if (imageModerationError) {
            console.error("Image moderation error:", imageModerationError);
          } else {
            const imageApproved = imageModeration?.approved ?? true;
            imageModerationStatus = imageApproved ? 'approved' : 'pending';
            imageModerationSeverity = imageModeration?.severity || null;
            imageModerationReason = imageModeration?.reason || null;
          }
        } else {
          imageModerationStatus = 'approved';
        }
      }

      const textIsApproved = textModeration?.approved ?? true;
      const textReason = textModeration?.reason || "";
      const textSeverity = textModeration?.severity || "";

      let finalModerationNotes = null;
      if (!textIsApproved || (imageModerationStatus === 'pending')) {
        const notes = [];
        if (!textIsApproved) notes.push(`Text: ${textSeverity} severity - ${textReason}`);
        if (imageModerationStatus === 'pending') notes.push(`Image: ${imageModerationSeverity} severity - ${imageModerationReason}`);
        finalModerationNotes = notes.join('; ');
      }

      const finalModerationStatus = (!textIsApproved || imageModerationStatus === 'pending') ? 'pending' : 'approved';
      const finalModerationSeverity = !textIsApproved ? textSeverity : imageModerationSeverity;

      let approvalStatus = 'approved';
      if (profile?.role === 'bestie' && !editingPostId) {
        const { data: guardianLinks } = await supabase
          .from('caregiver_bestie_links')
          .select('require_post_approval')
          .eq('bestie_id', user?.id);
        
        if (guardianLinks?.some(link => link.require_post_approval)) {
          approvalStatus = 'pending_approval';
        }
      }

      const postData = {
        title: validation.data!.title,
        content: validation.data!.content,
        image_url: imageUrl,
        video_id: newPost.video_id || null,
        youtube_url: newPost.youtube_url || null,
        event_id: newPost.event_id || null,
        visible_to_roles: visibleToRoles as any,
        is_moderated: textIsApproved && imageModerationStatus !== 'pending',
        moderation_status: finalModerationStatus,
        moderation_severity: finalModerationSeverity,
        moderation_notes: finalModerationNotes,
        moderation_reason: finalModerationNotes,
        allow_owner_claim: allowOwnerClaim,
        allow_admin_edit: allowAdminEdit,
        allow_owner_edit: allowOwnerEdit,
        aspect_ratio: aspectRatioKey,
        updated_at: new Date().toISOString(),
      };

      if (editingPostId) {
        // Update existing post
        const { error } = await supabase
          .from("discussion_posts")
          .update(postData)
          .eq("id", editingPostId);

        if (error) throw error;

        toast({ title: "Post updated successfully!" });
      } else {
        // Create new post
        const { error } = await supabase.from("discussion_posts").insert([{
          ...postData,
          author_id: user?.id,
          approval_status: approvalStatus,
        }]);

        if (error) throw error;

        // Award coins for creating a post (only for new posts)
        if (user?.id) {
          await awardCoinReward(user.id, 'discussion_post', 'Created a discussion post');
        }

        if (approvalStatus === 'pending_approval') {
          toast({ 
            title: "Post pending approval",
            description: "Your guardian will review this post before it's published.",
          });
        } else if (textIsApproved && imageModerationStatus !== 'pending') {
          toast({ title: "Post created successfully!" });
        } else {
          toast({ 
            title: "Post submitted for review",
            description: "Your post will be reviewed by moderators before being published.",
          });
        }
      }

      setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
      setSelectedImage(null);
      setImagePreview(null);
      setShowNewPost(false);
      setVideoInputType("none");
      setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
      setAllowOwnerClaim(false);
      setAllowAdminEdit(false);
      setAllowOwnerEdit(false);
      setAspectRatioKey('16:9');
      setEditingPostId(null);
      loadPosts();
    } catch (error: any) {
      console.error(`Error ${editingPostId ? 'updating' : 'creating'} post:`, error);
      toast({
        title: `Error ${editingPostId ? 'updating' : 'creating'} post`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
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

  const handleEditComment = async (commentId: string, newContent: string) => {
    const { error } = await supabase
      .from("discussion_comments")
      .update({ 
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error updating comment",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Comment updated successfully" });
    loadPosts();
  };

  const canDeleteContent = async (authorId: string) => {
    if (!profile || !user) return false;
    
    if (profile.id === authorId) return true;
    
    if (['admin', 'owner'].includes(profile.role)) return true;
    
    if (profile.role === 'caregiver') {
      const { data: guardianLinks } = await supabase
        .from('caregiver_bestie_links')
        .select('id')
        .eq('caregiver_id', profile.id)
        .eq('bestie_id', authorId)
        .maybeSingle();
      
      return !!guardianLinks;
    }
    
    return false;
  };

  const hasAdminAccess = profile && ['admin', 'owner'].includes(profile.role);

  const handleEditPost = (post: Post) => {
    setNewPost({
      title: post.title,
      content: post.content,
      video_id: post.video_id || "",
      youtube_url: post.youtube_url || "",
      event_id: (post.event?.id as string) || "",
    });
    
    if (post.youtube_url) {
      setVideoInputType("youtube");
    } else if (post.video_id) {
      setVideoInputType("select");
    } else {
      setVideoInputType("none");
    }
    
    if (post.image_url) {
      setImagePreview(post.image_url);
    }

    setVisibleToRoles(post.visible_to_roles || ['caregiver', 'bestie', 'supporter']);
    setShowNewPost(true);
    setAllowOwnerClaim((post as any).allow_owner_claim || false);
    setAllowAdminEdit((post as any).allow_admin_edit || false);
    setAllowOwnerEdit((post as any).allow_owner_edit || false);
    setAspectRatioKey((post as any).aspect_ratio || '16:9');
    setEditingPostId(post.id);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = searchQuery === "" || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <SEOHead
        title="Discussions | Joy House Community"
        description="Join conversations and connect with our community. Share stories, experiences, and support with adults with special needs and their families."
      />
      <UnifiedHeader />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        <BackButton to="/community" />
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-black text-foreground">
                Community <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">Discussions</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Share updates, stories, and connect with the community
              </p>
            </div>
            {canCreatePosts && (
              <Button onClick={() => setShowNewPost(!showNewPost)} size="lg" className="w-full sm:w-auto">
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
                  {imagePreview && (
                    <div className="relative space-y-3">
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
                            onClick={() => setCropDialogOpen(true)}
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
                      
                      {/* Aspect Ratio Selection */}
                      <div className="space-y-2">
                        <Label>Aspect Ratio</Label>
                        <div className="flex flex-wrap gap-2">
                          {['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'].map((ratio) => (
                            <Button
                              key={ratio}
                              type="button"
                              variant={aspectRatioKey === ratio ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setAspectRatioKey(ratio)}
                              className="min-w-[60px]"
                            >
                              {ratio}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Selection */}
                <div className="space-y-2">
                  <Label htmlFor="videoType">Video (optional)</Label>
                  <Select value={videoInputType} onValueChange={(value: "none" | "select" | "youtube") => {
                    setVideoInputType(value);
                    if (value === "none") {
                      setNewPost({ ...newPost, video_id: "", youtube_url: "" });
                    }
                  }}>
                    <SelectTrigger id="videoType">
                      <SelectValue placeholder="Select video option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Video</SelectItem>
                      <SelectItem value="select">Select Existing Video</SelectItem>
                      <SelectItem value="youtube">Embed YouTube Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {videoInputType === "select" && (
                  <div className="space-y-2">
                    <Label htmlFor="video">Select Video</Label>
                    <Select value={newPost.video_id || "none"} onValueChange={(value) => setNewPost({ ...newPost, video_id: value === "none" ? "" : value, youtube_url: "" })}>
                      <SelectTrigger id="video">
                        <SelectValue placeholder="Choose a video" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {videos.map((video) => (
                          <SelectItem key={video.id} value={video.id}>
                            {video.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {videoInputType === "youtube" && (
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube URL</Label>
                    <Input
                      id="youtube"
                      value={newPost.youtube_url}
                      onChange={(e) => setNewPost({ ...newPost, youtube_url: e.target.value, video_id: "" })}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {/* Event Selection */}
                <div className="space-y-2">
                  <Label htmlFor="event">Event (optional)</Label>
                  <Select value={newPost.event_id || "none"} onValueChange={(value) => setNewPost({ ...newPost, event_id: value === "none" ? "" : value })}>
                    <SelectTrigger id="event">
                      <SelectValue placeholder="Link to event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} ({new Date(event.event_date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label>Visible to (select all that apply)</Label>
                  <div className="flex flex-wrap gap-4">
                    {['caregiver', 'bestie', 'supporter'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={role}
                          checked={visibleToRoles.includes(role)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setVisibleToRoles([...visibleToRoles, role]);
                            } else {
                              setVisibleToRoles(visibleToRoles.filter(r => r !== role));
                            }
                          }}
                        />
                        <label htmlFor={role} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize">
                          {role === 'caregiver' ? 'Guardians' : role + 's'}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {hasAdminAccess && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow-admin-edit"
                        checked={allowAdminEdit}
                        onCheckedChange={(checked) => setAllowAdminEdit(!!checked)}
                      />
                      <label htmlFor="allow-admin-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Allow admin to edit this post
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow-owner-edit"
                        checked={allowOwnerEdit}
                        onCheckedChange={(checked) => setAllowOwnerEdit(!!checked)}
                      />
                      <label htmlFor="allow-owner-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Allow owner to edit this post
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allow-owner-claim"
                        checked={allowOwnerClaim}
                        onCheckedChange={(checked) => setAllowOwnerClaim(!!checked)}
                      />
                      <label htmlFor="allow-owner-claim" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Allow owner to claim this post
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleCreatePost} disabled={uploadingImage || !newPost.title || !newPost.content}>
                    {uploadingImage ? (editingPostId ? "Updating..." : "Creating...") : (editingPostId ? "Update Post" : "Create Post")}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowNewPost(false);
                    setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
                    removeImage();
                    setVideoInputType("none");
                    setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
                    setAllowOwnerClaim(false);
                    setAllowAdminEdit(false);
                    setAllowOwnerEdit(false);
                    setAspectRatioKey('16:9');
                    setEditingPostId(null);
                  }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
              <SelectTrigger className="w-full sm:w-[200px] h-11">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {sortedPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No discussions found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchQuery 
                      ? "Try a different search term" 
                      : "Be the first to start a discussion!"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              sortedPosts.map((post) => (
                <div key={post.id} id={`post-${post.id}`}>
                  <DiscussionPostCard
                    post={post}
                    onClick={() => {
                      setSelectedPost(post);
                      setDetailDialogOpen(true);
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Discussion Detail Dialog */}
      <DiscussionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        post={selectedPost}
        onComment={async (postId, content, audioBlob) => {
          // Handle comment submission
          try {
            let audioUrl: string | null = null;

            if (audioBlob) {
              const fileName = `${user?.id}/${Date.now()}_comment.webm`;
              const { error: uploadError } = await supabase.storage
                .from('discussion-images')
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

            let approvalStatus = 'approved';
            if (profile?.role === 'bestie') {
              const { data: guardianLinks } = await supabase
                .from('caregiver_bestie_links')
                .select('require_comment_approval')
                .eq('bestie_id', user?.id);
              
              if (guardianLinks?.some(link => link.require_comment_approval)) {
                approvalStatus = 'pending_approval';
              }
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
                approval_status: approvalStatus,
              });

            if (error) {
              toast({
                title: "Error adding comment",
                description: error.message,
                variant: "destructive",
              });
              return;
            }

            // Award coins for commenting
            if (user?.id) {
              await awardCoinReward(user.id, 'discussion_comment', 'Added a comment');
            }

            if (approvalStatus === 'pending_approval') {
              toast({ 
                title: "Comment pending approval",
                description: "Your guardian will review this comment before it's published.",
              });
            } else if (isApproved) {
              toast({ title: audioUrl ? "Audio comment added!" : "Comment added!" });
            } else {
              toast({ 
                title: "Comment submitted for review",
                description: "Your comment will be reviewed by moderators.",
              });
            }

            await loadPosts();
            const updatedPost = posts.find(p => p.id === postId);
            if (updatedPost) {
              setSelectedPost(updatedPost);
            }
          } catch (error) {
            console.error("Error adding comment:", error);
            toast({
              title: "Error",
              description: "Failed to add comment",
              variant: "destructive",
            });
          }
        }}
        onDeletePost={(postId) => {
          handleDeletePost(postId);
          setDetailDialogOpen(false);
        }}
        onDeleteComment={async (commentId, postId) => {
          await handleDeleteComment(commentId, postId);
          await loadPosts();
          const updatedPost = posts.find(p => p.id === postId);
          if (updatedPost) {
            setSelectedPost(updatedPost);
          }
        }}
        onEditComment={async (commentId, newContent) => {
          await handleEditComment(commentId, newContent);
          await loadPosts();
          const updatedPost = posts.find(p => p.id === selectedPost?.id);
          if (updatedPost) {
            setSelectedPost(updatedPost);
          }
        }}
        onEditPost={(post) => {
          handleEditPost(post);
          setDetailDialogOpen(false);
        }}
        canDelete={canDeleteContent}
        isEditablePost={selectedPost ? editablePostIds.has(selectedPost.id) : false}
        currentUserId={user?.id}
      />

      {/* Image Crop Dialog */}
      {(imageToCrop || imagePreview) && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageUrl={imageToCrop || imagePreview || ""}
          onCropComplete={handleCropComplete}
          title="Crop Post Image"
          description="Adjust the crop area and try different aspect ratios"
          allowAspectRatioChange={true}
          selectedRatioKey={aspectRatioKey as any}
          onAspectRatioKeyChange={(key) => setAspectRatioKey(key)}
        />
      )}
    </div>
  );
};

export default Discussions;
