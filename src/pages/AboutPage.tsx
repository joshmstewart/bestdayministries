import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import About from "@/components/About";
import OurFamily from "@/components/OurFamily";
import { YouTubeChannel } from "@/components/YouTubeChannel";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      case 'youtube_channel':
        return <YouTubeChannel key={section.id} content={section.content} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        {sections.map(renderSection)}
        
        <section className="py-12 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Meet The Team</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Get to know the passionate people who make Best Day Ministries possible.
            </p>
            <Button asChild size="lg">
              <Link to="/meet-the-team">
                Meet Our Team <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
