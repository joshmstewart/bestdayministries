import { useEffect, useState } from 'react';

/**
 * Hook to detect which domain the user is on and route accordingly
 */
export const useDomainRouting = () => {
  const [isCoffeeShopDomain, setIsCoffeeShopDomain] = useState(false);
  
  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Check if we're on the coffee shop domain
    const coffeeShopDomains = [
      'bestdayevercoffeeandcrepes.com',
      'www.bestdayevercoffeeandcrepes.com'
    ];
    
    setIsCoffeeShopDomain(coffeeShopDomains.includes(hostname));
  }, []);
  
  return { isCoffeeShopDomain };
};
