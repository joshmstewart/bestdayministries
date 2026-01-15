/**
 * SINGLE SOURCE OF TRUTH for domain and email constants.
 * 
 * ⚠️ IMPORTANT: Our domain is bestdayministries.ORG (not .com!)
 * Always import from this file instead of hardcoding domains.
 */

// Primary domain - ALWAYS use .org
export const PRIMARY_DOMAIN = "bestdayministries.org";

// Email addresses - derived from primary domain
export const EMAILS = {
  noreply: `noreply@${PRIMARY_DOMAIN}`,
  support: `support@${PRIMARY_DOMAIN}`,
  info: `info@${PRIMARY_DOMAIN}`,
  contact: `contact@${PRIMARY_DOMAIN}`,
  notifications: `notifications@${PRIMARY_DOMAIN}`,
  orders: `orders@${PRIMARY_DOMAIN}`,
} as const;

// Full URLs
export const URLS = {
  main: `https://${PRIMARY_DOMAIN}`,
  www: `https://www.${PRIMARY_DOMAIN}`,
} as const;

// Coffee shop domain (separate domain)
export const COFFEE_SHOP_DOMAIN = "bestdayevercoffeeandcrepes.com";

// Organization name
export const ORGANIZATION_NAME = "Best Day Ministries";

/**
 * Get the public site URL based on current hostname.
 * Used for email links, redirects, etc.
 */
export const getPublicSiteUrl = (): string => {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return URLS.main;
  }

  const hostname = window.location.hostname;

  // If we're already on the primary domain, keep using it
  if (hostname === PRIMARY_DOMAIN || hostname === `www.${PRIMARY_DOMAIN}`) {
    return URLS.main;
  }

  // Coffee shop domains should still use primary domain for email links
  if (
    hostname === COFFEE_SHOP_DOMAIN ||
    hostname === `www.${COFFEE_SHOP_DOMAIN}`
  ) {
    return URLS.main;
  }

  // In preview/staging (or local dev), force the primary domain in email links
  if (
    hostname.endsWith(".lovable.app") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return URLS.main;
  }

  // Otherwise, default to the current origin
  return window.location.origin;
};

