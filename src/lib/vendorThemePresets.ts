// Vendor Store Theme Color Presets
// Each preset includes a full palette for consistent theming across the store page
// BRIGHTENED colors for more vibrant theming

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
  cardBorder: string;     // Card border color - MORE SATURATED
  cardBg: string;         // Card background tint
  cardGlow: string;       // Card glow/shadow effect
  sectionBg: string;      // Section background tint
}

export const vendorThemePresets: VendorThemePreset[] = [
  {
    key: 'orange',
    name: 'Sunset Orange',
    swatch: 'hsl(24, 100%, 50%)',
    banner: 'hsl(24, 100%, 50%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(24, 100%, 50%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(24, 90%, 65%)',
    cardBg: 'hsl(24, 100%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(24, 100%, 50%, 0.4)',
    sectionBg: 'hsl(24, 70%, 94%)',
  },
  {
    key: 'blue',
    name: 'Ocean Blue',
    swatch: 'hsl(210, 100%, 50%)',
    banner: 'hsl(210, 100%, 45%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(210, 100%, 50%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(210, 90%, 60%)',
    cardBg: 'hsl(210, 100%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(210, 100%, 50%, 0.4)',
    sectionBg: 'hsl(210, 70%, 93%)',
  },
  {
    key: 'green',
    name: 'Forest Green',
    swatch: 'hsl(145, 80%, 38%)',
    banner: 'hsl(145, 80%, 35%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(145, 80%, 38%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(145, 65%, 55%)',
    cardBg: 'hsl(145, 70%, 96%)',
    cardGlow: '0 4px 24px -4px hsla(145, 80%, 38%, 0.4)',
    sectionBg: 'hsl(145, 50%, 92%)',
  },
  {
    key: 'purple',
    name: 'Royal Purple',
    swatch: 'hsl(270, 80%, 55%)',
    banner: 'hsl(270, 80%, 48%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(270, 80%, 55%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(270, 65%, 65%)',
    cardBg: 'hsl(270, 70%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(270, 80%, 55%, 0.4)',
    sectionBg: 'hsl(270, 50%, 94%)',
  },
  {
    key: 'red',
    name: 'Cherry Red',
    swatch: 'hsl(0, 85%, 52%)',
    banner: 'hsl(0, 85%, 48%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(0, 85%, 52%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(0, 70%, 65%)',
    cardBg: 'hsl(0, 80%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(0, 85%, 52%, 0.4)',
    sectionBg: 'hsl(0, 55%, 94%)',
  },
  {
    key: 'pink',
    name: 'Rose Pink',
    swatch: 'hsl(330, 85%, 58%)',
    banner: 'hsl(330, 85%, 52%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(330, 85%, 58%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(330, 70%, 70%)',
    cardBg: 'hsl(330, 75%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(330, 85%, 58%, 0.4)',
    sectionBg: 'hsl(330, 55%, 94%)',
  },
  {
    key: 'teal',
    name: 'Teal Wave',
    swatch: 'hsl(175, 85%, 38%)',
    banner: 'hsl(175, 85%, 34%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(175, 85%, 38%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(175, 65%, 55%)',
    cardBg: 'hsl(175, 70%, 96%)',
    cardGlow: '0 4px 24px -4px hsla(175, 85%, 38%, 0.4)',
    sectionBg: 'hsl(175, 50%, 92%)',
  },
  {
    key: 'gold',
    name: 'Golden Hour',
    swatch: 'hsl(45, 100%, 50%)',
    banner: 'hsl(45, 95%, 45%)',
    bannerText: 'hsl(30, 50%, 15%)',
    accent: 'hsl(45, 100%, 50%)',
    accentText: 'hsl(30, 50%, 15%)',
    cardBorder: 'hsl(45, 85%, 58%)',
    cardBg: 'hsl(45, 90%, 96%)',
    cardGlow: '0 4px 24px -4px hsla(45, 100%, 50%, 0.4)',
    sectionBg: 'hsl(45, 65%, 92%)',
  },
  {
    key: 'indigo',
    name: 'Midnight Indigo',
    swatch: 'hsl(240, 70%, 50%)',
    banner: 'hsl(240, 70%, 42%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(240, 70%, 50%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(240, 55%, 62%)',
    cardBg: 'hsl(240, 60%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(240, 70%, 50%, 0.4)',
    sectionBg: 'hsl(240, 45%, 94%)',
  },
  {
    key: 'brown',
    name: 'Earthy Brown',
    swatch: 'hsl(25, 65%, 42%)',
    banner: 'hsl(25, 65%, 36%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(25, 65%, 42%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(25, 50%, 60%)',
    cardBg: 'hsl(25, 50%, 96%)',
    cardGlow: '0 4px 24px -4px hsla(25, 65%, 42%, 0.35)',
    sectionBg: 'hsl(25, 40%, 93%)',
  },
  {
    key: 'slate',
    name: 'Modern Slate',
    swatch: 'hsl(215, 30%, 45%)',
    banner: 'hsl(215, 35%, 35%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(215, 30%, 45%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(215, 25%, 60%)',
    cardBg: 'hsl(215, 25%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(215, 30%, 45%, 0.3)',
    sectionBg: 'hsl(215, 20%, 94%)',
  },
  {
    key: 'coral',
    name: 'Coral Reef',
    swatch: 'hsl(16, 95%, 58%)',
    banner: 'hsl(16, 95%, 52%)',
    bannerText: 'hsl(0, 0%, 100%)',
    accent: 'hsl(16, 95%, 58%)',
    accentText: 'hsl(0, 0%, 100%)',
    cardBorder: 'hsl(16, 80%, 68%)',
    cardBg: 'hsl(16, 85%, 97%)',
    cardGlow: '0 4px 24px -4px hsla(16, 95%, 58%, 0.4)',
    sectionBg: 'hsl(16, 60%, 94%)',
  },
];

export function getVendorTheme(themeKey: string | null | undefined): VendorThemePreset {
  const preset = vendorThemePresets.find(p => p.key === themeKey);
  return preset || vendorThemePresets[0]; // Default to orange
}
