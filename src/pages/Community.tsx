import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Calendar, Users, MessageSquare, Gift, Sparkles, ArrowRight, Rss, LayoutGrid } from "lucide-react";
import * as Icons from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeaturedBestieDisplay } from "@/components/FeaturedBestieDisplay";
import { SponsorBestieDisplay } from "@/components/SponsorBestieDisplay";
import LatestAlbum from "@/components/LatestAlbum";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";
import OurFamily from "@/components/OurFamily";
import { FeaturedItem } from "@/components/FeaturedItem";
import { DailyScratchCard } from "@/components/DailyScratchCard";
import { DailyBar } from "@/components/daily-features/DailyBar";
import { StreakMeter } from "@/components/daily-features/StreakMeter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isProblematicIOSVersion } from "@/lib/browserDetection";
import { useAuth } from "@/contexts/AuthContext";
import { CommunityFeed } from "@/components/feed/CommunityFeed";
import { Badge } from "@/components/ui/badge";
import { useUnseenFeedCount } from "@/hooks/useUnseenFeedCount";
import { AppsGrid } from "@/components/community/AppsGrid";
import { useTabClickTracking } from "@/hooks/useTabClickTracking";
import { useDailyEngagementSettings } from "@/hooks/useDailyEngagementSettings";

const Community = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, profile: authProfile, role, loading: authLoading, isAuthenticated } = useAuth();
  const { unseenCount, showBadge } = useUnseenFeedCount();
  const { trackTabClick } = useTabClickTracking();
  const { canSeeFeature } = useDailyEngagementSettings();
  
  // Tab state from URL params
  const activeTab = searchParams.get("tab") || "community";
  
  // Handle tab change with tracking
  const handleTabChange = (value: string) => {
    trackTabClick(`community_${value}_tab`, "/community");
    setSearchParams({ tab: value });
  };

  // Extract YouTube video ID from various URL formats
  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regexes = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const regex of regexes) {
      const match = url.match(regex);
      if (match) return match[1];
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string): string | null => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };
  const [loading, setLoading] = useState(true);
  const [latestDiscussions, setLatestDiscussions] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  const [quickLinksLoaded, setQuickLinksLoaded] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<Array<{key: string, visible: boolean}>>([]);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const [feedVisibleToRoles, setFeedVisibleToRoles] = useState<string[] | null>(null);
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const [effectiveRole, setEffectiveRole] = useState<UserRole | null>(null);

  // Create profile object compatible with existing code (combines AuthContext data)
  const profile = authProfile ? { ...authProfile, role } : null;

  // Default quick links - moved to top to avoid TDZ error
  const defaultQuickLinks = [
    { label: "Sponsor a Bestie", href: "/sponsor-bestie", icon: "Gift", color: "from-primary/20 to-secondary/5" },
    { label: "About Best Day Ministries", href: "/about", icon: "Users", color: "from-secondary/20 to-accent/5" },
    { label: "Joy Rocks Coffee", href: "/joy-rocks", icon: "Sparkles", color: "from-accent/20 to-primary/5" },
    { label: "Support Us", href: "/support", icon: "Gift", color: "from-secondary/20 to-primary/5" },
  ];

  // Update effective role whenever profile or impersonation changes
  useEffect(() => {
    if (profile && profile.role) {
      const impersonatableRole = profile.role as UserRole;
      const effectiveRoleResult = getEffectiveRole(impersonatableRole);
      setEffectiveRole(effectiveRoleResult);
    }
  }, [profile, isImpersonating, getEffectiveRole]);

  // Scroll to top on page load to ensure tabs are visible
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if not authenticated (after auth loading completes)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load section order when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSectionOrder();
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Track if content has been loaded to prevent duplicate fetches
  const [contentLoaded, setContentLoaded] = useState(false);

  useEffect(() => {
    if (user && profile && effectiveRole !== null && !contentLoaded) {
      loadLatestContent();
      setContentLoaded(true);
    }
  }, [user, profile, effectiveRole, contentLoaded]); // Include all dependencies
  
  // Reset content loaded flag when impersonation changes
  useEffect(() => {
    if (isImpersonating !== undefined) {
      setContentLoaded(false);
    }
  }, [isImpersonating]);

  const loadSectionOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("community_sections")
        .select("section_key, is_visible, visible_to_roles")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      if (data) {
        setSectionOrder(data.map(s => ({ key: s.section_key, visible: s.is_visible })));
        
        // Extract feed visibility roles
        const newsfeedSection = data.find(s => s.section_key === 'newsfeed');
        if (newsfeedSection) {
          setFeedVisibleToRoles(newsfeedSection.visible_to_roles as string[] | null);
        }
      }
    } catch (error) {
      console.error("Error loading section order:", error);
      // Use default order if database fetch fails
      setSectionOrder([
        { key: 'newsfeed', visible: true },
        { key: 'welcome', visible: true },
        { key: 'featured_item', visible: true },
        { key: 'featured_bestie', visible: true },
        { key: 'sponsor_bestie', visible: true },
        { key: 'latest_discussion', visible: true },
        { key: 'upcoming_events', visible: true },
        { key: 'latest_album', visible: true },
        { key: 'our_family', visible: true },
        { key: 'quick_links', visible: true },
      ]);
    }
  };
  
  // Check if current user's role can access the Feed tab
  const canAccessFeed = (): boolean => {
    // If no role restrictions set, everyone can access
    if (!feedVisibleToRoles || feedVisibleToRoles.length === 0) return true;
    // Check if user's effective role is in the allowed list
    if (!effectiveRole) return false;
    return feedVisibleToRoles.includes(effectiveRole);
  };

  const markSectionLoaded = (sectionKey: string) => {
    setLoadedSections(prev => new Set([...prev, sectionKey]));
  };

  const canLoadSection = (sectionKey: string): boolean => {
    // These sections load independently with no dependencies
    const independentSections = ['featured_bestie', 'sponsor_bestie', 'featured_item', 'latest_album'];
    if (independentSections.includes(sectionKey)) {
      return true;
    }
    
    const sectionIndex = sectionOrder.findIndex(s => s.key === sectionKey);
    if (sectionIndex === 0) return true; // First section can always load
    
    // Find the previous visible section
    let prevIndex = sectionIndex - 1;
    while (prevIndex >= 0 && !sectionOrder[prevIndex].visible) {
      prevIndex--;
    }
    
    // If no previous visible section, this can load
    if (prevIndex < 0) return true;
    
    const previousSection = sectionOrder[prevIndex];
    return loadedSections.has(previousSection.key);
  };

  // Mark synchronous sections as loaded on mount
  useEffect(() => {
    const syncSections = ['welcome', 'latest_discussion', 'upcoming_events', 'our_family', 'quick_links'];
    syncSections.forEach(key => {
      if (sectionOrder.find(s => s.key === key)) {
        markSectionLoaded(key);
      }
    });
  }, [sectionOrder]);

  const loadLatestContent = async () => {
    // Don't load if we don't have an effective role yet
    if (!effectiveRole) {
      return;
    }
    try {
      // Fetch latest discussions (up to 3)
      const { data: discussions } = await supabase
        .from("discussion_posts")
        .select(`
          *,
          author:profiles_public!discussion_posts_author_id_fkey(id, display_name, role),
          video:videos(thumbnail_url)
        `)
        .eq("is_moderated", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (discussions) {
        setLatestDiscussions(discussions);
      }

      // Fetch upcoming events with role-based filtering
      const { data: events } = await supabase
        .from("events")
        .select(`
          *,
          event_dates(id, event_date)
        `)
        .eq("is_public", true)
        .eq("is_active", true)
        .order("event_date", { ascending: true });

      if (events) {
        // Filter events based on effective user role
        const filteredEvents = events.filter(event => {
          return event.visible_to_roles?.includes(effectiveRole);
        });

        // Collect all upcoming dates from filtered events
        const upcomingEventCards: any[] = [];
        const now = new Date();

        filteredEvents.forEach(event => {
          // Collect all dates for this event
          const allDates = [new Date(event.event_date)];
          if (event.event_dates) {
            allDates.push(...event.event_dates.map((d: any) => new Date(d.event_date)));
          }
          
          // Sort dates
          allDates.sort((a, b) => a.getTime() - b.getTime());
          
          // Add upcoming dates to the list
          allDates.forEach(date => {
            const isUpcoming = date >= now;
            const shouldShow = event.expires_after_date ? isUpcoming : true;
            
            if (shouldShow && isUpcoming) {
              upcomingEventCards.push({
                ...event,
                event_date: date.toISOString(),
                displayDate: date
              });
            }
          });
        });

        // Sort by date and take first 3
        upcomingEventCards.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
        const topThree = upcomingEventCards.slice(0, 3);
        
        setUpcomingEvents(topThree);
      }

      // Only fetch quick links once to prevent flickering
      if (!quickLinksLoaded) {
        // Fetch quick links from database
        const { data: linksData, error: linksError } = await supabase
          .from('community_quick_links')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (linksError) throw linksError;
        
        // Use database links if available, otherwise fallback to default
        if (linksData && linksData.length > 0) {
          setQuickLinks(linksData);
        } else {
          setQuickLinks(defaultQuickLinks);
        }
        setQuickLinksLoaded(true);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      // Set default quick links on error
      if (!quickLinksLoaded) {
        setQuickLinks(defaultQuickLinks);
        setQuickLinksLoaded(true);
      }
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <UnifiedHeader />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
              <p className="text-muted-foreground">Loading your community...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-16 pb-12 relative">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Community Tabs + Streak Meter */}
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <div className="flex flex-col gap-3 mb-2">
              {/* StreakMeter - shows above tabs on mobile, right-aligned */}
              {user && canSeeFeature('login_streak_button') && (
                <div className="md:hidden flex justify-end">
                  <StreakMeter />
                </div>
              )}
              
              {/* Tabs and Streak Meter row - responsive layout */}
              <div className="flex items-center justify-center gap-3">
                <TabsList className={`grid gap-1 bg-muted/50 p-1.5 rounded-lg overflow-visible ${canAccessFeed() ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger 
                    value="community" 
                    className="gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                  >
                    <Users className="w-4 h-4" />
                    <span>Home</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="apps" 
                    className="gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span>Apps</span>
                  </TabsTrigger>
                  {canAccessFeed() && (
                    <TabsTrigger 
                      value="feed" 
                      className="gap-2 relative px-4 py-2.5 text-sm font-medium rounded-md transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:hover:bg-muted overflow-visible"
                    >
                      <Rss className="w-4 h-4" />
                      <span>Feed</span>
                      {showBadge && unseenCount > 0 && activeTab !== 'feed' && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs rounded-full"
                        >
                          {unseenCount > 99 ? '99+' : unseenCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
                
                {/* StreakMeter - shows beside tabs on desktop only */}
                {user && canSeeFeature('login_streak_button') && (
                  <div className="hidden md:block">
                    <StreakMeter />
                  </div>
                )}
              </div>
            </div>

            {/* What's New Feed Tab - only render if user has access */}
            {canAccessFeed() && (
              <TabsContent value="feed" className="mt-6">
                <CommunityFeed />
              </TabsContent>
            )}

            {/* Apps Tab */}
            <TabsContent value="apps" className="mt-6">
              <AppsGrid />
            </TabsContent>

            {/* Community Tab - existing content */}
            <TabsContent value="community" className="mt-6 space-y-6">
              {/* Daily Bar - show at top for authenticated users if enabled */}
              {user && canSeeFeature('daily_bar') && <DailyBar />}
              
          {sectionOrder.map(({ key, visible }) => {
            if (!visible || key === 'newsfeed') return null;

            switch (key) {

              case 'welcome':
                return (
                  <div key={key} className="relative" data-tour-target="welcome-section">
                    <div className="text-center space-y-2">
                      <h1 className="text-4xl md:text-5xl font-black text-foreground">
                        Welcome to Your{" "}
                        <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                          Best Day Ministries
                        </span>{" "}
                        Community
                      </h1>
                      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Connect, share, and grow with our amazing community
                      </p>
                      
                      {/* Home of section */}
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <span className="text-sm text-muted-foreground">Home of...</span>
                        <Button
                          variant="outline"
                          className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                          onClick={() => navigate("/coffee-shop")}
                        >
                          <Icons.Coffee className="w-5 h-5 text-primary" />
                          <span className="font-medium">Best Day Ever Coffee & Crepes</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2 border-accent/30 hover:border-accent hover:bg-accent/5"
                          onClick={() => navigate("/joyhousestore")}
                        >
                          <Icons.Home className="w-5 h-5 text-accent" />
                          <span className="font-medium">Joy House</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );

              case 'featured_item':
                return (
                  <div key={key} data-tour-target="featured-item">
                    <FeaturedItem 
                      canLoad={canLoadSection('featured_item')}
                      onLoadComplete={() => markSectionLoaded('featured_item')}
                    />
                  </div>
                );

              case 'featured_bestie':
                return (
                  <div key={key} data-tour-target="featured-bestie">
                    <FeaturedBestieDisplay 
                      canLoad={canLoadSection('featured_bestie')}
                      onLoadComplete={() => markSectionLoaded('featured_bestie')}
                    />
                  </div>
                );

              case 'sponsor_bestie':
                return (
                  <div key={key} data-tour-target="sponsor-bestie">
                    <SponsorBestieDisplay 
                      canLoad={canLoadSection('sponsor_bestie')}
                      onLoadComplete={() => markSectionLoaded('sponsor_bestie')}
                    />
                  </div>
                );

              case 'latest_discussion':
              case 'upcoming_events':
                // Render these together in a grid
                if (key === 'latest_discussion') {
                  const showDiscussion = sectionOrder.find(s => s.key === 'latest_discussion')?.visible;
                  const showEvents = sectionOrder.find(s => s.key === 'upcoming_events')?.visible;
                  
                  return (
                    <div key="latest_activity" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {showDiscussion && (
                        <Card className="border-2 hover:border-primary/50 transition-colors" data-tour-target="latest-discussion">
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
                {latestDiscussions.length > 0 ? (
                  <div className="space-y-4">
                    {latestDiscussions.map((discussion) => (
                      <div 
                        key={discussion.id}
                        className="space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border-b last:border-0"
                        onClick={() => navigate("/discussions")}
                      >
                        {(discussion.image_url || discussion.video?.thumbnail_url || (discussion.youtube_url && getYouTubeThumbnail(discussion.youtube_url))) && (
                          <img
                            src={
                              discussion.image_url || 
                              discussion.video?.thumbnail_url || 
                              (discussion.youtube_url ? getYouTubeThumbnail(discussion.youtube_url) : '') || 
                              ''
                            }
                            alt={discussion.title}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{discussion.title}</h3>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <TextToSpeech text={`${discussion.title}. ${discussion.content}`} />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{discussion.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>by {discussion.author?.display_name}</span>
                          <span>•</span>
                          <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No discussions yet. Be the first!</p>
                )}
                          </CardContent>
                        </Card>
                      )}

                      {showEvents && (
                        <Card className="border-2 hover:border-primary/50 transition-colors" data-tour-target="upcoming-events">
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
                    {(() => {
                      // Filter events based on cumulative height
                      const MAX_HEIGHT = 1200; // pixels
                      const CARD_PADDING = 24; // p-3 = 12px top + 12px bottom
                      const SPACING = 16; // space-y-4 = 16px
                      const TEXT_HEIGHT = 120; // Approximate height for title, description, date, location
                      
                      let cumulativeHeight = 0;
                      const eventsToShow = [];
                      
                      for (const event of upcomingEvents) {
                        // Calculate image height based on aspect ratio
                        const ratio = event.aspect_ratio || '9:16';
                        const [w, h] = ratio.split(':').map(Number);
                        const cardWidth = 400; // Approximate card width
                        const imageHeight = (cardWidth * h) / w;
                        
                        const eventHeight = imageHeight + TEXT_HEIGHT + CARD_PADDING + (eventsToShow.length > 0 ? SPACING : 0);
                        
                        if (cumulativeHeight + eventHeight > MAX_HEIGHT && eventsToShow.length > 0) {
                          break; // Don't add this event, would exceed height
                        }
                        
                        eventsToShow.push(event);
                        cumulativeHeight += eventHeight;
                      }
                      
                      return eventsToShow.map((event) => {
                      // Prepare clean text string for TTS
                      const eventDate = new Date(event.event_date).toLocaleDateString();
                      const ttsText = [
                        event.title,
                        event.description,
                        `Scheduled for ${eventDate}`,
                        event.location ? `At ${event.location}` : ''
                      ].filter(Boolean).join('. ');
                      
                      return (
                        <div 
                          key={event.id}
                          className="space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors border-b last:border-0"
                          onClick={() => navigate("/events")}
                        >
                          {event.image_url && (
                            <div 
                              className="w-full overflow-hidden rounded-lg"
                              style={{
                                aspectRatio: (() => {
                                  const ratio = event.aspect_ratio || '9:16';
                                  const [w, h] = ratio.split(':').map(Number);
                                  return `${w} / ${h}`;
                                })()
                              }}
                            >
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <h3 className="font-semibold text-base flex-1">{event.title}</h3>
                            <div onClick={(e) => e.stopPropagation()}>
                              <TextToSpeech text={ttsText} />
                            </div>
                          </div>
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
                      );
                      });
                    })()}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No upcoming events</p>
                )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                }
                return null; // Skip upcoming_events as it's rendered with latest_discussion

              case 'latest_album':
                return (
                  <div key={key} data-tour-target="latest-album">
                    <LatestAlbum 
                      canLoad={canLoadSection('latest_album')}
                      onLoadComplete={() => markSectionLoaded('latest_album')}
                    />
                  </div>
                );

              case 'our_family':
                return (
                  <div key={key} data-tour-target="our-family">
                    <OurFamily />
                  </div>
                );

              case 'quick_links':
                return (
                  <div key={key} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-tour-target="quick-links">
            {quickLinks.map((link, index) => {
              const iconName = typeof link.icon === 'string' ? link.icon : 'Link';
              const IconComponent = (Icons as any)[iconName] || Icons.Link;
              
              // Check if href is external or internal
              const isExternal = link.href.startsWith('http://') || link.href.startsWith('https://');
              
              const handleClick = () => {
                if (isExternal) {
                  window.open(link.href, '_blank', 'noopener,noreferrer');
                } else {
                  navigate(link.href);
                }
              };
              
              return (
                <button
                  key={link.id || index}
                  onClick={handleClick}
                  className="group h-full"
                >
                  <div className={`h-full min-h-[140px] p-6 rounded-2xl border-2 border-border hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm bg-gradient-to-br ${link.color} flex flex-col items-center justify-center`}>
                    <IconComponent className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <h3 className="font-bold text-lg text-foreground text-center leading-tight">{link.label}</h3>
                  </div>
                </button>
              );
                    })}
                  </div>
                );

              default:
                return null;
            }
          })}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Daily Scratch Widget - right side, upper portion - Home tab only */}
        {user && activeTab === 'community' && canSeeFeature('daily_scratch_widget') && (
          <div
            className={`absolute right-1 sm:right-2 lg:right-4 top-32 z-40 ${
              !isProblematicIOSVersion()
                ? '[transform:rotate(-8deg)] [will-change:transform] [backface-visibility:hidden]'
                : ''
            }`}
          >
            <ErrorBoundary fallback={null}>
              <DailyScratchCard />
            </ErrorBoundary>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Community;
