import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SponsorPageLinkBadgeProps {
  userId: string;
  userRole?: string;
  variant?: "button" | "badge";
  className?: string;
}

export const SponsorPageLinkBadge = ({ 
  userId,
  userRole,
  variant = "badge",
  className = "" 
}: SponsorPageLinkBadgeProps) => {
  const [hasActiveSponsorPost, setHasActiveSponsorPost] = useState(false);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    checkSponsorLink();
  }, [userId, userRole]);

  const checkSponsorLink = async () => {
    try {
      if (userRole === 'bestie') {
        // For besties: Check if they have an approved sponsor link AND guardian allows showing it
        const { data: guardianLinks } = await supabase
          .from("caregiver_bestie_links")
          .select("show_sponsor_link_on_bestie")
          .eq("bestie_id", userId)
          .maybeSingle();

        // If guardian has disabled the link, don't show it
        if (guardianLinks && !guardianLinks.show_sponsor_link_on_bestie) {
          return;
        }

        // Check if bestie has an active sponsor post
        const { data: sponsorPost } = await supabase
          .from("sponsor_besties")
          .select("id, is_active, is_fully_funded")
          .eq("bestie_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (sponsorPost) {
          setHasActiveSponsorPost(true);
          setShowLink(true);
        }
      } else if (userRole === 'caregiver') {
        // For guardians: Show sponsor links for their linked besties (if enabled)
        const { data: bestieLinks } = await supabase
          .from("caregiver_bestie_links")
          .select("bestie_id, show_sponsor_link_on_guardian")
          .eq("caregiver_id", userId)
          .eq("show_sponsor_link_on_guardian", true);

        if (!bestieLinks || bestieLinks.length === 0) {
          return;
        }

        // Check if any linked bestie has an active sponsor post
        const bestieIds = bestieLinks.map(link => link.bestie_id);
        const { data: sponsorPosts } = await supabase
          .from("sponsor_besties")
          .select("id, is_active")
          .in("bestie_id", bestieIds)
          .eq("is_active", true)
          .limit(1);

        if (sponsorPosts && sponsorPosts.length > 0) {
          setHasActiveSponsorPost(true);
          setShowLink(true);
        }
      }
    } catch (error) {
      console.error("Error checking sponsor link:", error);
    }
  };

  if (!showLink || !hasActiveSponsorPost) {
    return null;
  }

  if (variant === "button") {
    return (
      <Link to="/sponsor-bestie">
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Heart className="w-4 h-4" />
          Sponsor Page
        </Button>
      </Link>
    );
  }

  return (
    <Link to="/sponsor-bestie">
      <Badge 
        variant="secondary" 
        className={`gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer ${className}`}
      >
        <Heart className="w-3 h-3" />
        Sponsor Page
      </Badge>
    </Link>
  );
};
