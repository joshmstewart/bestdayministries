import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HeaderSkeleton } from "@/components/HeaderSkeleton";
import { LogOut, Shield, Users, CheckCircle, ArrowLeft, UserCircle2, Mail, ChevronDown, Menu, Settings, HelpCircle, Package, Store, Receipt } from "lucide-react";
import { isProblematicIOSVersion } from "@/lib/browserDetection";
import { hasVendorAccess } from "@/lib/vendorAccess";

import { AvatarDisplay } from "@/components/AvatarDisplay";
import { NotificationBell } from "@/components/NotificationBell";
import { StickerBookButton } from "@/components/StickerBookButton";
import { CoinIcon } from "@/components/CoinIcon";
import { useCoins } from "@/hooks/useCoins";
import { useToast } from "@/hooks/use-toast";
import { useModerationCount } from "@/hooks/useModerationCount";
import { useGuardianApprovalsCount } from "@/hooks/useGuardianApprovalsCount";
import { usePendingVendorsCount } from "@/hooks/usePendingVendorsCount";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { useSponsorUnreadCount } from "@/hooks/useSponsorUnreadCount";
import { useMessageModerationCount } from "@/hooks/useMessageModerationCount";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useMessagesCount } from "@/hooks/useMessagesCount";
import { useUnmatchedItemsCount } from "@/hooks/useUnmatchedItemsCount";
import { useHealthAlertBadge } from "@/hooks/useHealthAlertBadge";
import { useAuth } from "@/contexts/AuthContext";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/integrations/supabase/types";
import type { UserRole as ImpersonationRole } from "@/hooks/useRoleImpersonation";

type UserRole = Database['public']['Enums']['user_role'];

export const UnifiedHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coins } = useCoins();
  
  // Use centralized auth context
  const { user, profile: authProfile, role, isAdmin: authIsAdmin, isOwner, isAuthenticated, loading: authLoading } = useAuth();
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const [hasSharedSponsorships, setHasSharedSponsorships] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<Array<{ id: string; label: string; href: string; display_order: number; visible_to_roles?: UserRole[]; link_type?: string; parent_id?: string | null; emoji?: string | null; bestie_emoji?: string | null }>>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { count: moderationCount } = useModerationCount();
  const { count: approvalsCount } = useGuardianApprovalsCount();
  const { count: pendingVendorsCount } = usePendingVendorsCount();
  const { count: sponsorUnreadCount } = useSponsorUnreadCount();
  const { count: messageModerationCount } = useMessageModerationCount();
  const { count: messagesCount } = useMessagesCount();
  const { count: unmatchedItemsCount } = useUnmatchedItemsCount();
  const { deadCount: healthDeadCount } = useHealthAlertBadge();
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();
  const { canModerate } = useUserPermissions();
  const [hasStoreAccess, setHasStoreAccess] = useState(false);
  const [isApprovedVendor, setIsApprovedVendor] = useState(false);
  
  // Derive profile with role for compatibility with rest of component
  const profileRole: UserRole = (role as UserRole) || 'supporter';
  const profile = authProfile ? { ...authProfile, role: profileRole } : null;
  
  // Derive isAdmin considering impersonation
  // Cast to ImpersonationRole which is a subset of valid roles for UI impersonation
  const impersonationCompatibleRole = ['admin', 'owner', 'caregiver', 'bestie', 'supporter'].includes(profileRole) 
    ? profileRole as ImpersonationRole 
    : 'supporter' as ImpersonationRole;
  const effectiveRole = profile ? getEffectiveRole(impersonationCompatibleRole) : null;
  const isAdmin = effectiveRole === "admin" || effectiveRole === "owner";

  // Safari 18.x on macOS can exhibit similar rendering issues to iOS 18.x when mixing
  // positioned elements + transforms/filters. This flag is used to disable motion/blur.
  const isProblematicBrowser = isProblematicIOSVersion();
  const navBackdropClass = isProblematicBrowser ? '' : 'backdrop-blur-xl';
  const navTransitionClass = isProblematicBrowser ? '' : 'transition-all duration-300';
  const mobileNavVisibilityClass = isProblematicBrowser
    ? (showNav ? 'block' : 'hidden')
    : (showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0');
  const desktopNavVisibilityClass = isProblematicBrowser
    ? (showNav ? 'opacity-100 pointer-events-auto' : 'hidden opacity-0 pointer-events-none')
    : (showNav ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none');

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let hasInteracted = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // On first scroll interaction, mark as interacted
      if (!hasInteracted) {
        hasInteracted = true;
        // On initial page load, always show nav if near top
        if (currentScrollY < 150) {
          setShowNav(true);
          lastScrollY = currentScrollY;
          return;
        }
      }
      
      // Show nav if near top (within 150px) or scrolling up
      if (currentScrollY < 150 || currentScrollY < lastScrollY) {
        setShowNav(true);
      } else {
        // Hide nav when scrolling down and past 150px
        setShowNav(false);
      }
      
      lastScrollY = currentScrollY;
    };

    // Ensure nav is shown on mount/navigation
    // Use a small delay to handle browser scroll restoration
    const initialCheck = setTimeout(() => {
      if (window.scrollY < 150) {
        setShowNav(true);
      }
    }, 50);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(initialCheck);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Load header data (logo, nav links) and additional user-specific data
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initializeHeader = async () => {
      try {
        // Load logo and nav links in parallel (auth is handled by AuthContext)
        const [logoResult, navResult] = await Promise.allSettled([
          loadLogo(),
          loadNavLinks()
        ]);

        // Check for failures and retry if needed
        const hasFailures = [logoResult, navResult].some(
          result => result.status === 'rejected'
        );

        if (hasFailures && retryCount < 3 && mounted) {
          console.warn('Header initialization had failures, retrying...', { retryCount });
          retryTimeout = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000 * Math.pow(2, retryCount));
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
      navSubscription.unsubscribe();
    };
  }, [retryCount]);

  // Load additional user-specific data when user changes
  useEffect(() => {
    if (!user?.id || !authProfile) return;

    let mounted = true;
    const vendorCacheKey = `vendor_access_${user.id}`;

    // If we've previously confirmed vendor access for this user, keep the UI stable
    // while we re-check in the background.
    if (localStorage.getItem(vendorCacheKey) === "true") {
      setIsApprovedVendor(true);
    }

    const loadUserSpecificData = async () => {
      try {
        // Check store access, vendor status, and shared sponsorships in parallel
        const [storeResult, vendorResult, sharesResult] = await Promise.allSettled([
          supabase
            .from("store_items")
            .select("id, visible_to_roles")
            .eq("is_active", true)
            .limit(1),

          // Vendor access includes: owning a vendor OR being an accepted team member.
          // NOTE: We treat an initial "false" as potentially transient (e.g. auth token
          // hydration timing) and confirm with a second check before hiding the link.
          hasVendorAccess(user.id),

          profileRole === "bestie"
            ? supabase
                .from("sponsorship_shares")
                .select("id")
                .eq("bestie_id", user.id)
                .limit(1)
            : Promise.resolve({ data: [] }),
        ]);

        if (!mounted) return;

        // Process store access
        if (storeResult.status === "fulfilled" && storeResult.value.data) {
          const hasVisibleItems = storeResult.value.data.some((item: any) => {
            if (isAdmin) return true;
            const visibleRoles = item.visible_to_roles;
            if (!visibleRoles || visibleRoles.length === 0) return true;
            return visibleRoles.includes(profileRole);
          });
          setHasStoreAccess(hasVisibleItems || isAdmin);
        }

        // Process vendor status (stabilized)
        if (vendorResult.status === "fulfilled") {
          const hasAccess = Boolean(vendorResult.value);

          if (hasAccess) {
            setIsApprovedVendor(true);
            localStorage.setItem(vendorCacheKey, "true");
          } else {
            // Confirm once more after a brief delay before hiding the dashboard link.
            window.setTimeout(async () => {
              if (!mounted) return;
              const confirmed = await hasVendorAccess(user.id);
              if (!mounted) return;

              if (confirmed) {
                setIsApprovedVendor(true);
                localStorage.setItem(vendorCacheKey, "true");
              } else {
                setIsApprovedVendor(false);
                localStorage.removeItem(vendorCacheKey);
              }
            }, 1200);
          }
        }

        // Process shared sponsorships
        if (sharesResult.status === "fulfilled" && profileRole === "bestie") {
          setHasSharedSponsorships(((sharesResult.value as any).data?.length ?? 0) > 0);
        }
      } catch (error) {
        console.error("Error loading user-specific data:", error);
      }
    };

    loadUserSpecificData();

    return () => {
      mounted = false;
    };
  }, [user?.id, authProfile?.id, profileRole, isAdmin]);

  // Check if Games tab is visible to current user
  const isGamesVisible = () => {
    if (!profile) return false;
    const gamesLink = navLinks.find(link => 
      link.href === '/memory-match' || 
      link.href === '/games' || 
      link.label.toLowerCase().includes('game')
    );
    if (!gamesLink) return false;
    if (!gamesLink.visible_to_roles || gamesLink.visible_to_roles.length === 0) return true;
    return gamesLink.visible_to_roles.includes(profile.role as UserRole);
  };

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .rpc("get_public_app_settings")
        .returns<Array<{ setting_key: string; setting_value: any }>>();

      if (error) throw error;

      const logoSetting = data?.find((s) => s.setting_key === "logo_url");
      
      if (logoSetting?.setting_value) {
        let url: string = '';
        
        // Handle different possible types
        if (typeof logoSetting.setting_value === 'string') {
          // If it's a string that looks like JSON, parse it
          if (logoSetting.setting_value.startsWith('"')) {
            try {
              url = JSON.parse(logoSetting.setting_value);
            } catch (e) {
              url = logoSetting.setting_value;
            }
          } else {
            url = logoSetting.setting_value;
          }
        } else if (typeof logoSetting.setting_value === 'object' && logoSetting.setting_value !== null) {
          // If it's an object, stringify and check
          url = JSON.stringify(logoSetting.setting_value);
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
        .select("id, label, href, display_order, visible_to_roles, link_type, parent_id, emoji, bestie_emoji")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setNavLinks(data || []);
    } catch (error) {
      console.error('Error loading navigation links:', error);
      throw error; // Propagate error for retry logic
    }
  };

  // Helper function to get the appropriate emoji for the current user's role
  const getDisplayEmoji = (link: { emoji?: string | null; bestie_emoji?: string | null }) => {
    // If user is a bestie and there's a bestie emoji, show that
    if (effectiveRole === 'bestie' && link.bestie_emoji) {
      return link.bestie_emoji;
    }
    // Otherwise show the regular emoji
    return link.emoji;
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
        <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-0 relative">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
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
            
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                    <span className="font-semibold">My Besties</span>
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
                {(profile?.role === "caregiver" || ((isAdmin || isOwner) && approvalsCount > 0)) && (
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
                    {(moderationCount > 0 || pendingVendorsCount > 0 || messageModerationCount > 0 || messagesCount > 0 || unmatchedItemsCount > 0 || healthDeadCount > 0) && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {moderationCount + pendingVendorsCount + messageModerationCount + messagesCount + unmatchedItemsCount + healthDeadCount}
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
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border z-[100]">
                    {/* Role Badge at top of dropdown */}
                    <div className="px-2 py-2 mb-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary capitalize">
                          {profile.role === "caregiver" ? "Guardian" : profile.role}
                        </span>
                      </div>
                    </div>
                    
                    <Separator className="my-1" />
                    
                    {isApprovedVendor && (
                      <DropdownMenuItem onClick={() => navigate("/vendor-dashboard")} className="cursor-pointer">
                        <Store className="w-4 h-4 mr-2" />
                        Vendor Dashboard
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={() => navigate("/orders")} className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" />
                      Order History
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => navigate("/donation-history")} className="cursor-pointer">
                      <Receipt className="w-4 h-4 mr-2" />
                      Donation History
                    </DropdownMenuItem>
                    
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
                  variant="ghost" 
                  onClick={() => navigate("/newsletter")}
                  className="font-semibold whitespace-nowrap"
                >
                  <span className="hidden md:inline">Join Our Newsletter</span>
                  <span className="md:hidden">Newsletter</span>
                </Button>
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
              <div className={`md:hidden absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-b border-border/50 py-2 z-[51] shadow-sm transition-all duration-300 ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Menu className="w-4 h-4" />
                        Menu
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                      <ScrollArea className="h-full p-6">
                        <nav className="flex flex-col gap-4 mt-8 pb-24">
                          {navLinks
                            .filter(link => !link.parent_id)
                            .filter(link => {
                              if (!link.visible_to_roles || link.visible_to_roles.length === 0) return true;
                              return link.visible_to_roles.includes(profileRole);
                            })
                            .map((link) => {
                              const isExternal = link.href.startsWith('http');
                              const children = navLinks.filter(child => child.parent_id === link.id);

                              if (link.link_type === 'dropdown' && children.length > 0) {
                                const hasParentLink = link.href && link.href.trim() !== '';
                                return (
                                  <div key={link.id} className="flex flex-col gap-2">
                                    {hasParentLink ? (
                                      link.href.startsWith('http') ? (
                                        <a
                                          href={link.href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-lg font-['Roca'] font-semibold text-foreground/90 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                                          onClick={() => setMobileMenuOpen(false)}
                                        >
                                          {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                                        </a>
                                      ) : (
                                         <Link
                                          to={link.href}
                                          className="text-lg font-['Roca'] font-semibold text-foreground/90 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2"
                                          onClick={() => setMobileMenuOpen(false)}
                                        >
                                          {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                                        </Link>
                                      )
                                    ) : (
                                      <div className="text-lg font-['Roca'] font-semibold text-foreground/90 py-2">
                                        {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                                      </div>
                                    )}
                                    {children
                                      .filter(child => {
                                        if (!child.visible_to_roles || child.visible_to_roles.length === 0) return true;
                                        return child.visible_to_roles.includes(profileRole);
                                      })
                                      .map((child) => {
                                        const isChildExternal = child.href.startsWith('http');
                                        if (isChildExternal) {
                                          return (
                                            <a
                                              key={child.id}
                                              href={child.href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2 pl-4"
                                              onClick={() => setMobileMenuOpen(false)}
                                            >
                                              {getDisplayEmoji(child) && <span className="mr-1">{getDisplayEmoji(child)}</span>}{child.label}
                                            </a>
                                          );
                                        }
                                        return (
                                          <Link
                                            key={child.id}
                                            to={child.href}
                                            className="text-lg font-['Roca'] font-medium text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors py-2 pl-4"
                                            onClick={() => setMobileMenuOpen(false)}
                                          >
                                            {getDisplayEmoji(child) && <span className="mr-1">{getDisplayEmoji(child)}</span>}{child.label}
                                          </Link>
                                        );
                                      })}
                                  </div>
                                );
                              }

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
                                    {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
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
                                  {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
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
                      </ScrollArea>
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
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate("/store")}
                      className="flex items-center gap-1.5 hover:scale-105 transition-transform"
                      title="Coin Shop"
                      aria-label="Coin Shop"
                    >
                      <CoinIcon className="drop-shadow-[0_2px_8px_rgba(234,179,8,0.3)]" size={24} />
                      <span className="font-semibold text-sm">{coins.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav 
                className={`hidden md:block absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-b border-border/50 py-2 transition-all duration-300 z-[51] shadow-sm ${showNav ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}
                data-tour-target="navigation-bar"
              >
                <div className="container mx-auto px-4 flex items-center justify-between">
                  <div className="flex-1" />
                  <ul className="flex items-center justify-center gap-3 md:gap-4 lg:gap-6 font-['Roca'] text-xs lg:text-sm font-medium">
                    {navLinks
                      .filter(link => !link.parent_id)
                      .filter(link => {
                        if (!link.visible_to_roles || link.visible_to_roles.length === 0) return true;
                        return link.visible_to_roles.includes(profileRole);
                      })
                      .map((link) => {
                        const children = navLinks.filter(child => child.parent_id === link.id);

                        if (link.link_type === 'dropdown' && children.length > 0) {
                          const hasParentLink = link.href && link.href.trim() !== '';
                          return (
                            <li key={link.id}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="relative py-1 text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[hsl(var(--burnt-orange))] after:transition-all after:duration-300 hover:after:w-full bg-transparent border-0 outline-none">
                                  {hasParentLink ? (
                                    <span className="flex items-center gap-1">
                                      {link.href.startsWith('http') ? (
                                        <a 
                                          href={link.href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                                        </a>
                                      ) : (
                                        <Link 
                                          to={link.href}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                                        </Link>
                                      )}
                                      <ChevronDown className="inline-block w-3 h-3" />
                                    </span>
                                  ) : (
                                    <span>
                                      {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label} <ChevronDown className="inline-block w-3 h-3 ml-1" />
                                    </span>
                                  )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="min-w-[160px] bg-card border-border z-50">
                                  {children
                                    .filter(child => {
                                      if (!child.visible_to_roles || child.visible_to_roles.length === 0) return true;
                                      return child.visible_to_roles.includes(profileRole);
                                    })
                                    .map((child) => {
                                      if (child.href.startsWith('http')) {
                                        return (
                                          <DropdownMenuItem key={child.id} asChild>
                                            <a href={child.href} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                              {getDisplayEmoji(child) && <span className="mr-1">{getDisplayEmoji(child)}</span>}{child.label}
                                            </a>
                                          </DropdownMenuItem>
                                        );
                                      }
                                      return (
                                        <DropdownMenuItem key={child.id} asChild>
                                          <Link to={child.href} className="cursor-pointer">
                                            {getDisplayEmoji(child) && <span className="mr-1">{getDisplayEmoji(child)}</span>}{child.label}
                                          </Link>
                                        </DropdownMenuItem>
                                      );
                                    })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </li>
                          );
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
                                {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
                              </a>
                            ) : (
                              <Link 
                                to={link.href} 
                                className="relative py-1 text-foreground/80 hover:text-[hsl(var(--burnt-orange))] transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[hsl(var(--burnt-orange))] after:transition-all after:duration-300 hover:after:w-full"
                              >
                                {getDisplayEmoji(link) && <span className="mr-1">{getDisplayEmoji(link)}</span>}{link.label}
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
                        className="ml-1 h-auto py-1 hover:text-[hsl(var(--burnt-orange))]"
                        title="Help Center"
                      >
                        <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                      </Button>
                    </li>
                  </ul>
                  <div className="flex-1 flex justify-end">
                    {profile && (
                      <button 
                        onClick={() => navigate("/store")}
                        className="flex items-center gap-2 hover:scale-105 transition-transform"
                        title="Coin Shop"
                        aria-label="Coin Shop"
                      >
                        <CoinIcon className="drop-shadow-[0_2px_8px_rgba(234,179,8,0.3)]" size={24} />
                        <span className="font-semibold text-sm md:text-base">{coins.toLocaleString()}</span>
                      </button>
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
