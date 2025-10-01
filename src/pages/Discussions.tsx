import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Heart, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface Profile {
  id: string;
  display_name: string;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: Profile;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
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
        author:profiles!discussion_posts_author_id_fkey(id, display_name, role)
      `)
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
            author:profiles!discussion_comments_author_id_fkey(id, display_name, role)
          `)
          .eq("post_id", post.id)
          .order("created_at", { ascending: true });

        return { ...post, comments: commentsData || [] };
      })
    );

    setPosts(postsWithComments);
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

    const { error } = await supabase
      .from("discussion_posts")
      .insert({
        title: newPost.title,
        content: newPost.content,
        author_id: user?.id,
      });

    if (error) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Post created successfully!" });
    setNewPost({ title: "", content: "" });
    setShowNewPost(false);
    loadPosts();
  };

  const handleAddComment = async (postId: string) => {
    const content = newComment[postId];
    if (!content?.trim()) return;

    const { error } = await supabase
      .from("discussion_comments")
      .insert({
        post_id: postId,
        content: content,
        author_id: user?.id,
      });

    if (error) {
      toast({
        title: "Error adding comment",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Comment added!" });
    setNewComment({ ...newComment, [postId]: "" });
    loadPosts();
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
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate("/community")}
                className="mb-4 gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Community
              </Button>
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
                <div className="flex gap-2">
                  <Button onClick={handleCreatePost}>Post</Button>
                  <Button variant="outline" onClick={() => setShowNewPost(false)}>
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{post.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground">
                            by {post.author?.display_name || "Unknown"}
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
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

                    {/* Comments Section */}
                    <div className="border-t pt-6 space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comments ({post.comments?.length || 0})
                      </h4>

                      {/* Comments List */}
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{comment.author?.display_name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.author?.role || "")}`}>
                              {comment.author?.role}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}

                      {/* Add Comment */}
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
                          onClick={() => handleAddComment(post.id)}
                          disabled={!newComment[post.id]?.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
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
    </div>
  );
};

export default Discussions;