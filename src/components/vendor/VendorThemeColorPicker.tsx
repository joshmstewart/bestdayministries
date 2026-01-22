import { vendorThemePresets, VendorThemePreset } from "@/lib/vendorThemePresets";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface VendorThemeColorPickerProps {
  value: string;
  onChange: (themeKey: string) => void;
}

export const VendorThemeColorPicker = ({ value, onChange }: VendorThemeColorPickerProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose a color theme for your store page
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {vendorThemePresets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(preset.key)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105",
              value === preset.key
                ? "border-foreground shadow-md"
                : "border-transparent hover:border-muted-foreground/30"
            )}
            title={preset.name}
          >
            {/* Color swatch */}
            <div
              className="w-10 h-10 rounded-full shadow-inner ring-1 ring-black/10 flex items-center justify-center"
              style={{ backgroundColor: preset.swatch }}
            >
              {value === preset.key && (
                <Check className="h-5 w-5 text-white drop-shadow-md" />
              )}
            </div>
            {/* Color name */}
            <span className="text-xs font-medium text-center leading-tight truncate w-full">
              {preset.name.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
