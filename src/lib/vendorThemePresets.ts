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
  buttonGradient: string; // Monochromatic gradient for buttons
}

export const vendorThemePresets: VendorThemePreset[] = [
  {
    key: 'none',
    name: 'Default',
    // Uses actual site design system values from index.css
    swatch: 'hsl(24, 85%, 56%)', // Primary burnt orange - matches site accent
    banner: 'hsl(24, 85%, 56%)', // --primary
    bannerText: 'hsl(0, 0%, 100%)', // --primary-foreground (white)
    accent: 'hsl(24, 85%, 56%)', // --primary
    accentText: 'hsl(0, 0%, 100%)', // --primary-foreground
    cardBorder: 'hsl(20, 10%, 88%)', // --border
    cardBg: 'hsl(0, 0%, 100%)', // --card (white)
    cardGlow: '0 4px 24px -4px hsla(24, 85%, 56%, 0.2)', // Primary with transparency
    sectionBg: 'hsl(46, 35%, 96%)', // --muted (warm cream)
    buttonGradient: 'linear-gradient(135deg, hsl(24, 85%, 60%) 0%, hsl(24, 85%, 48%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(210, 100%, 55%) 0%, hsl(210, 100%, 40%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(145, 80%, 44%) 0%, hsl(145, 80%, 32%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(270, 80%, 60%) 0%, hsl(270, 80%, 45%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(0, 85%, 58%) 0%, hsl(0, 85%, 44%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(330, 85%, 64%) 0%, hsl(330, 85%, 50%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(175, 85%, 44%) 0%, hsl(175, 85%, 30%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(45, 100%, 55%) 0%, hsl(45, 95%, 40%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(240, 70%, 56%) 0%, hsl(240, 70%, 42%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(25, 65%, 48%) 0%, hsl(25, 65%, 34%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(215, 30%, 52%) 0%, hsl(215, 35%, 38%) 100%)',
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
    buttonGradient: 'linear-gradient(135deg, hsl(16, 95%, 64%) 0%, hsl(16, 95%, 50%) 100%)',
  },
];

// "none" means: do not apply any vendor-specific inline theme styles.
// Components should treat this as undefined and fall back to the app's normal design tokens.
export function getVendorThemeOptional(themeKey: string | null | undefined): VendorThemePreset | undefined {
  if (!themeKey || themeKey === 'none') return undefined;
  return getVendorTheme(themeKey);
}

export function getVendorTheme(themeKey: string | null | undefined): VendorThemePreset {
  const preset = vendorThemePresets.find(p => p.key === themeKey);
  return preset || vendorThemePresets[0]; // Default to orange
}
