import { useEffect, useState } from 'react';

/**
 * Hook to detect which domain the user is on and route accordingly
 */
export const useDomainRouting = () => {
  const [isCoffeeShopDomain, setIsCoffeeShopDomain] = useState(false);
  const [isJoyHouseStoreDomain, setIsJoyHouseStoreDomain] = useState(false);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
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
  
  return { isCoffeeShopDomain, isJoyHouseStoreDomain };
};
