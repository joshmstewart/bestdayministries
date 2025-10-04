import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface BestieAsset {
  id: string;
  bestie_name: string;
  description: string;
  asset_type: 'image' | 'video' | 'voice_note';
  asset_url: string;
  aspect_ratio: string;
}

interface VendorBestieAssetDisplayProps {
  assets: BestieAsset[];
}

export const VendorBestieAssetDisplay = ({ assets }: VendorBestieAssetDisplayProps) => {
  if (assets.length === 0) return null;

  console.log('VendorBestieAssetDisplay - Assets:', assets);

  return (
    <div className="pb-8 space-y-6">
      <h2 className="font-heading text-2xl font-bold">Featured Content</h2>
      {assets.map((asset) => (
        <Card key={asset.id} className="border-2 border-primary/20 shadow-warm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Asset Display Section */}
            <div className="relative overflow-hidden rounded-lg">
              {asset.asset_type === 'image' && asset.asset_url && (
                <AspectRatio ratio={(() => {
                  const [w, h] = (asset.aspect_ratio || '9:16').split(':').map(Number);
                  return w / h;
                })()}>
                  <img
                    src={asset.asset_url}
                    alt={asset.bestie_name || 'Bestie content'}
                    className="object-cover w-full h-full"
                  />
                </AspectRatio>
              )}
              {asset.asset_type === 'video' && asset.asset_url && (
                <AspectRatio ratio={(() => {
                  const [w, h] = (asset.aspect_ratio || '9:16').split(':').map(Number);
                  return w / h;
                })()}>
                  <VideoPlayer
                    src={asset.asset_url}
                    poster={asset.asset_url}
                    className="w-full h-full"
                  />
                </AspectRatio>
              )}
              {asset.asset_type === 'voice_note' && asset.asset_url && (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 rounded-lg p-6 space-y-4">
                  <div className="w-full">
                    <AudioPlayer src={asset.asset_url} />
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 fill-current" />
                Featured Bestie
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-black text-foreground flex-1">
                  {asset.bestie_name}
                </h2>
                <TextToSpeech text={`${asset.bestie_name}. ${asset.description}`} />
              </div>
              <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {asset.description}
              </p>
              {asset.asset_type === 'voice_note' && asset.asset_url && (
                <div className="space-y-2">
                  <AudioPlayer src={asset.asset_url} />
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
