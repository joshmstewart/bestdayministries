import { Button } from "@/components/ui/button";
import { PRIMARY_DOMAIN } from "@/lib/domainConstants";
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Mail, 
  Copy, 
  Check,
  MessageCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonsProps {
  title: string;
  description?: string;
  url?: string;
  hashtags?: string[];
  via?: string;
  image?: string;
  compact?: boolean;
  eventId?: string; // For dynamic social media previews
  newsletterId?: string; // For dynamic newsletter social media previews
}

export const ShareButtons = ({
  title,
  description = "",
  url,
  hashtags = [],
  via = "JoyHouseCommunity",
  image,
  compact = false,
  eventId,
  newsletterId,
}: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  
  // Use current URL if not provided
  const shareUrl = url || window.location.href;
  
  // For social media platforms (Facebook, LinkedIn), use edge function URL for rich previews
  const getSocialShareUrl = () => {
    const shareBase = `https://${PRIMARY_DOMAIN}/share`;
    const redirectUrl = encodeURIComponent(shareUrl);
    if (eventId) {
      return `${shareBase}?eventId=${eventId}&redirect=${redirectUrl}`;
    }
    if (newsletterId) {
      return `${shareBase}?newsletterId=${newsletterId}&redirect=${redirectUrl}`;
    }
    return shareUrl;
  };
  
  const socialShareUrl = getSocialShareUrl();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedSocialUrl = encodeURIComponent(socialShareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.join(',');

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error occurred - silently ignore
      }
    } else {
      // Fallback to copy link if Web Share API not supported
      handleCopyLink();
    }
  };

  // Use social share URL (with meta tags) for platforms that scrape OG tags
  // Use regular URL for platforms that don't need OG scraping (Twitter uses its own cards, email/whatsapp show raw text)
  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}${via ? `&via=${via}` : ''}${hashtagString ? `&hashtags=${hashtagString}` : ''}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedSocialUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedSocialUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.twitter, '_blank')}>
            <Twitter className="w-4 h-4 mr-2" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.facebook, '_blank')}>
            <Facebook className="w-4 h-4 mr-2" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.linkedin, '_blank')}>
            <Linkedin className="w-4 h-4 mr-2" />
            LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(shareLinks.whatsapp, '_blank')}>
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = shareLinks.email}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground font-medium">Share:</span>
      
      {/* Native Share (mobile) */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        className="gap-2 md:hidden"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      {/* Desktop share buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(shareLinks.twitter, '_blank')}
          className="gap-2"
        >
          <Twitter className="w-4 h-4" />
          Twitter
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(shareLinks.facebook, '_blank')}
          className="gap-2"
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(shareLinks.linkedin, '_blank')}
          className="gap-2"
        >
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
};

// Compact icon-only version for tight spaces
interface ShareIconButtonProps {
  title: string;
  description?: string;
  url?: string;
  hashtags?: string[];
  className?: string;
}

export const ShareIconButton = ({ 
  title, 
  description, 
  url, 
  hashtags,
  className = "" 
}: ShareIconButtonProps) => {
  return (
    <ShareButtons
      title={title}
      description={description}
      url={url}
      hashtags={hashtags}
      compact={true}
    />
  );
};
