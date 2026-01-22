import { getVendorTheme } from "@/lib/vendorThemePresets";

interface VendorThemePreviewProps {
  themeKey: string;
}

export const VendorThemePreview = ({ themeKey }: VendorThemePreviewProps) => {
  const theme = getVendorTheme(themeKey);

  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-muted-foreground mb-3">Theme preview:</p>
      
      <div className="flex items-center gap-3 flex-wrap">
        {/* Page background swatch */}
        <div 
          className="rounded-md px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: theme.sectionBg }}
          title="Page Background"
        >
          <span className="text-xs font-medium text-foreground">Page BG</span>
        </div>

        {/* Vendor info card preview - matches the actual store header */}
        <div 
          className="rounded-md px-3 py-2 flex items-center gap-2 border-2"
          style={{ 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardGlow
          }}
          title="Vendor Info Card"
        >
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <span style={{ color: theme.accent }}>V</span>
          </div>
          <span className="text-xs font-medium">Store Card</span>
        </div>

        {/* Story card preview - has the colored border */}
        <div 
          className="rounded-md px-3 py-2 border-2"
          style={{ 
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder
          }}
          title="Story Media Card"
        >
          <span className="text-xs font-medium">Story Card</span>
        </div>

        {/* Price text in accent color */}
        <div className="flex items-center gap-1" title="Product Price">
          <span className="text-sm font-bold" style={{ color: theme.accent }}>$19.99</span>
        </div>

        {/* Accent button - styled like it would appear on the store */}
        <div 
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ 
            backgroundColor: theme.accent,
            color: theme.accentText 
          }}
          title="Accent Button"
        >
          Button
        </div>

        {/* Outline button using accent */}
        <div 
          className="rounded-md px-3 py-1.5 text-xs font-medium border"
          style={{ 
            borderColor: theme.accent,
            color: theme.accent,
            backgroundColor: 'transparent'
          }}
          title="Outline Button"
        >
          Outline
        </div>
      </div>
    </div>
  );
};
