import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";

interface Profile {
  id: string;
  display_name: string;
  role: string;
}

interface FlaggedPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  moderation_notes: string | null;
  image_url?: string | null;
  author?: Profile;
}

interface FlaggedComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  post_id: string;
  is_moderated: boolean;
  moderation_notes: string | null;
  author?: Profile;
  post?: { title: string };
}

const ModerationQueue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<FlaggedComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    // Check for admin-level access (owner role automatically has admin access)
    if (!profile || !['admin', 'owner', 'moderator'].includes(profile.role)) {
      toast({
        title: "Access denied",
        description: "You don't have permission to view this page",
        variant: "destructive",
      });
      navigate("/community");
      return;
    }

    setUser(session.user);
    await loadFlaggedContent();
    setLoading(false);
  };

  const loadFlaggedContent = async () => {
    const { data: posts } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles!discussion_posts_author_id_fkey(id, display_name, role)
      `)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false });

    const { data: comments } = await supabase
      .from("discussion_comments")
      .select(`
        *,
        author:profiles!discussion_comments_author_id_fkey(id, display_name, role),
        post:discussion_posts!discussion_comments_post_id_fkey(title)
      `)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false });

    setFlaggedPosts(posts || []);
    setFlaggedComments(comments || []);
  };

  const handleApprovePost = async (postId: string) => {
    const { error } = await supabase
      .from("discussion_posts")
      .update({ is_moderated: true, moderation_notes: "Approved by moderator" })
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error approving post",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Post approved" });
    loadFlaggedContent();
  };

  const handleRejectPost = async (postId: string) => {
    const { error } = await supabase
      .from("discussion_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast({
        title: "Error rejecting post",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Post rejected and deleted" });
    loadFlaggedContent();
  };

  const handleApproveComment = async (commentId: string) => {
    const { error } = await supabase
      .from("discussion_comments")
      .update({ is_moderated: true })
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error approving comment",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Comment approved" });
    loadFlaggedContent();
  };

  const handleRejectComment = async (commentId: string) => {
    const { error } = await supabase
      .from("discussion_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error rejecting comment",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Comment rejected and deleted" });
    loadFlaggedContent();
  };

  const getSeverityColor = (notes: string | null) => {
    if (!notes) return "bg-gray-500";
    if (notes.includes("high")) return "bg-red-500";
    if (notes.includes("medium")) return "bg-orange-500";
    return "bg-yellow-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading moderation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
              <Shield className="w-10 h-10" />
              Content <span className="bg-gradient-text bg-clip-text text-transparent">Moderation</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Review flagged content and maintain community standards
            </p>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="posts">
                Posts ({flaggedPosts.length})
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comments ({flaggedComments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4 mt-6">
              {flaggedPosts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">All clear!</h3>
                    <p className="text-muted-foreground">No posts awaiting moderation</p>
                  </CardContent>
                </Card>
              ) : (
                flaggedPosts.map((post) => (
                  <Card key={post.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            {post.title}
                          </CardTitle>
                          <CardDescription>
                            By {post.author?.display_name} • {new Date(post.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        {post.moderation_notes && (
                          <Badge className={getSeverityColor(post.moderation_notes)}>
                            {post.moderation_notes.includes("high") ? "High Severity" :
                             post.moderation_notes.includes("medium") ? "Medium Severity" :
                             "Low Severity"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                      
                      {/* Display Image if present */}
                      {post.image_url && (
                        <div className="rounded-lg overflow-hidden border-2 border-orange-300">
                          <img 
                            src={post.image_url} 
                            alt="Post image" 
                            className="w-full max-h-96 object-cover"
                          />
                        </div>
                      )}
                      
                      {post.moderation_notes && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Flagging Reason:</p>
                          <p className="text-sm text-muted-foreground">{post.moderation_notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprovePost(post.id)}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleRejectPost(post.id)}
                          className="gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject & Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-6">
              {flaggedComments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <h3 className="text-lg font-semibold mb-2">All clear!</h3>
                    <p className="text-muted-foreground">No comments awaiting moderation</p>
                  </CardContent>
                </Card>
              ) : (
                flaggedComments.map((comment) => (
                  <Card key={comment.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Comment on: {comment.post?.title}
                          </CardTitle>
                          <CardDescription>
                            By {comment.author?.display_name} • {new Date(comment.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        {comment.moderation_notes && (
                          <Badge className={getSeverityColor(comment.moderation_notes)}>
                            {comment.moderation_notes.includes("high") ? "High Severity" :
                             comment.moderation_notes.includes("medium") ? "Medium Severity" :
                             "Low Severity"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-foreground">{comment.content}</p>
                      {comment.moderation_notes && (
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Flagging Reason:</p>
                          <p className="text-sm text-muted-foreground">{comment.moderation_notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveComment(comment.id)}
                          className="gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleRejectComment(comment.id)}
                          className="gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject & Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ModerationQueue;