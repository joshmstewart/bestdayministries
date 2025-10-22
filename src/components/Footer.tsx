import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContactForm } from "@/components/ContactForm";

// Build timestamp for admin visibility
const BUILD_TIMESTAMP = new Date().toISOString();

interface FooterSection {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
}

interface FooterLink {
  id: string;
  section_id: string;
  label: string;
  href: string;
  display_order: number;
  is_active: boolean;
}

const Footer = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [footerSections, setFooterSections] = useState<FooterSection[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadLogo();
    loadFooterData();
    checkAdminStatus();
  }, []);

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
    }
  };

  const loadFooterData = async () => {
    try {
      const [sectionsResult, linksResult] = await Promise.all([
        supabase
          .from("footer_sections")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("footer_links")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      console.log('Footer sections loaded:', sectionsResult.data);
      console.log('Footer links loaded:', linksResult.data);

      if (sectionsResult.data) setFooterSections(sectionsResult.data);
      if (linksResult.data) setFooterLinks(linksResult.data);
    } catch (error) {
      console.error('Error loading footer data:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setIsAdmin(roleData?.role === 'admin' || roleData?.role === 'owner');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const defaultFooterLinks = [
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
        { label: "Newsletter", href: "/newsletter" },
        { label: "Partners", href: "#" },
        { label: "Best Day Ever Cafe", href: "#" },
      ],
    },
  ];

  return (
    <>
      <ContactForm />
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

          {footerSections.length > 0 ? (
            footerSections.map((section) => (
              <div key={section.id} className="space-y-4">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                <ul className="space-y-2">
                  {footerLinks
                    .filter((link) => link.section_id === section.id)
                    .map((link) => (
                      <li key={link.id}>
                        {link.href.startsWith('/') ? (
                          <Link
                            to={link.href}
                            className="text-muted-foreground hover:text-primary transition-colors inline-block min-h-[28px] flex items-center"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.href}
                            className="text-muted-foreground hover:text-primary transition-colors inline-block min-h-[28px] flex items-center"
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))
          ) : (
            defaultFooterLinks.map((section) => (
              <div key={section.title} className="space-y-4">
                <h3 className="font-semibold text-foreground">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link
                          to={link.href}
                          onClick={() => console.log('Newsletter Link clicked, navigating to:', link.href)}
                          className="text-muted-foreground hover:text-primary transition-colors inline-block min-h-[28px] flex items-center"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          onClick={() => console.log('Newsletter anchor clicked:', link.href)}
                          className="text-muted-foreground hover:text-primary transition-colors inline-block min-h-[28px] flex items-center"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center text-muted-foreground">
              <p className="flex items-center justify-center gap-2">
                Made with <Heart className="w-4 h-4 text-primary fill-primary" /> by Best Day Ministries Community
              </p>
              <p className="mt-2 text-sm">
                © {new Date().getFullYear()} Best Day Ministries Community. All rights reserved.
              </p>
              {isAdmin && (
                <p className="mt-4 text-xs text-muted-foreground/70">
                  Last updated: {new Date(BUILD_TIMESTAMP).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      </footer>
    </>
  );
};

export default Footer;
