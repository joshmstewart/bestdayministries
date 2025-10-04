import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VendorStoreLinkBadgeProps {
  bestieId: string;
  variant?: "button" | "badge";
  className?: string;
}

export const VendorStoreLinkBadge = ({ 
  bestieId, 
  variant = "badge",
  className = "" 
}: VendorStoreLinkBadgeProps) => {
  const [vendorLink, setVendorLink] = useState<{ vendorId: string; businessName: string } | null>(null);
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    checkVendorLink();
  }, [bestieId]);

  const checkVendorLink = async () => {
    try {
      // Check if bestie has an approved vendor link AND guardian allows showing it
      const { data: guardianLinks } = await supabase
        .from("caregiver_bestie_links")
        .select("show_vendor_link")
        .eq("bestie_id", bestieId)
        .maybeSingle();

      // If guardian has disabled the link, don't show it
      if (guardianLinks && !guardianLinks.show_vendor_link) {
        return;
      }

      // Find approved vendor link
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
        .eq("bestie_id", bestieId)
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
