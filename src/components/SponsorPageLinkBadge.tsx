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
  const [sponsorLink, setSponsorLink] = useState<{ sponsorBestieId: string; bestieName: string } | null>(null);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    checkSponsorLink();
  }, [userId, userRole]);

  const checkSponsorLink = async () => {
    try {
      if (userRole === 'bestie') {
        // For besties: Check if they have an active sponsor bestie profile AND guardian allows showing it
        const { data: guardianLinks } = await supabase
          .from("caregiver_bestie_links")
          .select("show_sponsor_link_on_bestie")
          .eq("bestie_id", userId)
          .maybeSingle();

        // If guardian has disabled the link, don't show it
        if (guardianLinks && !guardianLinks.show_sponsor_link_on_bestie) {
          return;
        }

        // Find active sponsor bestie profile for this bestie
        const { data: sponsorBestie } = await supabase
          .from("sponsor_besties")
          .select("id, bestie_name, is_active, is_fully_funded")
          .eq("bestie_id", userId)
          .eq("is_active", true)
          .eq("is_fully_funded", false)
          .maybeSingle();

        if (sponsorBestie) {
          setSponsorLink({
            sponsorBestieId: sponsorBestie.id,
            bestieName: sponsorBestie.bestie_name
          });
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

        // Get sponsor profiles for all linked besties
        const bestieIds = bestieLinks.map(link => link.bestie_id);
        const { data: sponsorBesties } = await supabase
          .from("sponsor_besties")
          .select("id, bestie_id, bestie_name, is_active, is_fully_funded")
          .in("bestie_id", bestieIds)
          .eq("is_active", true)
          .eq("is_fully_funded", false)
          .limit(1); // Show first available sponsor link

        if (sponsorBesties && sponsorBesties.length > 0) {
          setSponsorLink({
            sponsorBestieId: sponsorBesties[0].id,
            bestieName: sponsorBesties[0].bestie_name
          });
          setShowLink(true);
        }
      }
    } catch (error) {
      console.error("Error checking sponsor link:", error);
    }
  };

  if (!showLink || !sponsorLink) {
    return null;
  }

  if (variant === "button") {
    return (
      <Link to={`/sponsor-bestie?bestie=${sponsorLink.sponsorBestieId}`}>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Heart className="w-4 h-4" />
          Sponsor {sponsorLink.bestieName}
        </Button>
      </Link>
    );
  }

  return (
    <Link to={`/sponsor-bestie?bestie=${sponsorLink.sponsorBestieId}`}>
      <Badge 
        variant="secondary" 
        className={`gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer ${className}`}
      >
        <Heart className="w-3 h-3" />
        Sponsor {sponsorLink.bestieName}
      </Badge>
    </Link>
  );
};
