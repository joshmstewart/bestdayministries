import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, User } from "lucide-react";
import { Link } from "react-router-dom";

interface Discussion {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: {
    display_name: string;
    role: string;
  };
}

export default function RecentDiscussions() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiscussions();
  }, []);

  const loadDiscussions = async () => {
    const { data, error } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles!discussion_posts_author_id_fkey(display_name, role)
      `)
      .eq("is_moderated", true)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error loading discussions:", error);
    } else {
      setDiscussions(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-muted/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (discussions.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-muted/20 to-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-1/3 w-64 h-64 bg-accent/30 rounded-full blur-3xl animate-float" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-sm rounded-full border border-accent/20 mb-4">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-accent">Community Discussions</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-foreground">
            Recent{" "}
            <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
              Conversations
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See what our community is talking about
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {discussions.map((discussion) => (
            <Link key={discussion.id} to="/discussions">
              <Card className="group hover:shadow-warm transition-all duration-300 hover:-translate-y-1 border-2 hover:border-accent/50 overflow-hidden h-full">
                {discussion.image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={discussion.image_url}
                      alt={discussion.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{discussion.author.display_name}</span>
                  </div>
                  <h3 className="font-bold text-lg line-clamp-2 group-hover:text-accent transition-colors">
                    {discussion.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {discussion.content}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/discussions"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent to-secondary text-white rounded-full font-semibold hover:shadow-glow transition-all hover:scale-105"
          >
            <MessageSquare className="w-5 h-5" />
            View All Discussions
          </Link>
        </div>
      </div>
    </section>
  );
}
