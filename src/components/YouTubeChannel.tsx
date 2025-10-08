import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Youtube } from "lucide-react";

interface YouTubeChannelProps {
  content?: {
    badge_text?: string;
    heading?: string;
    description?: string;
    channel_url?: string;
    button_text?: string;
  };
}

export function YouTubeChannel({ content = {} }: YouTubeChannelProps) {
  const {
    badge_text = "YouTube",
    heading = "Subscribe to Our Channel",
    description = "Follow our journey and stay updated with our latest videos.",
    channel_url = "https://youtube.com/@bestdayeveraustin",
    button_text = "Visit Our Channel"
  } = content;

  const handleChannelClick = () => {
    window.open(channel_url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-8 md:p-12 bg-gradient-to-br from-background to-muted/30 border-2 hover:border-primary/50 transition-colors">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative w-28 h-20 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
            </div>
            
            <div className="space-y-2">
              <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {badge_text}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold font-['Roca']">
                {heading}
              </h2>
            </div>

            <p className="text-lg text-muted-foreground max-w-2xl">
              {description}
            </p>

            <Button 
              onClick={handleChannelClick}
              size="lg"
              className="mt-4"
            >
              <Youtube className="mr-2 h-5 w-5" />
              {button_text}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
