import { UnifiedHeader } from "@/components/UnifiedHeader";
import Hero from "@/components/Hero";
import Mission from "@/components/Mission";
import CommunityFeatures from "@/components/CommunityFeatures";
import CommunityGallery from "@/components/CommunityGallery";
import JoyRocks from "@/components/JoyRocks";
import Donate from "@/components/Donate";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { FeaturedBestieDisplay } from "@/components/FeaturedBestieDisplay";
import { SponsorBestieDisplay } from "@/components/SponsorBestieDisplay";
import LatestAlbum from "@/components/LatestAlbum";
import PublicEvents from "@/components/PublicEvents";
import OurFamily from "@/components/OurFamily";
import { FeaturedItem } from "@/components/FeaturedItem";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Default sections order
const DEFAULT_SECTIONS = [
  { section_key: 'hero', is_visible: true },
  { section_key: 'featured_items', is_visible: true },
  { section_key: 'featured_bestie', is_visible: true },
  { section_key: 'sponsor_bestie', is_visible: true },
  { section_key: 'mission', is_visible: true },
  { section_key: 'community_features', is_visible: true },
  { section_key: 'our_family', is_visible: true },
  { section_key: 'latest_album', is_visible: true },
  { section_key: 'public_events', is_visible: true },
  { section_key: 'community_gallery', is_visible: true },
  { section_key: 'joy_rocks', is_visible: true },
  { section_key: 'donate', is_visible: true },
  { section_key: 'about', is_visible: true },
];

const Index = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Array<{ section_key: string; is_visible: boolean }>>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check vendor status but don't block page load
    checkVendorStatus();
    
    // Fetch sections in background to update from defaults
    fetchSections();
  }, []);

  const checkVendorStatus = async () => {
    try {
      console.log("Index - Checking vendor status...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Index - Session:", session, "Error:", sessionError);
      
      if (session?.user) {
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('status')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        console.log("Index - Vendor data:", vendor, "Error:", vendorError);
        
        if (vendor) {
          console.log("Index - User is vendor, redirecting...");
          navigate("/vendor-dashboard", { replace: true });
        }
      }
    } catch (error) {
      console.error("Index - Error checking vendor status:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, is_visible")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching sections:", error);
        return;
      }
      
      if (data && data.length > 0) {
        setSections(data);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const markSectionLoaded = (sectionKey: string) => {
    setLoadedSections(prev => new Set([...prev, sectionKey]));
  };

  const canLoadSection = (sectionKey: string): boolean => {
    const sectionIndex = sections.findIndex(s => s.section_key === sectionKey);
    if (sectionIndex === 0) return true; // First section can always load
    
    // Find the previous visible section
    let prevIndex = sectionIndex - 1;
    while (prevIndex >= 0 && !sections[prevIndex].is_visible) {
      prevIndex--;
    }
    
    // If no previous visible section, this can load
    if (prevIndex < 0) return true;
    
    const previousSection = sections[prevIndex];
    return loadedSections.has(previousSection.section_key);
  };

  // Mark synchronous sections as loaded on mount
  useEffect(() => {
    const syncSections = ['hero', 'mission', 'community_features', 'our_family', 'public_events', 'community_gallery', 'joy_rocks', 'donate', 'about'];
    syncSections.forEach(key => {
      if (sections.find(s => s.section_key === key)) {
        markSectionLoaded(key);
      }
    });
  }, [sections]);

  // Component mapping
  const componentMap: Record<string, React.ReactNode> = {
    hero: <Hero />,
    featured_items: (
      <div className="container mx-auto px-4 pt-8">
        <FeaturedItem 
          canLoad={canLoadSection('featured_items')}
          onLoadComplete={() => markSectionLoaded('featured_items')}
        />
      </div>
    ),
    featured_bestie: (
      <section className="container mx-auto px-4 py-16">
        <FeaturedBestieDisplay 
          canLoad={canLoadSection('featured_bestie')}
          onLoadComplete={() => markSectionLoaded('featured_bestie')}
        />
      </section>
    ),
    sponsor_bestie: (
      <section className="container mx-auto px-4 py-16">
        <SponsorBestieDisplay 
          canLoad={canLoadSection('sponsor_bestie')}
          onLoadComplete={() => markSectionLoaded('sponsor_bestie')}
        />
      </section>
    ),
    mission: <Mission />,
    community_features: <CommunityFeatures />,
    our_family: <OurFamily />,
    latest_album: (
      <LatestAlbum 
        canLoad={canLoadSection('latest_album')}
        onLoadComplete={() => markSectionLoaded('latest_album')}
      />
    ),
    public_events: <PublicEvents />,
    community_gallery: <CommunityGallery />,
    joy_rocks: <JoyRocks />,
    donate: <Donate />,
    about: <About />,
  };


  return (
    <div className="min-h-screen">
      <UnifiedHeader />
      <main>
        {sections
          .filter((section) => section.is_visible)
          .map((section) => (
            <div key={section.section_key}>
              {componentMap[section.section_key]}
            </div>
          ))}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
