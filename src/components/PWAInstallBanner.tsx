import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { X, Download, Info } from "lucide-react";
import { PWAInstallInstructions } from "./PWAInstallInstructions";
import { useLocation } from "react-router-dom";

export function PWAInstallBanner() {
  const {
    platform,
    canInstall,
    isStandalone,
    showPrompt,
    promptInstall,
    dismiss,
  } = usePWAInstall();
  
  const [showInstructions, setShowInstructions] = useState(false);
  const location = useLocation();

  // Don't show banner if:
  // - Already installed
  // - User dismissed it
  // - On the /install page itself
  // - Not on mobile (banner is mobile-only)
  const shouldShow = showPrompt && 
                     !isStandalone && 
                     location.pathname !== '/install' &&
                     (platform === 'ios' || platform === 'android' || canInstall);

  if (!shouldShow) return null;

  const handleInstall = () => {
    if (platform === 'ios') {
      setShowInstructions(true);
    } else {
      promptInstall();
    }
  };

  const handleDismiss = () => {
    dismiss(7);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-in-up md:hidden">
        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Download className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">
                  {platform === 'ios' 
                    ? 'Add to Home Screen' 
                    : 'Install our app'}
                </p>
                <p className="text-xs opacity-90">
                  {platform === 'ios'
                    ? 'For quick access and offline use'
                    : 'Get a better experience'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="whitespace-nowrap"
              >
                {platform === 'ios' ? (
                  <>
                    <Info className="h-4 w-4 mr-1" />
                    Learn How
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Install
                  </>
                )}
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PWAInstallInstructions
        open={showInstructions}
        onOpenChange={setShowInstructions}
        onDismiss={handleDismiss}
      />
    </>
  );
}
