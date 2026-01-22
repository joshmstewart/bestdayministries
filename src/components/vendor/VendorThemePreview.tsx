import { getVendorTheme } from "@/lib/vendorThemePresets";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface VendorThemePreviewProps {
  themeKey: string;
}

export const VendorThemePreview = ({ themeKey }: VendorThemePreviewProps) => {
  const theme = getVendorTheme(themeKey);

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Theme preview:</p>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mini banner */}
        <div 
          className="rounded px-2 py-1 flex items-center gap-1.5"
          style={{ 
            backgroundColor: theme.banner,
            color: theme.bannerText 
          }}
        >
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: theme.bannerText 
            }}
          >
            S
          </div>
          <span className="text-[10px] font-medium">Banner</span>
        </div>

        {/* Mini product card */}
        <div 
          className="rounded p-1.5 flex items-center gap-1"
          style={{ 
            borderColor: theme.cardBorder,
            borderWidth: '1px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.cardGlow
          }}
        >
          <div 
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: theme.sectionBg }}
          >
            <ShoppingBag className="w-3 h-3" style={{ color: theme.accent }} />
          </div>
          <span className="text-[9px]">Card</span>
        </div>

        {/* Mini accent button */}
        <Button 
          type="button"
          size="sm"
          className="h-5 px-2 text-[9px]"
          style={{ 
            backgroundColor: theme.accent,
            color: theme.accentText 
          }}
        >
          Button
        </Button>

        {/* Mini outline button */}
        <Button 
          type="button"
          variant="outline"
          size="sm"
          className="h-5 px-2 text-[9px]"
          style={{ 
            borderColor: theme.accent,
            color: theme.accent 
          }}
        >
          Outline
        </Button>

        {/* Section bg swatch */}
        <div 
          className="w-5 h-5 rounded border"
          style={{ backgroundColor: theme.sectionBg }}
          title="Section Background"
        />
      </div>
    </div>
  );
};
