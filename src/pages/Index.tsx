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

const Index = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Array<{ section_key: string; is_visible: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      console.log("Index - Initializing page...");
      
      // Set a safety timeout
      const timeoutId = setTimeout(() => {
        console.log("Index - Safety timeout triggered, forcing page load");
        setLoading(false);
      }, 3000);
      
      try {
        await Promise.all([
          checkVendorStatus(),
          fetchSections()
        ]);
      } catch (error) {
        console.error("Index - Error during initialization:", error);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    initializePage();
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
      console.log("Index - Fetching homepage sections...");
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, is_visible")
        .order("display_order", { ascending: true });

      console.log("Index - Sections data:", data);
      console.log("Index - Sections error:", error);

      if (error) throw error;
      
      // If no sections found, use default order
      if (!data || data.length === 0) {
        console.log("Index - No sections found, using default order");
        setSections([
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
        ]);
      } else {
        setSections(data);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      // Use default sections on error
      setSections([
        { section_key: 'hero', is_visible: true },
        { section_key: 'mission', is_visible: true },
        { section_key: 'about', is_visible: true },
      ]);
    } finally {
      console.log("Index - Setting loading to false");
      setLoading(false);
    }
  };

  // Component mapping
  const componentMap: Record<string, React.ReactNode> = {
    hero: <Hero />,
    featured_items: (
      <div className="container mx-auto px-4 pt-8">
        <FeaturedItem />
      </div>
    ),
    featured_bestie: (
      <section className="container mx-auto px-4 py-16">
        <FeaturedBestieDisplay />
      </section>
    ),
    sponsor_bestie: (
      <section className="container mx-auto px-4 py-16">
        <SponsorBestieDisplay />
      </section>
    ),
    mission: <Mission />,
    community_features: <CommunityFeatures />,
    our_family: <OurFamily />,
    latest_album: <LatestAlbum />,
    public_events: <PublicEvents />,
    community_gallery: <CommunityGallery />,
    joy_rocks: <JoyRocks />,
    donate: <Donate />,
    about: <About />,
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <UnifiedHeader />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
