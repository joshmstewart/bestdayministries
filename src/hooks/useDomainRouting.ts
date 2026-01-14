import { useEffect, useState } from 'react';

// Primary domain that should be shown to users
const PRIMARY_DOMAIN = 'bestdayministries.org';

// Legacy domains that should redirect to primary
const LEGACY_DOMAINS = [
  'bestdayever.org',
  'www.bestdayever.org'
];

// Coffee shop domains
const COFFEE_SHOP_DOMAINS = [
  'bestdayevercoffeeandcrepes.com',
  'www.bestdayevercoffeeandcrepes.com'
];

// Joy House Store domains
const JOY_HOUSE_STORE_DOMAINS = [
  'joyhousestore.com',
  'www.joyhousestore.com'
];

/**
 * Hook to detect which domain the user is on and route accordingly
 * Also handles iframe breakout and legacy domain detection
 * 
 * CRITICAL: Coffee shop domains should redirect to bestdayministries.org/coffee-shop
 * to ensure users always see the latest content from our unified site.
 */
export const useDomainRouting = () => {
  const [isCoffeeShopDomain, setIsCoffeeShopDomain] = useState(false);
  const [isJoyHouseStoreDomain, setIsJoyHouseStoreDomain] = useState(false);
  const [isLegacyDomain, setIsLegacyDomain] = useState(false);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Coffee shop domain serves coffee-shop page directly
    // All other navigation from this domain should go to primary domain
    if (COFFEE_SHOP_DOMAINS.includes(hostname)) {
      setIsCoffeeShopDomain(true);
      // If user tries to navigate to a non-coffee-shop page, redirect to primary domain
      const path = window.location.pathname;
      if (path !== '/' && path !== '/coffee-shop') {
        window.location.href = `https://${PRIMARY_DOMAIN}${path}`;
        return;
      }
      return;
    }
    
    if (JOY_HOUSE_STORE_DOMAINS.includes(hostname)) {
      setIsJoyHouseStoreDomain(true);
      return;
    }
    
    // Check if we're on a legacy domain that should redirect
    if (LEGACY_DOMAINS.includes(hostname)) {
      setIsLegacyDomain(true);
      // Redirect to primary domain while preserving the path
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      window.location.href = `https://${PRIMARY_DOMAIN}${currentPath}`;
      return;
    }
    
    // Only attempt iframe breakout for the primary domain
    // This prevents issues with development/preview environments
    if (hostname === PRIMARY_DOMAIN || hostname === `www.${PRIMARY_DOMAIN}`) {
      try {
        if (window.self !== window.top) {
          // We're in an iframe on the primary domain - break out
          const currentPath = window.location.pathname + window.location.search + window.location.hash;
          window.top!.location.href = `https://${PRIMARY_DOMAIN}${currentPath}`;
          return;
        }
      } catch (e) {
        // Cross-origin iframe - can't access parent, just log and continue
        console.warn('Cross-origin iframe detected, cannot break out');
      }
    }
  }, []);
  
  return { isCoffeeShopDomain, isJoyHouseStoreDomain, isLegacyDomain };
};
