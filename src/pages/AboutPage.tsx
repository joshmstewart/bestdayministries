import { useEffect, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const AboutPage = () => {
  const [aboutContent, setAboutContent] = useState<any>(null);

  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from("homepage_sections")
        .select("content")
        .eq("section_key", "about")
        .single();

      if (data?.content) {
        setAboutContent(data.content);
      }
    };

    fetchContent();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        <About content={aboutContent} />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
