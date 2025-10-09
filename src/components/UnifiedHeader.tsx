import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HeaderSkeleton } from "@/components/HeaderSkeleton";
import { LogOut, Shield, Users, CheckCircle, ArrowLeft, UserCircle2, Mail, ChevronDown, Menu, Settings, HelpCircle } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { NotificationBell } from "@/components/NotificationBell";
import { useToast } from "@/hooks/use-toast";
import { useModerationCount } from "@/hooks/useModerationCount";
import { useGuardianApprovalsCount } from "@/hooks/useGuardianApprovalsCount";
import { usePendingVendorsCount } from "@/hooks/usePendingVendorsCount";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { useSponsorUnreadCount } from "@/hooks/useSponsorUnreadCount";
import { useMessageModerationCount } from "@/hooks/useMessageModerationCount";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useContactFormCount } from "@/hooks/useContactFormCount";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];

export const UnifiedHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const [hasSharedSponsorships, setHasSharedSponsorships] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<Array<{ id: string; label: string; href: string; display_order: number; visible_to_roles?: UserRole[] }>>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { count: moderationCount } = useModerationCount();
  const { count: approvalsCount } = useGuardianApprovalsCount();
  const { count: pendingVendorsCount } = usePendingVendorsCount();
  const { count: sponsorUnreadCount } = useSponsorUnreadCount();
  const { count: messageModerationCount } = useMessageModerationCount();
  const { count: contactFormCount } = useContactFormCount();
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const { canModerate } = useUserPermissions();

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show nav if near top (within 150px) or scrolling up
      if (currentScrollY < 150 || currentScrollY < lastScrollY) {
        setShowNav(true);
      } else {
        // Hide nav when scrolling down and past 150px
        setShowNav(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Consolidated initialization effect with retry logic
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initializeHeader = async () => {
      try {
        // Load all data in parallel for better performance
        const [logoResult, navResult, authResult] = await Promise.allSettled([
          loadLogo(),
          loadNavLinks(),
          checkUser()
        ]);

        // Check for failures and retry if needed
        const hasFailures = [logoResult, navResult, authResult].some(
          result => result.status === 'rejected'
        );

        if (hasFailures && retryCount < 3 && mounted) {
          console.warn('Header initialization had failures, retrying...', { retryCount });
          retryTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
        } else if (mounted) {
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error initializing header:', error);
        if (retryCount < 3 && mounted) {
          retryTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * Math.pow(2, retryCount));
        }
      }
    };

    initializeHeader();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        setAuthLoading(false);
      }
    });

    // Subscribe to navigation links changes
    const navSubscription = supabase
      .channel('navigation_links_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation_links' }, () => {
        if (mounted) loadNavLinks();
      })
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      subscription.unsubscribe();
      navSubscription.unsubscribe();
    };
  }, [retryCount]);

  // Update admin status when impersonation changes
  useEffect(() => {
    if (profile) {
      const effectiveRole = getEffectiveRole(profile.role);
      // Check for admin-level access (owner role automatically has admin access)
      setIsAdmin(effectiveRole === "admin" || effectiveRole === "owner");
    }
  }, [isImpersonating, profile, getEffectiveRole]);

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings_public")
        .select("setting_value")
        .eq("setting_key", "logo_url")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        let url: string = '';
        
        // Handle different possible types
        if (typeof data.setting_value === 'string') {
          // If it's a string that looks like JSON, parse it
          if (data.setting_value.startsWith('"')) {
            try {
              url = JSON.parse(data.setting_value);
            } catch (e) {
              url = data.setting_value;
            }
          } else {
            url = data.setting_value;
          }
        } else if (typeof data.setting_value === 'object' && data.setting_value !== null) {
          // If it's an object, stringify and check
          url = JSON.stringify(data.setting_value);
        }
        
        if (url) {
          setLogoUrl(url);
        }
      }
    } catch (error) {
      console.error('Error loading logo:', error);
      throw error; // Propagate error for retry logic
    }
  };

  const loadNavLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("navigation_links")
        .select("id, label, href, display_order, visible_to_roles")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setNavLinks(data || []);
    } catch (error) {
      console.error('Error loading navigation links:', error);
      throw error; // Propagate error for retry logic
    }
  };


  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
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

      // Fetch actual role from user_roles table (security requirement)
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error("Error fetching role:", roleError);
      }

      // Combine profile with actual role from user_roles
      const profile = {
        ...profileData,
        role: roleData?.role || "supporter"
      };

      setProfile(profile);
      setIsAdmin(profile.role === "admin" || profile.role === "owner");
      
      // Note: Test account checking removed as email is no longer stored in profiles
      setIsTestAccount(false);

      // Check if bestie has shared sponsorships
      if (profile.role === "bestie") {
        const { data: shares } = await supabase
          .from("sponsorship_shares")
          .select("id")
          .eq("bestie_id", userId)
          .limit(1);
        
        setHasSharedSponsorships((shares?.length ?? 0) > 0);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const handleReturnToAdmin = async () => {
    // Clear any stored backup
    localStorage.removeItem('admin_session_backup');
    
    // Log out and redirect to login
    await supabase.auth.signOut();
    
    toast({
      title: "Logged out of test account",
      description: "Please log back in with your admin account",
    });
    
    navigate("/auth");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
      description: "See you soon!",
    });
    navigate("/");
  };

  return (
    <ErrorBoundary
      fallback={
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-32 bg-muted/50 rounded-md" />
              <div className="text-sm text-muted-foreground">Failed to load header</div>
            </div>
          </div>
        </header>
      }
      onReset={() => {
        setRetryCount(0);
        setDataLoaded(false);
      }}
    >
      {!dataLoaded ? (
        <HeaderSkeleton />
      ) : (
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-0 relative">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Best Day Ever Coffee + Crepes" 
                  className="h-[85px] w-auto cursor-pointer my-1.5 mx-1 rounded-lg"
                  onClick={() => navigate(user && profile ? "/community" : "/")}
                />
              ) : (
                <div className="h-[85px] w-[140px] my-1.5 mx-1" />
              )}
            </div>
            
            <div className="flex items-center gap-2">
            {authLoading ? (
              <>
                {/* Loading skeleton for buttons */}
                <div className="h-10 w-24 bg-muted/50 rounded-md animate-pulse" />
                <div className="h-10 w-24 bg-muted/50 rounded-md animate-pulse" />
              </>
            ) : user && profile ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />
                
                {(profile?.role === "caregiver" || profile?.role === "supporter" || profile?.role === "admin" || profile?.role === "owner" || (profile?.role === "bestie" && hasSharedSponsorships)) && (
                  <Button 
                    onClick={() => navigate("/guardian-links")}
                    variant="outline"
                    className="gap-2 relative"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">My Besties</span>
                    {sponsorUnreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {sponsorUnreadCount}
                      </span>
                    )}
                  </Button>
                )}
                {profile?.role === "bestie" && (
                  <Button 
                    onClick={() => navigate("/bestie-messages")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Messages</span>
                  </Button>
                )}
                {profile?.role === "caregiver" && (
                  <Button 
                    onClick={() => navigate("/guardian-approvals")}
                    variant="outline"
                    className="gap-2 relative"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Approvals</span>
                    {approvalsCount > 0 && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {approvalsCount}
                      </span>
                    )}
                  </Button>
                )}
                {/* Show Moderation button for users with moderate permission (but not admins) */}
                {!isAdmin && canModerate && (
                  <Button 
                    onClick={() => navigate("/moderation")}
                    variant="outline"
                    className="gap-2 relative"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Moderation</span>
                    {moderationCount > 0 && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {moderationCount}
                      </span>
                    )}
                  </Button>
                )}
                {isAdmin && (
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="gap-2 bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white border-0 relative"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Admin</span>
                    {(moderationCount > 0 || pendingVendorsCount > 0 || messageModerationCount > 0 || contactFormCount > 0) && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {moderationCount + pendingVendorsCount + messageModerationCount + contactFormCount}
                      </span>
                    )}
                  </Button>
                )}
                
                {/* Profile Dropdown - Far Right */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="gap-2 hover:bg-muted"
                    >
                      <AvatarDisplay 
                        avatarNumber={profile?.avatar_number} 
                        displayName={profile?.display_name}
                        size="md"
                      />
                      <span className="hidden sm:inline font-semibold">{profile?.display_name || 'Profile'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    
                    <Separator className="my-1" />
                    
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/auth")}
                  className="font-semibold"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => navigate("/auth?signup=true")}
                  className="bg-gradient-warm border-0 font-semibold"
                >
                  Sign Up
                </Button>
              </>
            )}
            </div>
          </div>

          {/* Navigation Bar - Hidden for vendors via vendors table check */}
          {user && profile && (
            <>
              {/* Mobile Menu Button */}
              <div className={`md:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-b border-border/50 py-2 z-50 shadow-sm transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Menu className="w-4 h-4" />
                        Menu
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                      <nav className="flex flex-col gap-4 mt-8">
                        {navLinks
                          .filter(link => {
                            if (!link.visible_to_roles || link.visible_to_roles.length === 0) return true;
                            return link.visible_to_roles.includes(profile?.role || '');
                          })
                          .map((link) => {
                            if (link.href === '/support' || link.label === 'Support Us') {
                              return (
                                <div key={link.id} className="flex flex-col gap-2">
                                  <Link 
                                    to="/support" 
                                    className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                  >
                                    Support Us
                                  </Link>
                                  <Link 
                                    to="/sponsor-bestie" 
                                    className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2 pl-4"
                                    onClick={() => setMobileMenuOpen(false)}
                                  >
                                    Sponsor a Bestie
                                  </Link>
                                </div>
                              );
                            }

                            if (link.href === '/sponsor-bestie' || link.label === 'Sponsor a Bestie') {
                              return null;
                            }

                            const isExternal = link.href.startsWith('http');
                            if (isExternal) {
                              return (
                                <a
                                  key={link.id}
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {link.label}
                                </a>
                              );
                            }

                            return (
                              <Link
                                key={link.id}
                                to={link.href}
                                className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {link.label}
                              </Link>
                          );
                        })}
                        
                        {/* Help Icon for Mobile */}
                        <Button 
                          onClick={() => {
                            navigate("/help");
                            setMobileMenuOpen(false);
                          }}
                          variant="ghost"
                          className="justify-start text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                        >
                          <HelpCircle className="w-5 h-5 mr-2" />
                          Help Center
                        </Button>
                      </nav>
                      <div className="absolute bottom-8 left-6 right-6">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20">
                          <UserCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary capitalize">
                            {profile.role === "caregiver" ? "Guardian" : profile.role}
                          </span>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                    <UserCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary capitalize">
                      {profile.role === "caregiver" ? "Guardian" : profile.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav 
                className={`hidden md:block absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-b border-border/50 py-2 transition-all duration-300 z-50 shadow-sm ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
                data-tour-target="navigation-bar"
              >
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <div className="flex-1" />
                  <ul className="flex items-center justify-center gap-6 md:gap-8 font-['Roca'] text-sm font-medium">
                    {navLinks
                      .filter(link => {
                        if (!link.visible_to_roles || link.visible_to_roles.length === 0) return true;
                        return link.visible_to_roles.includes(profile?.role || '');
                      })
                      .map((link) => {
                        if (link.href === '/support' || link.label === 'Support Us') {
                          return (
                            <li key={link.id}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="relative py-1 text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[hsl(var(--burnt-orange))] after:transition-all after:duration-300 hover:after:w-full bg-transparent border-0 outline-none">
                                  {link.label} <ChevronDown className="inline-block w-3 h-3 ml-1" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="min-w-[160px]">
                                  <DropdownMenuItem asChild>
                                    <Link to="/support" className="cursor-pointer">
                                      Support Us
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/sponsor-bestie" className="cursor-pointer">
                                      Sponsor a Bestie
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </li>
                          );
                        }

                        if (link.href === '/sponsor-bestie' || link.label === 'Sponsor a Bestie') {
                          return null;
                        }

                        return (
                          <li key={link.id}>
                            {link.href.startsWith('http') ? (
                              <a 
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative py-1 text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[hsl(var(--burnt-orange))] after:transition-all after:duration-300 hover:after:w-full"
                              >
                                {link.label}
                              </a>
                            ) : (
                              <Link 
                                to={link.href} 
                                className="relative py-1 text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[hsl(var(--burnt-orange))] after:transition-all after:duration-300 hover:after:w-full"
                              >
                                {link.label}
                              </Link>
                            )}
                          </li>
                          );
                        })}
                    
                    {/* Help Icon */}
                    <li>
                      <Button 
                        onClick={() => navigate("/help")}
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-auto py-1 hover:text-[hsl(var(--burnt-orange))]"
                        title="Help Center"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </Button>
                    </li>
                  </ul>
                  <div className="flex-1 flex justify-end">
                    {profile && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20">
                        <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary capitalize">
                          {profile.role === "caregiver" ? "Guardian" : profile.role}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </nav>
            </>
          )}
        </div>
      </div>
    </header>
      )}
    </ErrorBoundary>
  );
};
