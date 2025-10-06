import { useEffect, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import About from "@/components/About";
import OurFamily from "@/components/OurFamily";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface AboutSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
}

const AboutPage = () => {
  const [aboutContent, setAboutContent] = useState<any>(null);
  const [sections, setSections] = useState<AboutSection[]>([]);

  useEffect(() => {
    const fetchContent = async () => {
      // Fetch About content from homepage_sections (shared content)
      const { data } = await supabase
        .from("homepage_sections")
        .select("content")
        .eq("section_key", "about")
        .single();

      if (data?.content) {
        setAboutContent(data.content);
      }

      // Fetch section order from about_sections
      const { data: sectionsData } = await supabase
        .from("about_sections")
        .select("*")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (sectionsData) {
        setSections(sectionsData.map(section => ({
          ...section,
          content: (section.content as Record<string, any>) || {}
        })));
      }
    };

    fetchContent();
  }, []);

  const renderSection = (section: AboutSection) => {
    switch (section.section_key) {
      case 'about_content':
        return <About key={section.id} content={aboutContent} />;
      case 'family_orgs':
        return <OurFamily key={section.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        {sections.map(renderSection)}
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
