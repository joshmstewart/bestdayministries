import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  canonicalUrl?: string;
  structuredData?: object;
}

export const SEOHead = ({
  title: propTitle,
  description: propDescription,
  image: propImage,
  type = "website",
  noindex = false,
  canonicalUrl,
  structuredData,
}: SEOHeadProps) => {
  const location = useLocation();
  const currentUrl = canonicalUrl || `${window.location.origin}${location.pathname}`;
  
  const [seoSettings, setSeoSettings] = useState({
    title: propTitle || "Joy House Community | Spreading Joy Through Special Needs Community",
    description: propDescription || "Joy House builds a supportive community for adults with special needs by sharing their creativity through unique gifts, giving them confidence, independence, and JOY!",
    image: propImage || "https://lovable.dev/opengraph-image-p98pqg.png",
    twitterHandle: "",
  });

  // Load SEO settings from database
  useEffect(() => {
    const loadSeoSettings = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("*")
          .in("setting_key", ["site_title", "site_description", "og_image_url", "twitter_handle"]);

        if (data) {
          const settingsMap: any = {};
          data.forEach((setting) => {
            try {
              const value = typeof setting.setting_value === 'string' 
                ? JSON.parse(setting.setting_value) 
                : setting.setting_value;
              settingsMap[setting.setting_key] = value;
            } catch {
              settingsMap[setting.setting_key] = setting.setting_value;
            }
          });

          setSeoSettings({
            title: propTitle || settingsMap.site_title || seoSettings.title,
            description: propDescription || settingsMap.site_description || seoSettings.description,
            image: propImage || settingsMap.og_image_url || seoSettings.image,
            twitterHandle: settingsMap.twitter_handle || "",
          });
        }
      } catch (error) {
        console.error("Error loading SEO settings:", error);
      }
    };

    loadSeoSettings();
  }, [propTitle, propDescription, propImage]);

  useEffect(() => {
    const { title, description, image, twitterHandle } = seoSettings;
    
    // Update title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isName = false) => {
      const attribute = isName ? "name" : "property";
      let element = document.querySelector(`meta[${attribute}="${property}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, property);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // Standard meta tags
    updateMetaTag("description", description, true);
    updateMetaTag("author", "Joy House Community", true);

    // Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:type", type);
    updateMetaTag("og:image", image);
    updateMetaTag("og:url", currentUrl);
    updateMetaTag("og:site_name", "Joy House Community");

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image", true);
    updateMetaTag("twitter:title", title, true);
    updateMetaTag("twitter:description", description, true);
    updateMetaTag("twitter:image", image, true);
    if (twitterHandle) {
      updateMetaTag("twitter:site", `@${twitterHandle}`, true);
      updateMetaTag("twitter:creator", `@${twitterHandle}`, true);
    }

    // Robots meta tag
    if (noindex) {
      updateMetaTag("robots", "noindex,nofollow", true);
    } else {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      if (robotsMeta) robotsMeta.remove();
    }

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;

    // Structured Data (JSON-LD)
    if (structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]#structured-data') as HTMLScriptElement;
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.type = "application/ld+json";
        scriptTag.id = "structured-data";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }
  }, [seoSettings, type, noindex, currentUrl, structuredData]);

  return null;
};

// Organization structured data for landing page
export const getOrganizationStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Joy House Community",
  "alternateName": "Best Day Ministries",
  "url": window.location.origin,
  "logo": `${window.location.origin}/favicon.png`,
  "description": "Building a supportive community for adults with special needs by sharing their creativity through unique gifts, giving them confidence, independence, and JOY!",
  "foundingDate": "2013",
  "sameAs": [
    "https://www.facebook.com/bestdayministries",
    "https://www.instagram.com/bestdayministries"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Your City",
    "addressRegion": "Your State",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Service",
    "availableLanguage": "English"
  }
});

// Article structured data for blog/discussion posts
export const getArticleStructuredData = (title: string, description: string, image: string, datePublished: string, author: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": description,
  "image": image,
  "datePublished": datePublished,
  "author": {
    "@type": "Person",
    "name": author
  },
  "publisher": {
    "@type": "Organization",
    "name": "Joy House Community",
    "logo": {
      "@type": "ImageObject",
      "url": `${window.location.origin}/favicon.png`
    }
  }
});

// Event structured data
export const getEventStructuredData = (name: string, description: string, startDate: string, location: string, image?: string) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": name,
  "description": description,
  "startDate": startDate,
  "location": {
    "@type": "Place",
    "name": location,
    "address": location
  },
  ...(image && { "image": image })
});
