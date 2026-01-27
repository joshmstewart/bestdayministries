/**
 * Route hierarchy configuration for smart back button fallbacks.
 * Maps routes to their logical parent routes.
 * 
 * When a user lands directly on a deep page (no browser history),
 * the back button will navigate to the parent route instead of /community.
 */

interface RouteHierarchy {
  [route: string]: string;
}

/**
 * Maps child routes to their parent routes.
 * Use exact paths or path prefixes (ending with *).
 * Order matters - more specific routes should come first.
 */
const routeHierarchy: RouteHierarchy = {
  // Games - completion/detail pages go to their game landing
  '/games/memory-match/complete': '/games/memory-match',
  '/games/match3/complete': '/games/match3',
  '/games/drink-creator/result': '/games/drink-creator',
  '/games/recipe-gallery': '/community', // Top-level resource
  '/games/recipe-maker': '/games/recipe-gallery',
  
  // All games go to community
  '/games/memory-match': '/community',
  '/games/match3': '/community',
  '/games/drink-creator': '/community',
  
  // Sticker album flows
  '/sticker-album/pack': '/sticker-album',
  '/sticker-album': '/community',
  
  // Virtual pet flows
  '/virtual-pet/care': '/virtual-pet',
  '/virtual-pet': '/community',
  
  // Store flows
  '/store/purchase': '/store',
  '/store': '/community',
  
  // Discussions - detail pages go to list
  '/discussions/': '/discussions',
  '/discussions': '/community',
  
  // Events - detail pages go to list  
  '/events/': '/events',
  '/events': '/community',
  
  // Gallery/Albums
  '/gallery/': '/gallery',
  '/gallery': '/community',
  
  // Videos
  '/videos/': '/videos',
  '/videos': '/community',
  
  // Sponsorship flows
  '/sponsorship-success': '/sponsor-bestie',
  '/sponsor-bestie': '/community',
  
  // Guardian flows
  '/guardian-approvals': '/guardian-links',
  '/guardian-links': '/community',
  
  // Bestie messages
  '/bestie-messages': '/community',
  
  // Marketplace flows
  '/checkout-success': '/orders',
  '/orders': '/marketplace',
  '/store/product/': '/marketplace',
  '/marketplace': '/community',
  
  // Vendor flows
  '/vendor-dashboard': '/marketplace',
  '/vendor-auth': '/marketplace',
  
  // User flows
  '/profile': '/community',
  '/notifications': '/community',
  '/donation-history': '/community',
  
  // Help flows
  '/help': '/community',
  
  // About/Support pages
  '/about': '/community',
  '/support': '/community',
  '/partners': '/community',
  '/joy-rocks': '/community',
};

/**
 * Get the parent route for a given path.
 * Returns the most specific matching parent, or /community as ultimate fallback.
 */
export function getParentRoute(currentPath: string): string {
  // First, try exact match
  if (routeHierarchy[currentPath]) {
    return routeHierarchy[currentPath];
  }
  
  // Then, try prefix matches (for dynamic routes like /discussions/:id)
  // Sort by length descending to match most specific first
  const prefixKeys = Object.keys(routeHierarchy)
    .filter(key => key.endsWith('/'))
    .sort((a, b) => b.length - a.length);
  
  for (const prefix of prefixKeys) {
    if (currentPath.startsWith(prefix)) {
      return routeHierarchy[prefix];
    }
  }
  
  // Check if the path starts with any known route (without trailing slash)
  const routeKeys = Object.keys(routeHierarchy)
    .filter(key => !key.endsWith('/'))
    .sort((a, b) => b.length - a.length);
    
  for (const route of routeKeys) {
    if (currentPath.startsWith(route + '/')) {
      // This is a sub-route of a known route
      return route;
    }
  }
  
  // Ultimate fallback
  return '/community';
}

/**
 * Hook-friendly function to get fallback for BackButton
 */
export function getBackButtonFallback(currentPath: string): string {
  return getParentRoute(currentPath);
}
