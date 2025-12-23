/**
 * Centralized list of internal pages for the application.
 * 
 * ⚠️ IMPORTANT: When adding a new route to App.tsx, you MUST add it here!
 * 
 * This list is used in all admin dropdowns:
 * - Navigation Bar Manager
 * - Footer Links Manager  
 * - Quick Links Manager
 * - Featured Items Manager
 * 
 * Adding pages here makes them immediately available across all admin interfaces.
 */

export interface InternalPage {
  value: string;
  label: string;
}

export const INTERNAL_PAGES: InternalPage[] = [
  { value: "/", label: "Landing Page" },
  { value: "/community", label: "Community" },
  { value: "/discussions", label: "Discussions" },
  { value: "/events", label: "Events" },
  { value: "/gallery", label: "Albums" },
  { value: "/videos", label: "Videos" },
  { value: "/sponsor-bestie", label: "Sponsor a Bestie" },
  { value: "/about", label: "About/Resources" },
  { value: "/ambassador", label: "Meet Our Ambassador" },
  { value: "/support", label: "Support Us" },
  { value: "/joy-rocks", label: "Joy Rocks Coffee" },
  { value: "/coffee-shop", label: "Coffee Shop" },
  { value: "/partners", label: "Partners" },
  { value: "/marketplace", label: "Marketplace" },
  { value: "/orders", label: "Order History" },
  { value: "/auth", label: "Login/Signup" },
  { value: "/vendor-auth", label: "Vendor Application" },
  { value: "/vendor-dashboard", label: "Vendor Dashboard" },
  { value: "/profile", label: "Profile" },
  { value: "/guardian-links", label: "My Besties" },
  { value: "/guardian-approvals", label: "Guardian Approvals" },
  { value: "/bestie-messages", label: "Bestie Messages" },
  { value: "/help", label: "Help Center" },
  { value: "/newsletter", label: "Newsletter" },
  { value: "/notifications", label: "Notifications" },
  { value: "/games/memory-match", label: "Memory Match Game" },
  { value: "/games/match3", label: "Match-3 Game" },
  { value: "/games/drink-creator", label: "Drink Creator" },
  { value: "/virtual-pet", label: "Virtual Pet" },
  { value: "/store", label: "JoyCoins Store" },
  { value: "/admin", label: "Admin Panel" },
];
