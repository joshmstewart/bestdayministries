import { useEffect, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import JoyRocks from "@/components/JoyRocks";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const JoyRocksPage = () => {
  const [joyRocksContent, setJoyRocksContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch joy_rocks section content from homepage_sections
        const { data, error } = await supabase
          .from("homepage_sections")
          .select("content")
          .eq("section_key", "joy_rocks")
          .maybeSingle();

        if (error) throw error;
        
        if (data?.content) {
          setJoyRocksContent(data.content);
        }
      } catch (error) {
        console.error("Error fetching joy rocks content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-14">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          </div>
        ) : (
          <JoyRocks content={joyRocksContent || undefined} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default JoyRocksPage;
