import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import bdeLogo from "@/assets/bde-logo-no-subtitle.png";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(bdeLogo);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ avatar_number?: number; display_name?: string } | null>(null);

  useEffect(() => {
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
            // Handle both string and JSON-encoded values
            const url = typeof data.setting_value === 'string' 
              ? JSON.parse(data.setting_value) 
              : data.setting_value;
            
            // Only update if it's a valid URL (not the default placeholder)
            if (url && !url.includes('object/public/app-assets/logo.png')) {
              setLogoUrl(url);
            }
          } catch (e) {
            // If JSON parse fails, use the value as-is if it's a valid URL
            if (typeof data.setting_value === 'string' && data.setting_value.startsWith('http')) {
              setLogoUrl(data.setting_value);
            }
          }
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    };
    loadLogo();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_number, display_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const navItems = [
    { label: "About", href: "#about" },
    { label: "Mission", href: "#mission" },
    { label: "Joy House Rocks", href: "#rocks" },
    { label: "Get Involved", href: "#donate" },
  ];

  return (
    <nav className="fixed top-0 w-full bg-card backdrop-blur-xl z-50 border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="Best Day Ever" 
              className="h-20 w-auto"
              onError={(e) => {
                // Fallback to default logo if uploaded logo fails to load
                e.currentTarget.src = bdeLogo;
              }}
            />
            <span className="font-handwriting text-3xl text-primary hidden sm:inline">Best Day Ever</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-semibold relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-warm transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            {user && profile ? (
              <a href="/profile-settings" className="hover:opacity-80 transition-opacity">
                <AvatarDisplay 
                  avatarNumber={profile.avatar_number} 
                  displayName={profile.display_name}
                  size="md"
                />
              </a>
            ) : (
              <Button size="lg" onClick={() => window.location.href = "/auth"} className="shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-to-r from-primary via-accent to-secondary border-0">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4 animate-fade-in">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors font-semibold py-2 px-4 hover:bg-muted rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            {user && profile ? (
              <a href="/profile-settings" className="flex justify-center hover:opacity-80 transition-opacity" onClick={() => setIsMenuOpen(false)}>
                <AvatarDisplay 
                  avatarNumber={profile.avatar_number} 
                  displayName={profile.display_name}
                  size="md"
                />
              </a>
            ) : (
              <Button size="lg" onClick={() => window.location.href = "/auth"} className="w-full shadow-warm bg-gradient-to-r from-primary via-accent to-secondary border-0">
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
