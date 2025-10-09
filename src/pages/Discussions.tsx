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
import { MessageSquare, Send, Heart, Trash2, Image as ImageIcon, X, Mic, Edit, Search, ArrowUpDown, Calendar } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import ImageLightbox from "@/components/ImageLightbox";
import { discussionPostSchema, commentSchema, validateInput } from "@/lib/validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VendorStoreLinkBadge } from "@/components/VendorStoreLinkBadge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { ShareIconButton } from "@/components/ShareButtons";
import { SEOHead, getArticleStructuredData } from "@/components/SEOHead";

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
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [canCreatePosts, setCanCreatePosts] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string }>>([]);
  const [videoInputType, setVideoInputType] = useState<"none" | "select" | "youtube">("none");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [commentAudio, setCommentAudio] = useState<{ [key: string]: Blob | null }>({});
  const [showAudioRecorder, setShowAudioRecorder] = useState<{ [key: string]: boolean }>({});
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['caregiver', 'bestie', 'supporter']);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<Array<{ image_url: string; caption?: string | null }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [allowOwnerClaim, setAllowOwnerClaim] = useState(false);
  const [changeAuthorDialogOpen, setChangeAuthorDialogOpen] = useState(false);
  const [postToChangeAuthor, setPostToChangeAuthor] = useState<Post | null>(null);
  const [newAuthorId, setNewAuthorId] = useState<string>("");
  const [adminOwnerUsers, setAdminOwnerUsers] = useState<Array<{ id: string; display_name: string; role: string }>>([]);
  const [editablePostIds, setEditablePostIds] = useState<Set<string>>(new Set());
  const [editableCommentIds, setEditableCommentIds] = useState<Set<string>>(new Set());

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
    await fetchProfile(session.user.id);
    await loadPosts();
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return;
    }

    // Fetch role from user_roles table (security requirement)
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
    
    // Load videos and events for dropdown
    if (['caregiver', 'admin', 'owner'].includes(profile.role)) {
      loadVideos();
      loadEvents();
    }
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

  const loadPosts = async () => {
      const { data: postsData, error: postsError } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles_public!discussion_posts_author_id_fkey(id, display_name, role, avatar_number),
        album:albums(id, title, cover_image_url, is_active),
        video:videos(id, title, video_url, youtube_url, video_type),
        event:events(id, title, event_date, location)
      `)
      .eq("is_moderated", true)
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

    // Load comments for each post
    const postsWithComments = await Promise.all(
      (postsData || []).map(async (post) => {
        const { data: commentsData } = await supabase
          .from("discussion_comments")
          .select(`
            *,
            author:profiles_public!discussion_comments_author_id_fkey(id, display_name, role, avatar_number)
          `)
          .eq("post_id", post.id)
          .eq("is_moderated", true)
          .order("created_at", { ascending: true });


        // If post has an album, load its images
        let albumImages = [];
        if ((post as any).album_id) {
          const { data: imagesData } = await supabase
            .from("album_images")
            .select("*")
            .eq("album_id", (post as any).album_id)
            .order("display_order", { ascending: true });
          
          albumImages = imagesData || [];
        }

        return { ...post, comments: commentsData || [], album_images: albumImages };
      })
    );

    setPosts(postsWithComments);
    
    // Load editable posts for current user
    if (profile) {
      await loadEditablePostIds(postsWithComments);
    }
  };

  const loadEditablePostIds = async (postsToCheck: Post[]) => {
    if (!profile || !user) return;
    
    const editable = new Set<string>();
    
    for (const post of postsToCheck) {
      // User is author or admin/owner
      if (profile.id === post.author_id || ['admin', 'owner'].includes(profile.role)) {
        editable.add(post.id);
        continue;
      }
      
      // Check if user is guardian of post author
      if (profile.role === 'caregiver') {
        const { data: guardianLinks } = await supabase
          .from('caregiver_bestie_links')
          .select('id')
          .eq('caregiver_id', profile.id)
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
    // Validate input first
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

      // Moderate text content
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

      let imageUrl: string | null = null;
      let imageModerationStatus: string | null = null;
      let imageModerationSeverity: string | null = null;
      let imageModerationReason: string | null = null;

      // Upload and moderate image if present
      if (selectedImage && imagePreview) {
        // Compress image before uploading
        const compressedImage = await compressImage(selectedImage, 4.5);

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

        // Check moderation settings
        const { data: moderationSettings } = await supabase
          .from('moderation_settings')
          .select('discussion_post_image_policy')
          .maybeSingle();

        const imagePolicy = moderationSettings?.discussion_post_image_policy || 'flagged';

        if (imagePolicy === 'all') {
          // All images require moderation
          imageModerationStatus = 'pending';
          imageModerationSeverity = 'manual_review';
          imageModerationReason = 'Admin policy requires all images to be reviewed';
        } else if (imagePolicy === 'flagged') {
          // Moderate the uploaded image with AI
          const { data: imageModeration, error: imageModerationError } = await supabase.functions.invoke('moderate-image', {
            body: { imageUrl: publicUrl }
          });

          if (imageModerationError) {
            console.error("Image moderation error:", imageModerationError);
            // Continue anyway - fail open
          } else {
            const imageApproved = imageModeration?.approved ?? true;
            imageModerationStatus = imageApproved ? 'approved' : 'pending';
            imageModerationSeverity = imageModeration?.severity || null;
            imageModerationReason = imageModeration?.reason || null;
          }
        } else {
          // Policy is 'none' - auto-approve
          imageModerationStatus = 'approved';
        }
      }

      const textIsApproved = textModeration?.approved ?? true;
      const textReason = textModeration?.reason || "";
      const textSeverity = textModeration?.severity || "";

      // Combine moderation notes
      let finalModerationNotes = null;
      if (!textIsApproved || (imageModerationStatus === 'pending')) {
        const notes = [];
        if (!textIsApproved) notes.push(`Text: ${textSeverity} severity - ${textReason}`);
        if (imageModerationStatus === 'pending') notes.push(`Image: ${imageModerationSeverity} severity - ${imageModerationReason}`);
        finalModerationNotes = notes.join('; ');
      }

      // Always include admin and owner roles
      const finalVisibleRoles = [...new Set([...visibleToRoles, 'admin', 'owner'])] as any;

      // Check if guardian approval is required
      let approvalStatus = 'approved';
      if (profile?.role === 'bestie') {
        const { data: guardianLinks } = await supabase
          .from('caregiver_bestie_links')
          .select('require_post_approval')
          .eq('bestie_id', user?.id);
        
        // If any guardian requires approval, set status to pending
        if (guardianLinks?.some(link => link.require_post_approval)) {
          approvalStatus = 'pending_approval';
        }
      }

      const { error } = await supabase
        .from("discussion_posts")
        .insert({
          title: newPost.title,
          content: newPost.content,
          author_id: user?.id,
          image_url: imageUrl,
          video_id: newPost.video_id || null,
          youtube_url: newPost.youtube_url || null,
          visible_to_roles: finalVisibleRoles,
          is_moderated: textIsApproved && (imageModerationStatus === 'approved' || imageModerationStatus === null),
          moderation_status: imageModerationStatus || 'pending',
          moderation_severity: imageModerationSeverity,
          moderation_reason: imageModerationReason,
          moderation_notes: finalModerationNotes,
          approval_status: approvalStatus,
          allow_owner_claim: allowOwnerClaim,
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

      if (approvalStatus === 'pending_approval') {
        toast({ 
          title: "Post pending approval",
          description: "Your guardian will review this post before it's published.",
        });
      } else if (textIsApproved && (imageModerationStatus === 'approved' || imageModerationStatus === null)) {
        toast({ title: "Post created successfully!" });
      } else {
        toast({ 
          title: "Post submitted for review",
          description: "Your post will be reviewed by moderators before being published.",
        });
      }

      setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
      setSelectedImage(null);
      setImagePreview(null);
      setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
      setShowNewPost(false);
      setVideoInputType("none");
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

    // Validate text content if provided
    if (content?.trim()) {
      const validation = validateInput(commentSchema, {
        content: content,
        postId: postId,
        audioUrl: '',
      });

      if (!validation.success) {
        toast({
          title: "Validation error",
          description: validation.errors?.[0] || "Please check your input",
          variant: "destructive",
        });
        return;
      }
    }

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

      // Check if guardian approval is required
      let approvalStatus = 'approved';
      if (profile?.role === 'bestie') {
        const { data: guardianLinks } = await supabase
          .from('caregiver_bestie_links')
          .select('require_comment_approval')
          .eq('bestie_id', user?.id);
        
        // If any guardian requires approval, set status to pending
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

  const canDeleteContent = async (authorId: string) => {
    // Admin-level access (includes owner) or content author can delete
    if (!profile || !user) return false;
    
    // Check if user is the author
    if (profile.id === authorId) return true;
    
    // Check if user is admin/owner
    if (['admin', 'owner'].includes(profile.role)) return true;
    
    // Check if user is a guardian of the author
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
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setAllowOwnerClaim((post as any).allow_owner_claim || false);
    
    // Populate all media and link fields
    setNewPost({
      title: post.title,
      content: post.content,
      video_id: post.video_id || "",
      youtube_url: post.youtube_url || "",
      event_id: (post.event?.id as string) || "",
    });
    
    // Set video input type based on what's present
    if (post.youtube_url) {
      setVideoInputType("youtube");
    } else if (post.video_id) {
      setVideoInputType("select");
    } else {
      setVideoInputType("none");
    }
    
    // Set image preview if image exists
    if (post.image_url) {
      setImagePreview(post.image_url);
    }
  };

  const handleSavePostEdit = async () => {
    if (!editingPostId) return;

    try {
      let imageUrl = imagePreview;
      
      // Upload new image if one was selected
      if (selectedImage && originalImageFile) {
        const compressedImage = await compressImage(selectedImage, 4.5);
        const fileName = `${user?.id}/${Date.now()}_${selectedImage.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('discussion-images')
          .upload(fileName, compressedImage);

        if (uploadError) {
          toast({
            title: "Error uploading image",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('discussion-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("discussion_posts")
        .update({
          title: editTitle,
          content: editContent,
          video_id: newPost.video_id || null,
          youtube_url: newPost.youtube_url || null,
          event_id: newPost.event_id || null,
          image_url: imageUrl,
          allow_owner_claim: allowOwnerClaim,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPostId);

      if (error) throw error;

      toast({ title: "Post updated successfully" });
      setEditingPostId(null);
      setSelectedImage(null);
      setImagePreview(null);
      setOriginalImageFile(null);
      setVideoInputType("none");
      setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
      loadPosts();
    } catch (error: any) {
      console.error("Error updating post:", error);
      toast({
        title: "Error updating post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditTitle("");
    setEditContent("");
    setAllowOwnerClaim(false);
    setSelectedImage(null);
    setImagePreview(null);
    setOriginalImageFile(null);
    setVideoInputType("none");
    setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
  };

  const loadAdminOwnerUsers = async () => {
    const { data } = await supabase
      .from("profiles_public")
      .select("id, display_name, role")
      .in("role", ["admin", "owner"])
      .order("display_name", { ascending: true });
    
    if (data) setAdminOwnerUsers(data);
  };

  const handleChangeAuthor = (post: Post) => {
    setPostToChangeAuthor(post);
    setNewAuthorId(post.author_id);
    loadAdminOwnerUsers();
    setChangeAuthorDialogOpen(true);
  };

  const handleSaveAuthorChange = async () => {
    if (!postToChangeAuthor || !newAuthorId) return;

    const { error } = await supabase
      .from("discussion_posts")
      .update({
        author_id: newAuthorId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postToChangeAuthor.id);

    if (error) {
      toast({
        title: "Error changing author",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Post author changed successfully" });
    setChangeAuthorDialogOpen(false);
    setPostToChangeAuthor(null);
    setNewAuthorId("");
    loadPosts();
  };

  const getRoleBadgeColor = (role: string) => {
    // Use consistent outlined style matching the nav bar
    return "text-xs px-2.5 py-1 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 text-primary font-semibold capitalize";
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
      <SEOHead
        title="Discussions | Joy House Community"
        description="Join conversations and connect with our community. Share stories, experiences, and support with adults with special needs and their families."
      />
      <UnifiedHeader />
      
      <main className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
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
                             {video.title} {video.video_type === 'youtube' && '(YouTube)'}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
                 
                  {videoInputType === "youtube" && (
                    <div className="space-y-2">
                      <Label htmlFor="youtubeUrl">YouTube URL</Label>
                      <Input
                        id="youtubeUrl"
                        value={newPost.youtube_url}
                        onChange={(e) => setNewPost({ ...newPost, youtube_url: e.target.value, video_id: "" })}
                        placeholder="https://www.youtube.com/watch?v=... or video ID"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the full YouTube URL or just the video ID
                      </p>
                    </div>
                  )}

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

                {hasAdminAccess && (
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="allow-owner-claim"
                      checked={allowOwnerClaim}
                      onCheckedChange={(checked) => setAllowOwnerClaim(!!checked)}
                    />
                    <label htmlFor="allow-owner-claim" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Allow owner to claim this post
                    </label>
                  </div>
                )}

                 <div className="flex gap-2">
                   <Button onClick={handleCreatePost} disabled={uploadingImage}>
                     {uploadingImage ? "Posting..." : "Post"}
                   </Button>
                   <Button variant="outline" onClick={() => {
      setShowNewPost(false);
      removeImage();
      setNewPost({ title: "", content: "", video_id: "", youtube_url: "", event_id: "" });
      setVideoInputType("none");
      setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
      setAllowOwnerClaim(false);
                   }} disabled={uploadingImage}>
                     Cancel
                   </Button>
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <div className="space-y-6">
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortOrder} onValueChange={(value: "newest" | "oldest") => setSortOrder(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(() => {
              // Filter posts by search query
              let filteredPosts = posts.filter(post => {
                const query = searchQuery.toLowerCase();
                return (
                  post.title.toLowerCase().includes(query) ||
                  post.content.toLowerCase().includes(query)
                );
              });

              // Sort posts
              const sortedPosts = [...filteredPosts].sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
              });

              if (sortedPosts.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">
                        {searchQuery ? "No posts found" : "No posts yet"}
                      </h3>
                      <p className="text-muted-foreground">
                        {searchQuery 
                          ? "Try a different search term" 
                          : "Be the first to start a discussion!"
                        }
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return sortedPosts.map((post) => (
                <Card key={post.id} id={`post-${post.id}`}>
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
                            {!editingPostId && <TextToSpeech text={`${post.title}. ${post.content}`} />}
                            {editablePostIds.has(post.id) && editingPostId !== post.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPost(post)}
                                className="h-8 w-8"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {profile?.role === 'owner' && 
                             ['admin', 'owner'].includes(post.author?.role || '') && 
                             (post as any).allow_owner_claim && 
                             post.author_id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChangeAuthor(post)}
                                className="h-8"
                              >
                                Claim Post
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {post.author?.display_name || "Unknown"}
                            </span>
                            <span className={getRoleBadgeColor(post.author?.role || "")}>
                              {post.author?.role === "caregiver" ? "Guardian" : post.author?.role}
                            </span>
                            {post.author_id && (post.author?.role === 'bestie' || post.author?.role === 'caregiver') && (
                              <VendorStoreLinkBadge userId={post.author_id} userRole={post.author?.role} variant="badge" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            {post.approval_status === 'pending_approval' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                                Pending Approval
                              </span>
                            )}
                            {post.approval_status === 'rejected' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                                Rejected
                              </span>
                            )}
                            {(post as any).album && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/gallery#${(post as any).album.id}`)}
                                className="text-xs h-6 px-2 gap-1"
                              >
                                <ImageIcon className="w-3 h-3" />
                                View Album
                              </Button>
                            )}
                            <div className="ml-auto">
                              <ShareIconButton
                                title={post.title}
                                description={post.content.substring(0, 150)}
                                url={`${window.location.origin}/discussions?postId=${post.id}`}
                                hashtags={['JoyHouse', 'Community']}
                              />
                            </div>
                            {/* Event link badge - kept for reference */}
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
                     {editingPostId === post.id ? (
                       <div className="space-y-4">
                         <div>
                           <Label>Title</Label>
                           <Input
                             value={editTitle}
                             onChange={(e) => setEditTitle(e.target.value)}
                             placeholder="Post title"
                           />
                         </div>
                         <div>
                           <Label>Content</Label>
                           <Textarea
                             value={editContent}
                             onChange={(e) => setEditContent(e.target.value)}
                             placeholder="Post content"
                             className="min-h-[150px]"
                           />
                         </div>
                         
                         {/* Image Upload/Edit */}
                         <div className="space-y-2">
                           <Label htmlFor="edit-image">Image (optional)</Label>
                           <div className="flex items-center gap-2">
                             <Input
                               id="edit-image"
                               type="file"
                               accept="image/*"
                               onChange={handleImageSelect}
                               className="hidden"
                             />
                             <Button
                               type="button"
                               variant="outline"
                               onClick={() => document.getElementById('edit-image')?.click()}
                             >
                               <ImageIcon className="w-4 h-4 mr-2" />
                               {imagePreview ? 'Change Image' : 'Add Image'}
                             </Button>
                             {imagePreview && (
                               <Button
                                 type="button"
                                 variant="destructive"
                                 size="icon"
                                 onClick={removeImage}
                               >
                                 <X className="w-4 h-4" />
                               </Button>
                             )}
                           </div>
                           {imagePreview && (
                             <div className="relative inline-block">
                               <img 
                                 src={imagePreview} 
                                 alt="Preview" 
                                 className="max-w-xs max-h-48 rounded-lg"
                               />
                             </div>
                           )}
                         </div>
                         
                         {/* Video Selection */}
                         <div className="space-y-2">
                           <Label>Video (optional)</Label>
                           <Select value={videoInputType} onValueChange={(value: "none" | "select" | "youtube") => {
                             setVideoInputType(value);
                             if (value === "none") {
                               setNewPost({ ...newPost, video_id: "", youtube_url: "" });
                             }
                           }}>
                             <SelectTrigger>
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
                             <Label>Select Video</Label>
                             <Select value={newPost.video_id || "none"} onValueChange={(value) => setNewPost({ ...newPost, video_id: value === "none" ? "" : value, youtube_url: "" })}>
                               <SelectTrigger>
                                 <SelectValue placeholder="Choose a video" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="none">None</SelectItem>
                                 {videos.map((video) => (
                                   <SelectItem key={video.id} value={video.id}>
                                     {video.title} {video.video_type === 'youtube' && '(YouTube)'}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                           </div>
                         )}
                         
                         {videoInputType === "youtube" && (
                           <div className="space-y-2">
                             <Label>YouTube URL</Label>
                             <Input
                               value={newPost.youtube_url}
                               onChange={(e) => setNewPost({ ...newPost, youtube_url: e.target.value, video_id: "" })}
                               placeholder="https://www.youtube.com/watch?v=... or video ID"
                             />
                           </div>
                         )}
                         
                         {/* Event Selection */}
                         <div className="space-y-2">
                           <Label>Event (optional)</Label>
                           <Select value={newPost.event_id || "none"} onValueChange={(value) => setNewPost({ ...newPost, event_id: value === "none" ? "" : value })}>
                             <SelectTrigger>
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
                          
                          {hasAdminAccess && (
                            <div className="flex items-center space-x-2 pt-2 border-t">
                              <Checkbox
                                id="edit-allow-owner-claim"
                                checked={allowOwnerClaim}
                                onCheckedChange={(checked) => setAllowOwnerClaim(!!checked)}
                              />
                              <label htmlFor="edit-allow-owner-claim" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Allow owner to claim this post
                              </label>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Button onClick={handleSavePostEdit} size="sm">
                              Save Changes
                            </Button>
                            <Button onClick={handleCancelEdit} size="sm" variant="outline">
                              Cancel
                            </Button>
                          </div>
                       </div>
                     ) : (
                       <>
                         <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                         
                         {/* Event Summary Card */}
                         {post.event && (
                           <Card 
                             className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 cursor-pointer hover:border-primary/40 transition-colors"
                             onClick={() => navigate(`/events?eventId=${post.event.id}`)}
                           >
                             <CardContent className="p-4">
                               <div className="flex gap-4">
                                 {post.event.location && (
                                   <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                                     <div className="w-full h-full flex items-center justify-center">
                                       <Calendar className="w-10 h-10 text-primary" />
                                     </div>
                                   </div>
                                 )}
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-start justify-between gap-2">
                                     <div className="flex items-center gap-2">
                                       <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                                       <h4 className="font-semibold text-foreground">Linked Event</h4>
                                     </div>
                                   </div>
                                   <h5 className="font-bold text-lg mt-2 text-foreground">{post.event.title}</h5>
                                   <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                                     <div className="flex items-center gap-2">
                                       <Calendar className="w-3 h-3" />
                                       <span>{new Date(post.event.event_date).toLocaleString('en-US', {
                                         weekday: 'long',
                                         year: 'numeric',
                                         month: 'long',
                                         day: 'numeric',
                                         hour: 'numeric',
                                         minute: '2-digit'
                                       })}</span>
                                     </div>
                                     {post.event.location && (
                                       <div className="flex items-center gap-2">
                                         <span className="text-xs">📍</span>
                                         <span className="truncate">{post.event.location}</span>
                                       </div>
                                     )}
                                   </div>
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     className="mt-3"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       navigate(`/events?eventId=${post.event.id}`);
                                     }}
                                   >
                                     View Event Details →
                                   </Button>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         )}
                       </>
                     )}

                     {/* Display Video if present */}
                     {(post.video || post.youtube_url) && (
                       <div className="rounded-lg overflow-hidden">
                         {post.youtube_url ? (
                           <YouTubeEmbed url={post.youtube_url} title={post.title} />
                         ) : post.video?.video_type === 'youtube' && post.video.youtube_url ? (
                           <YouTubeEmbed url={post.video.youtube_url} title={post.video.title} />
                         ) : post.video?.video_url ? (
                           <VideoPlayer src={post.video.video_url} title={post.video.title} className="w-full" />
                         ) : null}
                       </div>
                     )}

                     {/* Display Image if present and no album images */}
                     {post.image_url && !post.album_images?.length && (
                       <div className="rounded-lg overflow-hidden">
                         <img 
                           src={post.image_url} 
                           alt="Post image" 
                           className="w-full max-h-96 object-cover"
                         />
                       </div>
                     )}

                    {/* Display album images in a grid if present */}
                    {post.album_images && post.album_images.length > 0 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {post.album_images.slice(0, 6).map((image, index) => (
                            <div
                              key={image.id}
                              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                              onClick={() => {
                                setLightboxImages(post.album_images!);
                                setLightboxIndex(index);
                                setLightboxOpen(true);
                              }}
                            >
                              <img
                                src={image.image_url}
                                alt={image.caption || `Album image ${index + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              {index === 5 && post.album_images.length > 6 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white text-2xl font-bold">
                                    +{post.album_images.length - 6}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {post.album_images.length > 6 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLightboxImages(post.album_images!);
                              setLightboxIndex(0);
                              setLightboxOpen(true);
                            }}
                            className="w-full"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            View All {post.album_images.length} Photos
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Comments Section */}
                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comments ({post.comments?.length || 0})
                      </h4>

                      {/* Comments List */}
                      {(() => {
                        const INITIAL_COMMENTS = 3;
                        const comments = post.comments || [];
                        const isExpanded = expandedComments[post.id];
                        const visibleComments = isExpanded ? comments : comments.slice(0, INITIAL_COMMENTS);
                        const hasMore = comments.length > INITIAL_COMMENTS;

                        return (
                          <>
                            {visibleComments.map((comment) => (
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
                                  <span className={getRoleBadgeColor(comment.author?.role || "")}>
                                    {comment.author?.role === "caregiver" ? "Guardian" : comment.author?.role}
                                  </span>
                                  {comment.author_id && (comment.author?.role === 'bestie' || comment.author?.role === 'caregiver') && (
                                    <VendorStoreLinkBadge userId={comment.author_id} userRole={comment.author?.role} variant="badge" />
                                  )}
                                   <span className="text-xs text-muted-foreground">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                   </span>
                                   {comment.approval_status === 'pending_approval' && (
                                     <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                                       Pending Approval
                                     </span>
                                   )}
                                   {comment.approval_status === 'rejected' && (
                                     <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                                       Rejected
                                     </span>
                                   )}
                                </div>
                                {comment.content && <p className="text-sm">{comment.content}</p>}
                                {comment.audio_url && (
                                  <AudioPlayer src={comment.audio_url} />
                                )}
                              </div>
                            </div>
                             {editableCommentIds.has(comment.id) && (
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

                            {/* Show More/Less Button */}
                            {hasMore && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedComments({ 
                                  ...expandedComments, 
                                  [post.id]: !isExpanded 
                                })}
                                className="w-full text-sm text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded 
                                  ? 'Show less' 
                                  : `Show all ${comments.length} comments`
                                }
                              </Button>
                            )}
                          </>
                        );
                      })()}

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
            })()}
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Change Author Dialog */}
      <Dialog open={changeAuthorDialogOpen} onOpenChange={setChangeAuthorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Post Author</DialogTitle>
            <DialogDescription>
              Select the new author for this post. Only admins and owners are available.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-author">New Author</Label>
              <Select value={newAuthorId} onValueChange={setNewAuthorId}>
                <SelectTrigger id="new-author">
                  <SelectValue placeholder="Select new author" />
                </SelectTrigger>
                <SelectContent>
                  {adminOwnerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeAuthorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAuthorChange} disabled={!newAuthorId}>
              Change Author
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {(imageToCrop || imagePreview) && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageUrl={imageToCrop || imagePreview || ""}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          title="Crop Post Image"
          description="Adjust the image to show what will be visible in the post (16:9 format)"
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrevious={() => {
          setLightboxIndex((prev) => 
            prev === 0 ? lightboxImages.length - 1 : prev - 1
          );
        }}
        onNext={() => {
          setLightboxIndex((prev) => 
            prev === lightboxImages.length - 1 ? 0 : prev + 1
          );
        }}
      />
    </div>
  );
};

export default Discussions;