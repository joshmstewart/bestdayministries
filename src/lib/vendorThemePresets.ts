// Vendor Store Theme Color Presets
// Each preset includes a full palette for consistent theming across the store page

export interface VendorThemePreset {
  key: string;
  name: string;
  // Primary swatch color for the picker
  swatch: string;
  // Full palette for store theming
  banner: string;         // Banner/header background
  bannerText: string;     // Text on banner
  accent: string;         // Accent color for buttons, borders
  accentText: string;     // Text on accent backgrounds
  cardBorder: string;     // Card border color
  cardBg: string;         // Card background tint
  sectionBg: string;      // Section background tint
}

export const vendorThemePresets: VendorThemePreset[] = [
  {
    key: 'orange',
    name: 'Sunset Orange',
    swatch: 'hsl(24, 85%, 55%)',
    banner: 'hsl(24, 85%, 50%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(24, 85%, 55%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(24, 60%, 80%)',
    cardBg: 'hsl(24, 60%, 97%)',
    sectionBg: 'hsl(24, 40%, 96%)',
  },
  {
    key: 'blue',
    name: 'Ocean Blue',
    swatch: 'hsl(210, 85%, 55%)',
    banner: 'hsl(210, 85%, 45%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(210, 85%, 55%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(210, 60%, 80%)',
    cardBg: 'hsl(210, 60%, 97%)',
    sectionBg: 'hsl(210, 40%, 96%)',
  },
  {
    key: 'green',
    name: 'Forest Green',
    swatch: 'hsl(145, 65%, 42%)',
    banner: 'hsl(145, 65%, 38%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(145, 65%, 42%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(145, 45%, 75%)',
    cardBg: 'hsl(145, 45%, 97%)',
    sectionBg: 'hsl(145, 30%, 96%)',
  },
  {
    key: 'purple',
    name: 'Royal Purple',
    swatch: 'hsl(270, 70%, 55%)',
    banner: 'hsl(270, 70%, 48%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(270, 70%, 55%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(270, 50%, 80%)',
    cardBg: 'hsl(270, 50%, 97%)',
    sectionBg: 'hsl(270, 35%, 96%)',
  },
  {
    key: 'red',
    name: 'Cherry Red',
    swatch: 'hsl(0, 75%, 55%)',
    banner: 'hsl(0, 75%, 48%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(0, 75%, 55%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(0, 55%, 82%)',
    cardBg: 'hsl(0, 55%, 97%)',
    sectionBg: 'hsl(0, 40%, 96%)',
  },
  {
    key: 'pink',
    name: 'Rose Pink',
    swatch: 'hsl(330, 70%, 60%)',
    banner: 'hsl(330, 70%, 52%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(330, 70%, 60%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(330, 50%, 82%)',
    cardBg: 'hsl(330, 50%, 97%)',
    sectionBg: 'hsl(330, 35%, 96%)',
  },
  {
    key: 'teal',
    name: 'Teal Wave',
    swatch: 'hsl(175, 70%, 42%)',
    banner: 'hsl(175, 70%, 36%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(175, 70%, 42%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(175, 50%, 75%)',
    cardBg: 'hsl(175, 50%, 97%)',
    sectionBg: 'hsl(175, 35%, 96%)',
  },
  {
    key: 'gold',
    name: 'Golden Hour',
    swatch: 'hsl(45, 90%, 50%)',
    banner: 'hsl(45, 85%, 42%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(45, 90%, 50%)',
    accentText: 'hsl(30, 50%, 20%)',
    cardBorder: 'hsl(45, 65%, 78%)',
    cardBg: 'hsl(45, 60%, 96%)',
    sectionBg: 'hsl(45, 45%, 95%)',
  },
  {
    key: 'indigo',
    name: 'Midnight Indigo',
    swatch: 'hsl(240, 60%, 50%)',
    banner: 'hsl(240, 60%, 42%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(240, 60%, 50%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(240, 45%, 78%)',
    cardBg: 'hsl(240, 45%, 97%)',
    sectionBg: 'hsl(240, 30%, 96%)',
  },
  {
    key: 'brown',
    name: 'Earthy Brown',
    swatch: 'hsl(25, 55%, 42%)',
    banner: 'hsl(25, 55%, 36%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(25, 55%, 42%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(25, 40%, 75%)',
    cardBg: 'hsl(25, 35%, 96%)',
    sectionBg: 'hsl(25, 25%, 95%)',
  },
  {
    key: 'slate',
    name: 'Modern Slate',
    swatch: 'hsl(215, 20%, 45%)',
    banner: 'hsl(215, 25%, 35%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(215, 20%, 45%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(215, 15%, 75%)',
    cardBg: 'hsl(215, 15%, 97%)',
    sectionBg: 'hsl(215, 10%, 96%)',
  },
  {
    key: 'coral',
    name: 'Coral Reef',
    swatch: 'hsl(16, 80%, 62%)',
    banner: 'hsl(16, 80%, 55%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(16, 80%, 62%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(16, 60%, 82%)',
    cardBg: 'hsl(16, 55%, 97%)',
    sectionBg: 'hsl(16, 40%, 96%)',
  },
];

export function getVendorTheme(themeKey: string | null | undefined): VendorThemePreset {
  const preset = vendorThemePresets.find(p => p.key === themeKey);
  return preset || vendorThemePresets[0]; // Default to orange
}
