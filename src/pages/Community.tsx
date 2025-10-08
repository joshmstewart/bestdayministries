import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, Users, MessageSquare, Gift, Sparkles, ArrowRight } from "lucide-react";
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

const Community = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

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
  const [sectionOrder, setSectionOrder] = useState<Array<{key: string, visible: boolean}>>([]);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const [effectiveRole, setEffectiveRole] = useState<UserRole | null>(null);

  // Update effective role whenever profile or impersonation changes
  useEffect(() => {
    if (profile) {
      const role = getEffectiveRole(profile.role);
      console.log('Community - Setting effectiveRole:', role);
      setEffectiveRole(role);
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

  // Reload content when impersonation changes or when user/profile/effectiveRole are set
  useEffect(() => {
    console.log('Community - Content loading useEffect triggered', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      effectiveRole 
    });
    if (user && profile && effectiveRole !== null) {
      console.log('Community - Calling loadLatestContent');
      loadLatestContent();
    }
  }, [user, profile, effectiveRole]); // Include all dependencies

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Load community page for all authenticated users
    setUser(session.user);
    await fetchProfile(session.user.id);
    await loadSectionOrder();
    // Don't call loadLatestContent here - let the effectiveRole useEffect handle it
    setLoading(false);
  };

  const loadSectionOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("community_sections")
        .select("section_key, is_visible")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      if (data) {
        setSectionOrder(data.map(s => ({ key: s.section_key, visible: s.is_visible })));
      }
    } catch (error) {
      console.error("Error loading section order:", error);
      // Use default order if database fetch fails
      setSectionOrder([
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

  const markSectionLoaded = (sectionKey: string) => {
    console.log('Community - Marking section as loaded:', sectionKey);
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
      console.log('Community - loadLatestContent returning early, no effectiveRole');
      return;
    }
    
    console.log('Community - loadLatestContent running with role:', effectiveRole);
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
        console.log('Community - User role:', effectiveRole);
        console.log('Community - Total events fetched:', events.length);
        
        // Filter events based on effective user role
        const filteredEvents = events.filter(event => {
          const isVisible = event.visible_to_roles?.includes(effectiveRole);
          console.log(`Community - Event "${event.title}" - Visible to roles:`, event.visible_to_roles, 'User role:', effectiveRole, 'Is visible:', isVisible);
          return isVisible;
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
        
        console.log('Community - Upcoming events count:', topThree.length);
        setUpcomingEvents(topThree);
      }

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
    } catch (error) {
      console.error('Error loading content:', error);
      // Set default quick links on error
      setQuickLinks(defaultQuickLinks);
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles_public")
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

  const defaultQuickLinks = [
    { label: "Sponsor a Bestie", href: "/sponsor-bestie", icon: "Gift", color: "from-primary/20 to-secondary/5" },
    { label: "About Best Day Ministries", href: "/about", icon: "Users", color: "from-secondary/20 to-accent/5" },
    { label: "Joy Rocks Coffee", href: "/joy-rocks", icon: "Sparkles", color: "from-accent/20 to-primary/5" },
    { label: "Support Us", href: "/support", icon: "Gift", color: "from-secondary/20 to-primary/5" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <UnifiedHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {sectionOrder.map(({ key, visible }) => {
            if (!visible) return null;

            switch (key) {
              case 'welcome':
                return (
                  <div key={key} className="text-center space-y-4" data-tour-target="welcome-section">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground">
                      Welcome to Your{" "}
                      <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                        Best Day Ministries
                      </span>{" "}
                      Community
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Connect, share, and grow with our amazing community
                    </p>
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
                      
                      console.log('Event TTS text:', ttsText);
                      
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
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Community;
