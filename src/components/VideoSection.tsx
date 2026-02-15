import { VideoPlayer } from "@/components/VideoPlayer";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";

interface VideoSectionProps {
  content?: {
    title?: string;
    description?: string;
    video_type?: 'youtube' | 'upload';
    youtube_url?: string;
    video_url?: string;
  };
}

const VideoSection = ({ content = {} }: VideoSectionProps) => {
  const {
    title = "Featured Video",
    description,
    video_type = 'youtube',
    youtube_url,
    video_url,
  } = content;

  // Don't render if no video is provided
  if (!youtube_url && !video_url) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              {title}
            </h2>
          )}
          
          {/* Description */}
          {description && (
            <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              {description}
            </p>
          )}

          {/* Video */}
          <div className="flex justify-center">
            {video_type === 'youtube' && youtube_url ? (
              <div className="w-full max-w-3xl">
                <YouTubeEmbed
                  url={youtube_url}
                  title={title}
                  className="w-full"
                />
              </div>
            ) : video_url ? (
              <VideoPlayer
                src={video_url}
                title={title}
                className="w-full"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
