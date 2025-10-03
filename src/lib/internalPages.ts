/**
 * Centralized list of internal pages for the application.
 * Update this list when adding new pages to automatically make them available
 * in all admin dropdowns (Navigation Bar, Footer Links, Quick Links, etc.)
 */

export interface InternalPage {
  value: string;
  label: string;
}

export const INTERNAL_PAGES: InternalPage[] = [
  { value: "/", label: "Home" },
  { value: "/community", label: "Community" },
  { value: "/discussions", label: "Discussions" },
  { value: "/events", label: "Events" },
  { value: "/gallery", label: "Albums" },
  { value: "/sponsor-bestie", label: "Sponsor a Bestie" },
  { value: "/about", label: "About/Resources" },
  { value: "/donate", label: "Donate" },
  { value: "/joy-rocks", label: "Joy Rocks Coffee" },
  { value: "/auth", label: "Login/Signup" },
  { value: "/profile", label: "Profile" },
  { value: "/guardian-links", label: "My Besties" },
  { value: "/guardian-approvals", label: "Guardian Approvals" },
  { value: "/admin", label: "Admin Panel" },
];
