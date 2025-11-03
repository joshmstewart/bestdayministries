export function getIOSVersion(): number | null {
  if (typeof window === 'undefined') return null;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

export function isProblematicIOSVersion(): boolean {
  const version = getIOSVersion();
  // iOS 18.x has known issues with CSS transforms
  return version !== null && version === 18;
}
