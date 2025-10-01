import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { useToast } from "@/hooks/use-toast";
import bdeLogo from "@/assets/bde-logo-no-subtitle.png";

export const UnifiedHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoUrl, setLogoUrl] = useState(bdeLogo);

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

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings_public")
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
            <img 
              src={logoUrl} 
              alt="Best Day Ever" 
              className="h-32 w-auto cursor-pointer"
              onClick={() => navigate(user ? "/community" : "/")}
              onError={(e) => {
                e.currentTarget.src = bdeLogo;
              }}
            />
            {user && profile && (
              <div className="hidden sm:block">
                <div className="text-xs text-muted-foreground">Welcome back,</div>
                <div className="font-bold text-foreground text-lg">{profile?.display_name}</div>
              </div>
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
                    size="sm"
                  />
                  <span className="hidden sm:inline font-semibold">Profile</span>
                </Button>
                {isAdmin && (
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="gap-2 bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white border-0"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline font-semibold">Admin</span>
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
