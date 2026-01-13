import { useEffect, useState, memo } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContactForm } from "@/components/ContactForm";
import { useAuth } from "@/contexts/AuthContext";

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

// Cache for footer data to avoid refetching on every page
let footerDataCache: { sections: FooterSection[]; links: FooterLink[]; logoUrl: string | null } | null = null;

const Footer = memo(() => {
  const [logoUrl, setLogoUrl] = useState<string | null>(footerDataCache?.logoUrl ?? null);
  const [footerSections, setFooterSections] = useState<FooterSection[]>(footerDataCache?.sections ?? []);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>(footerDataCache?.links ?? []);
  
  // Use AuthContext instead of separate auth check
  const { isAdmin: authIsAdmin, isOwner } = useAuth();
  const isAdmin = authIsAdmin || isOwner;

  useEffect(() => {
    // Only fetch if cache is empty
    if (!footerDataCache) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      const [logoResult, sectionsResult, linksResult] = await Promise.all([
        supabase
          .rpc("get_public_app_settings")
          .returns<Array<{ setting_key: string; setting_value: any }>>(),
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

      // Process logo
      let url: string | null = null;
      const logoSetting = logoResult.data?.find((s) => s.setting_key === "logo_url");
      if (logoSetting?.setting_value) {
        if (typeof logoSetting.setting_value === 'string') {
          if (logoSetting.setting_value.startsWith('"')) {
            try {
              url = JSON.parse(logoSetting.setting_value);
            } catch (e) {
              url = logoSetting.setting_value;
            }
          } else {
            url = logoSetting.setting_value;
          }
        }
      }

      const sections = sectionsResult.data || [];
      const links = linksResult.data || [];

      // Cache the data
      footerDataCache = { sections, links, logoUrl: url };

      setLogoUrl(url);
      setFooterSections(sections);
      setFooterLinks(links);
    } catch (error) {
      console.error('Error loading footer data:', error);
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
                loading="lazy"
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
});

Footer.displayName = "Footer";

export default Footer;
