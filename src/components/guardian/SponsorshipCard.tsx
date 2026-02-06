import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, DollarSign, Share2, Play, Pause } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import AudioPlayer from "@/components/AudioPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { format } from "date-fns";

interface TextSection {
  header: string;
  text: string;
}

interface Sponsorship {
  id: string;
  bestie_id: string;
  sponsor_bestie_id?: string;
  amount: number;
  frequency: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  stripe_subscription_id?: string | null;
  stripe_mode: string;
  is_shared?: boolean;
  shared_by?: string;
  stable_amount?: number;
  total_ending_amount?: number;
  bestie: {
    display_name: string;
    avatar_number: number;
  };
  featured_bestie?: {
    id: string;
    description: string;
    image_url: string;
    voice_note_url: string | null;
    monthly_goal: number;
    current_monthly_pledges: number;
    text_sections?: TextSection[];
  } | null;
}

interface SponsorshipCardProps {
  sponsorship: Sponsorship;
  isPlaying: boolean;
  onPlayAudio: (sponsorshipId: string) => void;
  onPauseAudio: () => void;
  onManageSubscription: (subscriptionId: string) => void;
  onChangeAmount: (sponsorshipId: string) => void;
  onShareAccess: (sponsorshipId: string) => void;
}

export function SponsorshipCard({
  sponsorship,
  isPlaying,
  onPlayAudio,
  onPauseAudio,
  onManageSubscription,
  onChangeAmount,
  onShareAccess,
}: SponsorshipCardProps) {
  const hasVoiceNote = sponsorship.featured_bestie?.voice_note_url;
  
  // Calculate TTS text from featured bestie content
  const getTTSText = () => {
    const parts = [sponsorship.bestie.display_name];
    if (sponsorship.featured_bestie?.description) {
      parts.push(sponsorship.featured_bestie.description);
    }
    if (sponsorship.featured_bestie?.text_sections) {
      sponsorship.featured_bestie.text_sections.forEach((section) => {
        if (section.header) parts.push(section.header);
        if (section.text) parts.push(section.text);
      });
    }
    return parts.join(". ");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sponsorship.featured_bestie?.image_url ? (
              <img
                src={sponsorship.featured_bestie.image_url}
                alt={sponsorship.bestie.display_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <AvatarDisplay displayName={sponsorship.bestie.display_name} size="lg" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{sponsorship.bestie.display_name}</CardTitle>
                <TextToSpeech text={getTTSText()} />
              </div>
              <CardDescription className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                ${sponsorship.amount}/{sponsorship.frequency === "monthly" ? "month" : "one-time"}
                {sponsorship.is_shared && (
                  <Badge variant="secondary" className="ml-2">Shared with you</Badge>
                )}
              </CardDescription>
            </div>
          </div>
          {sponsorship.stripe_mode === "test" && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Test Mode
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {sponsorship.featured_bestie?.description && (
          <p className="text-sm text-muted-foreground">
            {sponsorship.featured_bestie.description}
          </p>
        )}

        {/* Text Sections */}
        {sponsorship.featured_bestie?.text_sections && sponsorship.featured_bestie.text_sections.length > 0 && (
          <div className="space-y-3">
            {sponsorship.featured_bestie.text_sections.map((section, index) => (
              <div key={index} className="border-l-2 border-primary/30 pl-3">
                {section.header && (
                  <h4 className="font-medium text-sm">{section.header}</h4>
                )}
                {section.text && (
                  <p className="text-sm text-muted-foreground">{section.text}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voice Note */}
        {hasVoiceNote && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => isPlaying ? onPauseAudio() : onPlayAudio(sponsorship.id)}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play Voice Note
                </>
              )}
            </Button>
          </div>
        )}

        {/* Funding Progress */}
        {sponsorship.featured_bestie && sponsorship.featured_bestie.monthly_goal > 0 && (
          <div className="pt-2">
            <FundingProgressBar
              currentAmount={sponsorship.featured_bestie.current_monthly_pledges || 0}
              goalAmount={sponsorship.featured_bestie.monthly_goal}
              endingAmount={sponsorship.total_ending_amount || 0}
            />
          </div>
        )}

        {/* Sponsorship Details */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span>Started: {format(new Date(sponsorship.started_at), "MMM d, yyyy")}</span>
          {sponsorship.ended_at && (
            <span>• Ends: {format(new Date(sponsorship.ended_at), "MMM d, yyyy")}</span>
          )}
        </div>

        {/* Actions */}
        {!sponsorship.is_shared && (
          <div className="flex flex-wrap gap-2 pt-2">
            {sponsorship.stripe_subscription_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageSubscription(sponsorship.stripe_subscription_id!)}
              >
                Manage Subscription
              </Button>
            )}
            {sponsorship.frequency === "monthly" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeAmount(sponsorship.id)}
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Change Amount
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShareAccess(sponsorship.id)}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share Access
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
