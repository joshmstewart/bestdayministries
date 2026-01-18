import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ArrowRight } from "lucide-react";

interface VendorBrandBannerProps {
  vendor: {
    id: string;
    business_name: string;
    logo_url: string | null;
    banner_image_url: string | null;
    description: string | null;
  };
  variant?: 'full' | 'compact';
}

export const VendorBrandBanner = ({ vendor, variant = 'full' }: VendorBrandBannerProps) => {
  if (variant === 'compact') {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Vendor Logo */}
            <div className="flex-shrink-0">
              {vendor.logo_url ? (
                <img 
                  src={vendor.logo_url} 
                  alt={vendor.business_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                  <Store className="w-7 h-7 text-primary" />
                </div>
              )}
            </div>

            {/* Vendor Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Sold by
              </p>
              <h3 className="font-heading font-bold text-lg truncate">
                {vendor.business_name}
              </h3>
            </div>

            {/* Visit Store Button */}
            <Button asChild size="lg" className="flex-shrink-0">
              <Link to={`/vendors/${vendor.id}`}>
                Visit Store
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant with banner
  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-primary/20">
      {/* Banner Background */}
      <div 
        className="h-24 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10"
        style={vendor.banner_image_url ? {
          backgroundImage: `url(${vendor.banner_image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      />

      {/* Content Overlay */}
      <div className="relative -mt-8 px-4 pb-4">
        <div className="flex items-end gap-4">
          {/* Vendor Logo */}
          <div className="flex-shrink-0">
            {vendor.logo_url ? (
              <img 
                src={vendor.logo_url} 
                alt={vendor.business_name}
                className="w-16 h-16 rounded-full object-cover border-4 border-background shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md">
                <Store className="w-8 h-8 text-primary" />
              </div>
            )}
          </div>

          {/* Vendor Info */}
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              From the shop of
            </p>
            <h3 className="font-heading font-bold text-xl truncate">
              {vendor.business_name}
            </h3>
          </div>

          {/* Visit Store Button */}
          <Button asChild size="lg" className="flex-shrink-0">
            <Link to={`/vendors/${vendor.id}`}>
              <Store className="mr-2 h-4 w-4" />
              Visit Full Store
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {vendor.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {vendor.description}
          </p>
        )}
      </div>
    </div>
  );
};
