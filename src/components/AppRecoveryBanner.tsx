import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  clearAllCaches, 
  hasExceededRecoveryAttempts, 
  resetRecoveryAttempts,
  forceCacheBustingReload 
} from '@/lib/cacheManager';

/**
 * Recovery banner shown when automatic recovery fails after multiple attempts.
 * Provides a "Fix Now" button for users to manually trigger cache clearing.
 */
export function AppRecoveryBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    // Check if we should show the recovery banner
    // This happens when auto-recovery has failed multiple times
    if (hasExceededRecoveryAttempts()) {
      setShowBanner(true);
    }
  }, []);

  const handleFixNow = async () => {
    setIsRecovering(true);
    
    try {
      // Clear all caches
      await clearAllCaches();
      
      // Reset attempts counter
      resetRecoveryAttempts();
      
      // Force reload
      forceCacheBustingReload('manual_fix');
    } catch (e) {
      console.error('[Recovery] Manual fix failed:', e);
      setIsRecovering(false);
      setShowManualInstructions(true);
    }
  };

  const handleDismiss = () => {
    resetRecoveryAttempts();
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
            <AlertTriangle className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Something went wrong
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              The app ran into a problem loading. This sometimes happens after updates. 
              Let's fix it!
            </p>

            {!showManualInstructions ? (
              <Button 
                onClick={handleFixNow} 
                disabled={isRecovering}
                className="w-full"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Fix Now
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-destructive">
                  Automatic fix didn't work. Please try manually:
                </p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Open Safari Settings (⌘ + ,)</li>
                  <li>Go to "Privacy" tab</li>
                  <li>Click "Manage Website Data"</li>
                  <li>Search for this website</li>
                  <li>Click "Remove" then reload the page</li>
                </ol>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Reloading
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
