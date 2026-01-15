/**
 * SINGLE SOURCE OF TRUTH for domain and email constants in Edge Functions.
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

// Organization name for emails
export const ORGANIZATION_NAME = "Best Day Ministries";

// Email sender display names
export const SENDERS = {
  notifications: `Notifications <${EMAILS.notifications}>`,
  community: `Community Notifications <${EMAILS.notifications}>`,
  noreply: `${ORGANIZATION_NAME} <${EMAILS.noreply}>`,
  store: `Joy House Store <${EMAILS.orders}>`,
  contact: `${ORGANIZATION_NAME} <${EMAILS.contact}>`,
} as const;
