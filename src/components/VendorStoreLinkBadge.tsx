import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VendorStoreLinkBadgeProps {
  userId: string;
  userRole?: string;
  variant?: "button" | "badge";
  className?: string;
}

export const VendorStoreLinkBadge = ({ 
  userId,
  userRole,
  variant = "badge",
  className = "" 
}: VendorStoreLinkBadgeProps) => {
  const [vendorLink, setVendorLink] = useState<{ vendorId: string; businessName: string } | null>(null);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    checkVendorLink();
  }, [userId, userRole]);

  const checkVendorLink = async () => {
    try {
      if (userRole === 'bestie') {
        // For besties: Check if they have an approved vendor link AND guardian allows showing it
        const { data: guardianLinks } = await supabase
          .from("caregiver_bestie_links")
          .select("show_vendor_link_on_bestie")
          .eq("bestie_id", userId)
          .maybeSingle();

        // If guardian has disabled the link, don't show it
        if (guardianLinks && !guardianLinks.show_vendor_link_on_bestie) {
          return;
        }

        // Find approved vendor link for this bestie
        const { data: vendorRequest } = await supabase
          .from("vendor_bestie_requests")
          .select(`
            vendor_id,
            vendor:vendors!inner(
              id,
              business_name,
              status
            )
          `)
          .eq("bestie_id", userId)
          .eq("status", "approved")
          .eq("vendor.status", "approved")
          .maybeSingle();

        if (vendorRequest && vendorRequest.vendor) {
          setVendorLink({
            vendorId: vendorRequest.vendor.id,
            businessName: vendorRequest.vendor.business_name
          });
          setShowLink(true);
        }
      } else if (userRole === 'caregiver') {
        // For guardians: Show vendor links for their linked besties (if enabled)
        const { data: bestieLinks } = await supabase
          .from("caregiver_bestie_links")
          .select("bestie_id, show_vendor_link_on_guardian")
          .eq("caregiver_id", userId)
          .eq("show_vendor_link_on_guardian", true);

        if (!bestieLinks || bestieLinks.length === 0) {
          return;
        }

        // Get vendor links for all linked besties
        const bestieIds = bestieLinks.map(link => link.bestie_id);
        const { data: vendorRequests } = await supabase
          .from("vendor_bestie_requests")
          .select(`
            vendor_id,
            bestie_id,
            vendor:vendors!inner(
              id,
              business_name,
              status
            )
          `)
          .in("bestie_id", bestieIds)
          .eq("status", "approved")
          .eq("vendor.status", "approved")
          .limit(1); // Show first available vendor link

        if (vendorRequests && vendorRequests.length > 0 && vendorRequests[0].vendor) {
          setVendorLink({
            vendorId: vendorRequests[0].vendor.id,
            businessName: vendorRequests[0].vendor.business_name
          });
          setShowLink(true);
        }
      }
    } catch (error) {
      console.error("Error checking vendor link:", error);
    }
  };

  if (!showLink || !vendorLink) {
    return null;
  }

  if (variant === "button") {
    return (
      <Link to={`/vendors/${vendorLink.vendorId}`}>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Store className="w-4 h-4" />
          Visit {vendorLink.businessName}
        </Button>
      </Link>
    );
  }

  return (
    <Link to={`/vendors/${vendorLink.vendorId}`}>
      <Badge 
        variant="secondary" 
        className={`gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer ${className}`}
      >
        <Store className="w-3 h-3" />
        {vendorLink.businessName}
      </Badge>
    </Link>
  );
};
