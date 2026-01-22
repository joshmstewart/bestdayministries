import { getVendorTheme } from "@/lib/vendorThemePresets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Star, Heart } from "lucide-react";

interface VendorThemePreviewProps {
  themeKey: string;
}

export const VendorThemePreview = ({ themeKey }: VendorThemePreviewProps) => {
  const theme = getVendorTheme(themeKey);

  return (
    <div className="space-y-4 mt-6">
      <p className="text-sm font-medium text-muted-foreground">Preview how your theme looks:</p>
      
      <div className="space-y-4">
        {/* Banner preview */}
        <div 
          className="rounded-lg p-4 flex items-center gap-3"
          style={{ 
            backgroundColor: theme.banner,
            color: theme.bannerText 
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: theme.bannerText 
            }}
          >
            S
          </div>
          <div>
            <p className="font-semibold">Your Store Banner</p>
            <p className="text-sm opacity-80">This is how your header will appear</p>
          </div>
        </div>

        {/* Example product cards */}
        <div 
          className="rounded-lg p-4"
          style={{ backgroundColor: theme.sectionBg }}
        >
          <div className="grid grid-cols-2 gap-3">
            {/* Product card 1 */}
            <Card 
              className="overflow-hidden"
              style={{ 
                borderColor: theme.cardBorder,
                borderWidth: '2px',
                backgroundColor: theme.cardBg,
                boxShadow: theme.cardGlow
              }}
            >
              <CardContent className="p-3">
                <div 
                  className="aspect-square rounded-md mb-2 flex items-center justify-center"
                  style={{ backgroundColor: theme.sectionBg }}
                >
                  <ShoppingBag 
                    className="w-8 h-8" 
                    style={{ color: theme.accent }} 
                  />
                </div>
                <p className="text-sm font-medium truncate">Product Name</p>
                <p className="text-xs text-muted-foreground">$24.99</p>
              </CardContent>
            </Card>

            {/* Product card 2 */}
            <Card 
              className="overflow-hidden"
              style={{ 
                borderColor: theme.cardBorder,
                borderWidth: '2px',
                backgroundColor: theme.cardBg,
                boxShadow: theme.cardGlow
              }}
            >
              <CardContent className="p-3">
                <div 
                  className="aspect-square rounded-md mb-2 flex items-center justify-center"
                  style={{ backgroundColor: theme.sectionBg }}
                >
                  <Heart 
                    className="w-8 h-8" 
                    style={{ color: theme.accent }} 
                  />
                </div>
                <p className="text-sm font-medium truncate">Another Item</p>
                <p className="text-xs text-muted-foreground">$19.99</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Button examples */}
        <div className="flex flex-wrap gap-2">
          <Button 
            type="button"
            size="sm"
            style={{ 
              backgroundColor: theme.accent,
              color: theme.accentText 
            }}
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Add to Cart
          </Button>
          <Button 
            type="button"
            variant="outline"
            size="sm"
            style={{ 
              borderColor: theme.accent,
              color: theme.accent 
            }}
          >
            <Star className="w-4 h-4 mr-1.5" />
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};
