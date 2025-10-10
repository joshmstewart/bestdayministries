import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface SessionAction {
  timestamp: string;
  url: string;
  action: string;
}

interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  windowSize: string;
  colorDepth: number;
  timezone: string;
}

export const useSessionCapture = () => {
  const location = useLocation();
  const [sessionActions, setSessionActions] = useState<SessionAction[]>([]);

  useEffect(() => {
    // Track route changes
    const action: SessionAction = {
      timestamp: new Date().toISOString(),
      url: location.pathname + location.search,
      action: 'navigation'
    };
    
    setSessionActions(prev => [...prev.slice(-49), action]); // Keep last 50 actions
  }, [location]);

  const getBrowserInfo = (): BrowserInfo => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  };

  const captureSnapshot = () => {
    return {
      browserInfo: getBrowserInfo(),
      sessionActions: sessionActions,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString()
    };
  };

  const trackAction = (action: string) => {
    const newAction: SessionAction = {
      timestamp: new Date().toISOString(),
      url: location.pathname,
      action
    };
    setSessionActions(prev => [...prev.slice(-49), newAction]);
  };

  return {
    captureSnapshot,
    trackAction,
    sessionActions
  };
};
