import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings_public")
        .select("setting_value")
        .eq("setting_key", "logo_url")
        .maybeSingle();

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
    }
  };

  const footerLinks = [
    {
      title: "About",
      links: [
        { label: "Our Story", href: "#about" },
        { label: "Meet the Besties", href: "#" },
        { label: "Joy Team", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
    {
      title: "Get Involved",
      links: [
        { label: "Donate", href: "#donate" },
        { label: "Shop", href: "#" },
        { label: "Events Calendar", href: "#" },
        { label: "Locations", href: "#" },
      ],
    },
    {
      title: "Connect",
      links: [
        { label: "Contact Us", href: "#" },
        { label: "Newsletter", href: "#" },
        { label: "Partners", href: "#" },
        { label: "Best Day Ever Cafe", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Best Day Ministries" 
                className="h-24 w-auto"
              />
            ) : (
              <div className="text-3xl font-bold">
                <span className="text-foreground">Best Day Ever</span>
                <span className="text-primary">Ministries</span>
              </div>
            )}
            <p className="text-muted-foreground">
              Spreading joy through the unique gifts and talents of the special needs community.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors inline-block min-h-[28px] flex items-center"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border text-center text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            Made with <Heart className="w-4 h-4 text-primary fill-primary" /> by Best Day Ministries Community
          </p>
          <p className="mt-2 text-sm">
            © {new Date().getFullYear()} Best Day Ministries Community. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
