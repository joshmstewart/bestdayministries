import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, Users, MessageSquare, Gift, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeaturedBestieDisplay } from "@/components/FeaturedBestieDisplay";
import LatestAlbum from "@/components/LatestAlbum";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [latestDiscussion, setLatestDiscussion] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const [effectiveRole, setEffectiveRole] = useState<UserRole | null>(null);

  // Update effective role whenever profile or impersonation changes
  useEffect(() => {
    if (profile) {
      setEffectiveRole(getEffectiveRole(profile.role));
    }
  }, [profile, isImpersonating, getEffectiveRole]);

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

  // Reload content when impersonation changes
  useEffect(() => {
    if (user && profile && effectiveRole !== null) {
      loadLatestContent();
    }
  }, [effectiveRole]); // Changed from isImpersonating to effectiveRole

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await fetchProfile(session.user.id);
    await loadLatestContent();
    setLoading(false);
  };

  const loadLatestContent = async () => {
    // Don't load if we don't have an effective role yet
    if (!effectiveRole) return;
    
    // Fetch latest discussion
    const { data: discussions } = await supabase
      .from("discussion_posts")
      .select(`
        *,
        author:profiles!discussion_posts_author_id_fkey(id, display_name, role)
      `)
      .eq("is_moderated", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (discussions) {
      setLatestDiscussion(discussions);
    }

    // Fetch upcoming events (up to 3) with role-based filtering
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .gte("event_date", new Date().toISOString());

    if (events) {
      console.log('Community - User role:', effectiveRole);
      console.log('Community - Total events fetched:', events.length);
      
      // Filter events based on effective user role
      const filteredEvents = events.filter(event => {
        const isVisible = event.visible_to_roles?.includes(effectiveRole);
        console.log(`Community - Event "${event.title}" - Visible to roles:`, event.visible_to_roles, 'User role:', effectiveRole, 'Is visible:', isVisible);
        return isVisible;
      }).slice(0, 3); // Take only first 3 after filtering
      
      console.log('Community - Filtered events count:', filteredEvents.length);
      setUpcomingEvents(filteredEvents);
    }
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading your community...</p>
        </div>
      </div>
    );
  }

  const quickLinks = [
    { icon: Gift, label: "Sponsor a Bestie", href: "/sponsor", color: "from-primary/20 to-secondary/5" },
    { icon: Users, label: "About Best Day Ever Ministries", href: "/about", color: "from-secondary/20 to-accent/5" },
    { icon: Sparkles, label: "Joy Rocks Coffee", href: "/joy-rocks", color: "from-accent/20 to-primary/5" },
    { icon: Gift, label: "Support Us", href: "/donate", color: "from-secondary/20 to-primary/5" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative">
        {/* Role Badge - Top Right */}
        {profile && effectiveRole && (
          <div className="absolute top-2 right-4 z-40">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-card border border-primary/20 rounded-full">
              {effectiveRole === "bestie" && <Heart className="w-3.5 h-3.5 text-primary fill-primary" />}
              {effectiveRole === "caregiver" && <Users className="w-3.5 h-3.5 text-secondary" />}
              {effectiveRole === "supporter" && <Sparkles className="w-3.5 h-3.5 text-accent" />}
              {effectiveRole === "admin" && <Users className="w-3.5 h-3.5 text-accent" />}
              {effectiveRole === "owner" && <Users className="w-3.5 h-3.5 text-accent" />}
              <span className="text-sm font-semibold text-foreground capitalize">{effectiveRole}</span>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              Welcome to Your{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Best Day Ever Ministries
              </span>{" "}
              Community
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect, share, and grow with our amazing community
            </p>
          </div>

          {/* Featured Bestie */}
          <FeaturedBestieDisplay />

          {/* Latest Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Discussion */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <CardTitle className="text-xl">Latest Discussion</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/discussions")}
                    className="gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {latestDiscussion ? (
                  <div 
                    className="space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                    onClick={() => navigate("/discussions")}
                  >
                    {latestDiscussion.image_url && (
                      <img
                        src={latestDiscussion.image_url}
                        alt={latestDiscussion.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{latestDiscussion.title}</h3>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <TextToSpeech text={`${latestDiscussion.title}. ${latestDiscussion.content}`} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{latestDiscussion.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>by {latestDiscussion.author?.display_name}</span>
                      <span>•</span>
                      <span>{new Date(latestDiscussion.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No discussions yet. Be the first!</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-secondary" />
                    <CardTitle className="text-xl">Upcoming Events</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/events")}
                    className="gap-1"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div 
                        key={event.id}
                        className="space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border-b last:border-0"
                        onClick={() => navigate("/events")}
                      >
                        {event.image_url && (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        )}
                        <h3 className="font-semibold text-base">{event.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                className="hover:text-primary transition-colors hover:underline"
                                title="Open in Google Maps"
                              >
                                {event.location}
                              </button>
                            </>
                          )}
                        </div>
                        {event.audio_url && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <AudioPlayer src={event.audio_url} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No upcoming events</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Latest Album */}
          <LatestAlbum />

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => navigate(link.href)}
                className="group"
              >
                <div className={`p-6 rounded-2xl border-2 border-border hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm bg-gradient-to-br ${link.color}`}>
                  <link.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-lg text-foreground">{link.label}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Community;
