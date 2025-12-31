import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeModalContent {
  title: string;
  paragraph1: string;
  paragraph2: string;
  button_text: string;
}

const DEFAULT_CONTENT: WelcomeModalContent = {
  title: "Joy House Has a New Home!",
  paragraph1: "Welcome! Joy House is now part of Best Day Ministries — a family that includes Joy House Store, Best Day Ever! coffee + crepes, and all our community events and programs.",
  paragraph2: "Please update your bookmarks to bestdayministries.org to visit us directly next time.",
  button_text: "Explore the New Site"
};

export function WelcomeRedirectModal() {
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<WelcomeModalContent>(DEFAULT_CONTENT);

  useEffect(() => {
    // Check if ?welcome=true is in the URL
    if (searchParams.get("welcome") === "true") {
      setOpen(true);
      loadContent();
    }
  }, [searchParams]);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "welcome_modal_content")
        .maybeSingle();

      if (error) {
        console.error("Error loading welcome modal content:", error);
        return;
      }

      if (data?.setting_value) {
        const parsedContent = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        setContent({ ...DEFAULT_CONTENT, ...parsedContent });
      }
    } catch (error) {
      console.error("Error loading welcome modal content:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>{content.paragraph1}</p>
            <p>
              {content.paragraph2.includes("bestdayministries.org") ? (
                <>
                  {content.paragraph2.split("bestdayministries.org")[0]}
                  <strong>bestdayministries.org</strong>
                  {content.paragraph2.split("bestdayministries.org")[1]}
                </>
              ) : (
                content.paragraph2
              )}
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={() => setOpen(false)} className="px-8">
            {content.button_text}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
