import { getVendorTheme } from "@/lib/vendorThemePresets";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface VendorThemePreviewProps {
  themeKey: string;
}

export const VendorThemePreview = ({ themeKey }: VendorThemePreviewProps) => {
  const theme = getVendorTheme(themeKey);

  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-muted-foreground mb-3">Theme preview:</p>
      
      <div className="flex items-center gap-3 flex-wrap">
        {/* Banner preview */}
        <div 
          className="rounded-md px-3 py-2 flex items-center gap-2"
          style={{ 
            backgroundColor: theme.banner,
            color: theme.bannerText 
          }}
        >
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: theme.bannerText 
            }}
          >
            S
          </div>
          <span className="text-xs font-medium">Store Banner</span>
        </div>

        {/* Product card preview */}
        <div 
          className="rounded-md p-2 flex items-center gap-2"
          style={{ 
            borderColor: theme.cardBorder,
            borderWidth: '2px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.cardGlow
          }}
        >
          <div 
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: theme.sectionBg }}
          >
            <ShoppingBag className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <span className="text-xs font-medium">Product</span>
        </div>

        {/* Accent button */}
        <Button 
          type="button"
          size="sm"
          className="h-8 px-3 text-xs"
          style={{ 
            backgroundColor: theme.accent,
            color: theme.accentText 
          }}
        >
          Add to Cart
        </Button>

        {/* Outline button */}
        <Button 
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          style={{ 
            borderColor: theme.accent,
            color: theme.accent 
          }}
        >
          Details
        </Button>

        {/* Section bg swatch */}
        <div 
          className="w-8 h-8 rounded-md border flex items-center justify-center"
          style={{ backgroundColor: theme.sectionBg }}
          title="Section Background"
        >
          <span className="text-[8px] text-muted-foreground">BG</span>
        </div>
      </div>
    </div>
  );
};
