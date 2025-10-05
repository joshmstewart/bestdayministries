import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

import { LogOut, Shield, Users, CheckCircle, ArrowLeft, UserCircle2, Mail } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useToast } from "@/hooks/use-toast";
import { useModerationCount } from "@/hooks/useModerationCount";
import { useGuardianApprovalsCount } from "@/hooks/useGuardianApprovalsCount";
import { usePendingVendorsCount } from "@/hooks/usePendingVendorsCount";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { Separator } from "@/components/ui/separator";

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
  const [navLinks, setNavLinks] = useState<Array<{ id: string; label: string; href: string; display_order: number }>>([]);
  const { count: moderationCount } = useModerationCount();
  const { count: approvalsCount } = useGuardianApprovalsCount();
  const { count: pendingVendorsCount } = usePendingVendorsCount();
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();

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

  useEffect(() => {
    checkUser();
    loadLogo();
    loadNavLinks();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // CRITICAL: Keep this callback synchronous to avoid deadlocks
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer profile fetch but keep loading state until it completes
        setTimeout(() => {
          fetchProfile(session.user.id).finally(() => {
            setAuthLoading(false);
          });
        }, 0);
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
        loadNavLinks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      navSubscription.unsubscribe();
    };
  }, []);

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

      console.log('Logo data from database:', data);

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
        
        console.log('Setting logo URL to:', url);
        if (url) {
          setLogoUrl(url);
        }
      } else {
        console.log('No logo in database, using fallback');
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const loadNavLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("navigation_links")
        .select("id, label, href, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setNavLinks(data || []);
    } catch (error) {
      console.error('Error loading navigation links:', error);
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
                  onClick={() => navigate(user ? "/community" : "/")}
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
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/profile")}
                  className="gap-2 hover:bg-muted"
                >
                  <AvatarDisplay 
                    avatarNumber={profile?.avatar_number} 
                    displayName={profile?.display_name}
                    size="md"
                  />
                  <span className="hidden sm:inline font-semibold">Profile</span>
                </Button>
                {(profile?.role === "caregiver" || profile?.role === "supporter" || profile?.role === "admin" || profile?.role === "owner" || (profile?.role === "bestie" && hasSharedSponsorships)) && (
                  <Button 
                    onClick={() => navigate("/guardian-links")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">My Besties</span>
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
                {isAdmin && (
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="gap-2 bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white border-0 relative"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Admin</span>
                    {(moderationCount > 0 || pendingVendorsCount > 0) && (
                      <span className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs bg-destructive text-destructive-foreground">
                        {moderationCount + pendingVendorsCount}
                      </span>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">Logout</span>
                </Button>
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
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-warm border-0 font-semibold"
                >
                  Sign Up
                </Button>
              </>
            )}
            </div>
          </div>

          {/* Navigation Bar - Absolutely positioned to overlay */}
          {user && profile && profile.role !== "vendor" && (
            <nav className={`absolute top-full left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-b border-border/50 py-2 transition-all duration-300 z-50 shadow-sm ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
              <div className="container mx-auto px-4 flex items-center justify-between">
                <div className="flex-1" />
                <ul className="flex items-center justify-center gap-6 md:gap-8 font-['Roca'] text-sm font-medium">
                  {navLinks.map((link) => (
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
                  ))}
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
          )}
        </div>
      </div>
    </header>
  );
};
