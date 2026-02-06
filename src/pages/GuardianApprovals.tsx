import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, MessageSquare, FileText, Mail, HandHeart } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { VendorLinkRequests } from "@/components/guardian/VendorLinkRequests";
import { BestieSponsorMessages } from "@/components/guardian/BestieSponsorMessages";
import { PrayerApprovals } from "@/components/guardian/PrayerApprovals";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PendingPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  author: {
    display_name: string;
    avatar_number: number;
    profile_avatar_id?: string;
  };
}

interface PendingComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  audio_url?: string | null;
  post_id: string;
  author: {
    display_name: string;
    avatar_number: number;
    profile_avatar_id?: string;
  };
  post: {
    title: string;
  };
}

export default function GuardianApprovals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [pendingVendorLinks, setPendingVendorLinks] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);
  const [pendingPrayers, setPendingPrayers] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = roleData?.role;
      const isGuardian = role === "caregiver";
      const isAdminOrOwner = role === "admin" || role === "owner";

      // Guardians always have access. Admins/owners need to be linked to at least one bestie.
      if (isGuardian) {
        setCurrentUserId(user.id);
        await loadPendingContent(user.id);
        return;
      }

      if (isAdminOrOwner) {
        // Check if they have any linked besties
        const { data: links } = await supabase
          .from("caregiver_bestie_links")
          .select("bestie_id")
          .eq("caregiver_id", user.id)
          .limit(1);

        if (links && links.length > 0) {
          setCurrentUserId(user.id);
          await loadPendingContent(user.id);
          return;
        }
      }

      toast({
        title: "Access denied",
        description: "Only guardians or admins/owners linked to besties can access this page",
        variant: "destructive",
      });
      navigate("/community");
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

  const loadPendingContent = async (userId: string) => {
    try {
      // Get linked besties
      const { data: links } = await supabase
        .from("caregiver_bestie_links")
        .select("bestie_id")
        .eq("caregiver_id", userId);

      if (!links || links.length === 0) {
        setPendingPosts([]);
        setPendingComments([]);
        return;
      }

      const bestieIds = links.map(l => l.bestie_id);

      // Load pending posts
      const { data: postsData, error: postsError } = await supabase
        .from("discussion_posts")
        .select(`
          id,
          title,
          content,
          created_at,
          author_id,
          image_url,
          author:profiles!discussion_posts_author_id_fkey(
            display_name,
            avatar_number,
            profile_avatar_id
          )
        `)
        .eq("approval_status", "pending_approval")
        .in("author_id", bestieIds)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Load pending comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("discussion_comments")
        .select(`
          id,
          content,
          created_at,
          author_id,
          audio_url,
          post_id,
          author:profiles!discussion_comments_author_id_fkey(
            display_name,
            avatar_number,
            profile_avatar_id
          ),
          post:discussion_posts!discussion_comments_post_id_fkey(
            title
          )
        `)
        .eq("approval_status", "pending_approval")
        .in("author_id", bestieIds)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      setPendingPosts((postsData || []).map(p => ({
        ...p,
        author: Array.isArray(p.author) ? p.author[0] : p.author
      })) as PendingPost[]);

      setPendingComments((commentsData || []).map(c => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
        post: Array.isArray(c.post) ? c.post[0] : c.post
      })) as PendingComment[]);

      // Load pending vendor link requests count
      const { count: vendorCount } = await supabase
        .from('vendor_bestie_requests')
        .select('*', { count: 'exact', head: true })
        .in('bestie_id', bestieIds)
        .eq('status', 'pending');

      setPendingVendorLinks(vendorCount || 0);

      // Load pending sponsor messages count
      const { count: messagesCount } = await supabase
        .from('sponsor_messages')
        .select('*', { count: 'exact', head: true })
        .in('bestie_id', bestieIds)
        .eq('status', 'pending_approval');

      setPendingMessages(messagesCount || 0);

      // Load pending prayer requests count
      const { count: prayerCount } = await supabase
        .from('prayer_requests')
        .select('*', { count: 'exact', head: true })
        .in('user_id', bestieIds)
        .eq('approval_status', 'pending_approval');

      setPendingPrayers(prayerCount || 0);
    } catch (error: any) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApprovePost = async (postId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("discussion_posts")
        .update({
          approval_status: "approved",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post approved",
        description: "The post is now visible to everyone",
      });

      await loadPendingContent(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error approving post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectPost = async (postId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("discussion_posts")
        .update({
          approval_status: "rejected",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post rejected",
        description: "The post will not be published",
      });

      await loadPendingContent(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error rejecting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApproveComment = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("discussion_comments")
        .update({
          approval_status: "approved",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment approved",
        description: "The comment is now visible to everyone",
      });

      await loadPendingContent(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error approving comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectComment = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("discussion_comments")
        .update({
          approval_status: "rejected",
          approved_by: currentUserId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment rejected",
        description: "The comment will not be published",
      });

      await loadPendingContent(currentUserId);
    } catch (error: any) {
      toast({
        title: "Error rejecting comment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            <p className="text-muted-foreground">Loading approvals...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div data-tour-target="approvals-header">
            <h1 className="text-3xl font-bold">Pending Approvals</h1>
            <p className="text-muted-foreground mt-2">
              Review and approve content from your linked besties
            </p>
          </div>

          <Tabs defaultValue="posts" className="w-full" data-tour-target="approvals-tabs">
            <TabsList className="inline-flex flex-wrap h-auto" data-tour-target="approval-tabs-list">
              <TabsTrigger value="posts" className="gap-2 whitespace-nowrap" data-tour-target="posts-tab">
                <FileText className="w-4 h-4" />
                Posts
                {pendingPosts.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingPosts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2" data-tour-target="comments-tab">
                <MessageSquare className="w-4 h-4" />
                Comments
                {pendingComments.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingComments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-2" data-tour-target="vendors-tab">
                Vendor Links
                {pendingVendorLinks > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingVendorLinks}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2" data-tour-target="messages-tab">
                <Mail className="w-4 h-4" />
                Messages
                {pendingMessages > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingMessages}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="prayers" className="gap-2" data-tour-target="prayers-tab">
                <HandHeart className="w-4 h-4" />
                Prayers
                {pendingPrayers > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingPrayers}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {pendingPosts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending posts</h3>
                    <p className="text-muted-foreground text-center">
                      All posts from your linked besties have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingPosts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay
                            profileAvatarId={post.author.profile_avatar_id}
                            displayName={post.author.display_name}
                            size="md"
                          />
                          <div>
                            <CardTitle className="text-lg">{post.title}</CardTitle>
                            <CardDescription>
                              by {post.author.display_name} • {new Date(post.created_at).toLocaleString()}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge>Pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                      
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post attachment"
                          className="rounded-lg max-w-full h-auto"
                        />
                      )}

                      <div className="flex gap-2 pt-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="gap-2 flex-1" variant="default">
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This post will be published and visible to all community members.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApprovePost(post.id)}>
                                Approve Post
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="gap-2 flex-1" variant="outline">
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This post will not be published. The author will still be able to see it as rejected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRejectPost(post.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Reject Post
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              {pendingComments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending comments</h3>
                    <p className="text-muted-foreground text-center">
                      All comments from your linked besties have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                pendingComments.map((comment) => (
                  <Card key={comment.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <AvatarDisplay
                            profileAvatarId={comment.author.profile_avatar_id}
                            displayName={comment.author.display_name}
                            size="md"
                          />
                          <div>
                            <CardTitle className="text-lg">
                              Comment on "{comment.post.title}"
                            </CardTitle>
                            <CardDescription>
                              by {comment.author.display_name} • {new Date(comment.created_at).toLocaleString()}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge>Pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {comment.content && (
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      )}
                      
                      {comment.audio_url && (
                        <div className="bg-muted p-3 rounded-lg">
                          <audio controls src={comment.audio_url} className="w-full" />
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="gap-2 flex-1" variant="default">
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Comment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This comment will be published and visible to all community members.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApproveComment(comment.id)}>
                                Approve Comment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="gap-2 flex-1" variant="outline">
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Comment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This comment will not be published. The author will still be able to see it as rejected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRejectComment(comment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Reject Comment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="vendors">
              <VendorLinkRequests onRequestsChange={() => currentUserId && loadPendingContent(currentUserId)} />
            </TabsContent>

            <TabsContent value="messages">
              <BestieSponsorMessages onMessagesChange={() => currentUserId && loadPendingContent(currentUserId)} />
            </TabsContent>

            <TabsContent value="prayers">
              {currentUserId && (
                <PrayerApprovals 
                  currentUserId={currentUserId} 
                  onUpdate={() => loadPendingContent(currentUserId)} 
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
