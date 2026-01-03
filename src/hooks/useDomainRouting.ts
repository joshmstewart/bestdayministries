import { useEffect, useState } from 'react';

// Primary domain that should be shown to users
const PRIMARY_DOMAIN = 'bestdayministries.org';

// Legacy domains that should redirect to primary
const LEGACY_DOMAINS = [
  'bestdayever.org',
  'www.bestdayever.org'
];

/**
 * Hook to detect which domain the user is on and route accordingly
 * Also handles iframe breakout and legacy domain detection
 */
export const useDomainRouting = () => {
  const [isCoffeeShopDomain, setIsCoffeeShopDomain] = useState(false);
  const [isJoyHouseStoreDomain, setIsJoyHouseStoreDomain] = useState(false);
  const [isLegacyDomain, setIsLegacyDomain] = useState(false);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Check if we're embedded in an iframe from a different domain
    // If so, break out to our real domain
    try {
      if (window.self !== window.top) {
        // We're in an iframe - redirect the top-level window to our domain
        const currentPath = window.location.pathname + window.location.search;
        window.top!.location.href = `https://${PRIMARY_DOMAIN}${currentPath}`;
        return;
      }
    } catch (e) {
      // Cross-origin iframe access blocked - try to break out anyway
      try {
        const currentPath = window.location.pathname + window.location.search;
        window.top!.location.href = `https://${PRIMARY_DOMAIN}${currentPath}`;
        return;
      } catch (redirectError) {
        console.warn('Unable to break out of iframe:', redirectError);
      }
    }
    
    // Check if we're on a legacy domain that should redirect
    if (LEGACY_DOMAINS.includes(hostname)) {
      setIsLegacyDomain(true);
      // Redirect to primary domain while preserving the path
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `https://${PRIMARY_DOMAIN}${currentPath}`;
      return;
    }
    
    // Check if we're on the coffee shop domain
    const coffeeShopDomains = [
      'bestdayevercoffeeandcrepes.com',
      'www.bestdayevercoffeeandcrepes.com'
    ];
    
    // Check if we're on the Joy House Store domain (add the actual domain when known)
    const joyHouseStoreDomains = [
      'joyhousestore.com',
      'www.joyhousestore.com'
    ];
    
    setIsCoffeeShopDomain(coffeeShopDomains.includes(hostname));
    setIsJoyHouseStoreDomain(joyHouseStoreDomains.includes(hostname));
  }, []);
  
  return { isCoffeeShopDomain, isJoyHouseStoreDomain, isLegacyDomain };
};
