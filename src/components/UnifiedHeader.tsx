import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Shield, Users, CheckCircle, ArrowLeft } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useToast } from "@/hooks/use-toast";
import { useModerationCount } from "@/hooks/useModerationCount";
import { useRoleImpersonation } from "@/hooks/useRoleImpersonation";
import { Separator } from "@/components/ui/separator";

export const UnifiedHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isTestAccount, setIsTestAccount] = useState(false);
  const { count: moderationCount } = useModerationCount();
  const { getEffectiveRole, isImpersonating } = useRoleImpersonation();

  useEffect(() => {
    checkUser();
    loadLogo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
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


  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
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
    
    // Check if this is a test account
    const testEmails = ["testbestie@example.com", "testguardian@example.com", "testsupporter@example.com"];
    setIsTestAccount(testEmails.includes(data?.email || ""));
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
    <header className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Best Day Ever Coffee + Crepes" 
                className="h-[85px] w-auto cursor-pointer my-1.5 mx-1"
                onClick={() => navigate(user ? "/community" : "/")}
              />
            ) : (
              <div className="h-[85px] w-[140px] my-1.5 mx-1" />
            )}
            {user && profile && (
              <>
                <Separator orientation="vertical" className="h-16 mx-2" />
                <div className="hidden sm:block">
                  <div className="text-xs text-muted-foreground">Welcome back,</div>
                  <div className="font-bold text-foreground text-lg">{profile?.display_name}</div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && profile ? (
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
                {(profile?.role === "caregiver" || profile?.role === "supporter" || profile?.role === "admin" || profile?.role === "owner") && (
                  <Button 
                    onClick={() => navigate("/guardian-links")}
                    variant="outline"
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">My Besties</span>
                  </Button>
                )}
                {profile?.role === "caregiver" && (
                  <Button 
                    onClick={() => navigate("/guardian-approvals")}
                    variant="outline"
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Approvals</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="gap-2 bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white border-0 relative"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Admin</span>
                    {moderationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                      >
                        {moderationCount}
                      </Badge>
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
                  className="bg-gradient-to-r from-primary via-accent to-secondary border-0 font-semibold"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
