// Central place to decide which public site URL should be used in outbound emails
// (password reset links, etc.).
//
// Goal: even when admins/testers trigger flows from the preview/staging domain,
// emails should send users to the primary custom domain.

const PRIMARY_DOMAIN = "bestdayministries.org";

export const getPublicSiteUrl = () => {
  const hostname = window.location.hostname;

  // If we're already on the primary domain, keep using it.
  if (hostname === PRIMARY_DOMAIN || hostname === `www.${PRIMARY_DOMAIN}`) {
    return `https://${PRIMARY_DOMAIN}`;
  }

  // Coffee shop domains should still use primary domain for email links
  if (
    hostname === "bestdayevercoffeeandcrepes.com" ||
    hostname === "www.bestdayevercoffeeandcrepes.com"
  ) {
    return `https://${PRIMARY_DOMAIN}`;
  }

  // In preview/staging (or local dev), force the primary domain in email links.
  if (
    hostname.endsWith(".lovable.app") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return `https://${PRIMARY_DOMAIN}`;
  }

  // Otherwise, default to the current origin.
  return window.location.origin;
};
