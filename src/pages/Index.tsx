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
import LatestAlbum from "@/components/LatestAlbum";
import PublicEvents from "@/components/PublicEvents";
import OurFamily from "@/components/OurFamily";
import { FeaturedItem } from "@/components/FeaturedItem";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [sections, setSections] = useState<Array<{ section_key: string; is_visible: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, is_visible")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error("Error fetching sections:", error);
    } finally {
      setLoading(false);
    }
  };

  // Component mapping
  const componentMap: Record<string, React.ReactNode> = {
    hero: <Hero />,
    featured_bestie: (
      <section className="container mx-auto px-4 py-16">
        <FeaturedBestieDisplay />
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnifiedHeader />
      <main>
        <div className="container mx-auto px-4 pt-8">
          <FeaturedItem />
        </div>
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
