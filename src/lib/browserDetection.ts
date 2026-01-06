export function getIOSVersion(): number | null {
  if (typeof window === 'undefined') return null;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  // Safari but not Chrome (Chrome includes Safari in UA)
  return /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
}

export function getMacOSSafariVersion(): number | null {
  if (typeof window === 'undefined') return null;
  const userAgent = window.navigator.userAgent;
  // Match Safari version on macOS
  const match = userAgent.match(/Version\/(\d+)[\d.]*\s+Safari/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

export function isProblematicIOSVersion(): boolean {
  const version = getIOSVersion();
  // iOS 18.x has known issues with CSS transforms
  if (version !== null && version === 18) return true;
  
  // Also check for problematic Safari versions on macOS (18.x)
  const safariVersion = getMacOSSafariVersion();
  if (safariVersion !== null && safariVersion === 18) return true;
  
  return false;
}
