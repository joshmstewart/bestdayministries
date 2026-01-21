import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  canInstall: boolean;
  isStandalone: boolean;
  showPrompt: boolean;
  promptInstall: () => Promise<void>;
  dismiss: (days?: number) => void;
  isInstalled: boolean;
  isNativeApp: boolean;
}

const STORAGE_KEY = 'pwa-install-dismissed';
const STORAGE_DAYS_KEY = 'pwa-install-dismissed-days';
const DEFAULT_DISMISS_DAYS = 7;

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if running as a native Capacitor app
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    // If running as native app, never show install prompt
    if (isNativeApp) {
      setShowPrompt(false);
      setIsStandalone(true);
      return;
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/.test(userAgent);
    const isDesktop = !isIOS && !isAndroid;

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else if (isDesktop) setPlatform('desktop');

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check dismissal state
    const dismissedTimestamp = localStorage.getItem(STORAGE_KEY);
    const dismissedDays = parseInt(localStorage.getItem(STORAGE_DAYS_KEY) || String(DEFAULT_DISMISS_DAYS));
    
    if (dismissedTimestamp) {
      const dismissedDate = new Date(parseInt(dismissedTimestamp));
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDismissed < dismissedDays) {
        setShowPrompt(false);
        return;
      }
    }

    // If not installed and not dismissed, show prompt
    if (!standalone) {
      setShowPrompt(true);
    }

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isNativeApp]);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setIsStandalone(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error prompting install:', error);
    }
  };

  const dismiss = (days: number = DEFAULT_DISMISS_DAYS) => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    localStorage.setItem(STORAGE_DAYS_KEY, String(days));
    setShowPrompt(false);
  };

  const canInstall = !!deferredPrompt || platform === 'ios';

  return {
    platform,
    canInstall,
    isStandalone,
    showPrompt,
    promptInstall,
    dismiss,
    isInstalled: isStandalone || isNativeApp,
    isNativeApp,
  };
}
