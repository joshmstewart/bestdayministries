import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  // Use useLayoutEffect for synchronous scroll before paint
  useLayoutEffect(() => {
    // Immediate scroll attempt
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // For Safari
  }, [pathname]);

  // Backup scroll after a short delay for mobile browsers
  // that may have scroll restoration or async rendering issues
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate
    scrollToTop();
    
    // Delayed backup for mobile browsers with scroll restoration
    const timeoutId = setTimeout(scrollToTop, 50);
    
    // Another backup after content may have loaded
    const timeoutId2 = setTimeout(scrollToTop, 150);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [pathname]);

  return null;
};
