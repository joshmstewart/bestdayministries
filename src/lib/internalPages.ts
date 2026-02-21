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
  // Public Pages
  { value: "/", label: "Landing Page" },
  { value: "/about", label: "About/Resources" },
  { value: "/ambassador", label: "Meet Our Ambassador" },
  { value: "/support", label: "Support Us" },
  { value: "/joy-rocks", label: "Joy Rocks Coffee" },
  { value: "/coffee-shop", label: "Coffee Shop" },
  { value: "/joy-house-stores", label: "Joy House Stores" },
  { value: "/partners", label: "Partners" },
  { value: "/terms", label: "Terms of Service" },
  { value: "/privacy", label: "Privacy Policy" },
  { value: "/install", label: "Install App" },
  
  // Community Features
  { value: "/community", label: "Community" },
  { value: "/discussions", label: "Discussions" },
  { value: "/prayer-requests", label: "Prayer Requests" },
  { value: "/events", label: "Events" },
  { value: "/gallery", label: "Albums" },
  { value: "/videos", label: "Videos" },
  
  // Sponsorship
  { value: "/sponsor-bestie", label: "Sponsor a Bestie" },
  { value: "/sponsorship-success", label: "Sponsorship Success" },
  { value: "/bike-ride-pledge", label: "Bike Ride Fundraiser" },
  
  // Marketplace
  { value: "/joyhousestore", label: "Joy House Store" },
  { value: "/orders", label: "Order History" },
  { value: "/checkout-success", label: "Checkout Success" },
  
  // User Management
  { value: "/auth", label: "Login/Signup" },
  { value: "/profile", label: "Profile" },
  { value: "/donation-history", label: "Donation History" },
  { value: "/notifications", label: "Notifications" },
  { value: "/newsletter", label: "Newsletter Signup" },
  { value: "/newsletters", label: "Newsletter Archive" },
  
  // Guardian/Bestie
  { value: "/guardian-links", label: "My Besties" },
  { value: "/guardian-approvals", label: "Guardian Approvals" },
  { value: "/guardian-resources", label: "Guardian Resources" },
  { value: "/bestie-messages", label: "Bestie Messages" },
  { value: "/moderation", label: "Moderation Queue" },
  
  // Vendor
  { value: "/vendor-auth", label: "Vendor Application" },
  { value: "/vendor-dashboard", label: "Vendor Dashboard" },
  
  // Games & Fun
  { value: "/games/memory-match", label: "Memory Match Game" },
  { value: "/games/match3", label: "Match-3 Game" },
  { value: "/games/drink-creator", label: "Drink Creator" },
  { value: "/games/recipe-gallery", label: "Recipe Pal" },
  { value: "/games/recipe-maker", label: "Recipe Maker (→Recipe Pal)" },
  { value: "/games/coloring-book", label: "Coloring Book" },
  { value: "/games/daily-five", label: "Daily Five" },
  { value: "/chore-chart", label: "Chore Chart" },
  { value: "/virtual-pet", label: "Virtual Pet" },
  { value: "/sticker-album", label: "Sticker Album" },
  { value: "/store", label: "Coin Shop" },
  { value: "/chore-challenge-gallery", label: "Chore Challenge Gallery" },
  { value: "/games/beat-pad", label: "Beat Pad" },
  { value: "/games/cash-register", label: "Cash Register" },
  { value: "/games/jokes", label: "Jokes" },
  { value: "/games/card-creator", label: "Card Creator" },
  
  // Health & Wellness
  { value: "/workout-tracker", label: "Workout Tracker" },
  { value: "/daily-fortune", label: "Daily Fortune" },
  { value: "/games/emotion-journal", label: "Mood Tracker" },
  
  // Help & Support
  { value: "/help", label: "Help Center" },
  
  // Admin
  { value: "/admin", label: "Admin Panel" },
];
