import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Heart, Calendar, Users, MessageSquare, Gift, Sparkles, Shield, ArrowRight } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useToast } from "@/hooks/use-toast";
import joyHouseLogo from "@/assets/joy-house-logo-gold.png";
import { FeaturedBestieDisplay } from "@/components/FeaturedBestieDisplay";
import LatestAlbum from "@/components/LatestAlbum";
import AudioPlayer from "@/components/AudioPlayer";

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [latestDiscussion, setLatestDiscussion] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState(joyHouseLogo);

  useEffect(() => {
    checkUser();
    loadLogo();

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

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "logo_url")
        .single();

      if (error) throw error;

      if (data?.setting_value) {
        try {
          const url = typeof data.setting_value === 'string' 
            ? JSON.parse(data.setting_value) 
            : data.setting_value;
          
          if (url && !url.includes('object/public/app-assets/logo.png')) {
            setLogoUrl(url);
          }
        } catch (e) {
          if (typeof data.setting_value === 'string' && data.setting_value.startsWith('http')) {
            setLogoUrl(data.setting_value);
          }
        }
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

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

    // Fetch upcoming events (up to 3)
    const { data: events } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true })
      .gte("event_date", new Date().toISOString())
      .limit(3);

    if (events) {
      setUpcomingEvents(events);
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
    setIsAdmin(data?.role === "admin" || data?.role === "owner");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you soon!",
    });
    navigate("/");
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
    { icon: Users, label: "About Joy House", href: "/about", color: "from-secondary/20 to-accent/5" },
    { icon: Sparkles, label: "Joy Rocks Coffee", href: "/joy-rocks", color: "from-accent/20 to-primary/5" },
    { icon: Gift, label: "Support Us", href: "/donate", color: "from-secondary/20 to-primary/5" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoUrl} 
                alt="Joy House" 
                className="h-10"
                onError={(e) => {
                  e.currentTarget.src = joyHouseLogo;
                }}
              />
              <div className="hidden sm:block">
                <div className="text-xs text-muted-foreground">Welcome back,</div>
                <div className="font-bold text-foreground">{profile?.display_name}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/profile")}
                className="gap-2"
              >
                <AvatarDisplay 
                  avatarNumber={profile?.avatar_number} 
                  displayName={profile?.display_name}
                  size="sm"
                />
                <span className="hidden sm:inline">Profile</span>
              </Button>
              {isAdmin && (
                <Button 
                  variant="default" 
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              Welcome to Your{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Joy House
              </span>{" "}
              Community
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect, share, and grow with our amazing community
            </p>
          </div>

          {/* Role Badge */}
          <div className="flex justify-center -mt-6">
            <div className="inline-flex items-center gap-1.5 px-4 py-0.5 bg-gradient-card border border-primary/20 rounded-full">
              {profile?.role === "bestie" && <Heart className="w-3.5 h-3.5 text-primary fill-primary" />}
              {profile?.role === "caregiver" && <Users className="w-3.5 h-3.5 text-secondary" />}
              {profile?.role === "supporter" && <Sparkles className="w-3.5 h-3.5 text-accent" />}
              <span className="text-sm font-semibold text-foreground capitalize">{profile?.role}</span>
            </div>
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
                    <h3 className="font-semibold text-lg">{latestDiscussion.title}</h3>
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
                              <span>{event.location}</span>
                            </>
                          )}
                        </div>
                        {event.audio_url && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <AudioPlayer src={event.audio_url} variant="compact" />
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
