import { useState } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearAllCaches,
  forceCacheBustingReload,
  resetRecoveryAttempts,
} from "@/lib/cacheManager";

interface RouteRecoveryFallbackProps {
  description?: string;
  mode?: "failed" | "recovering";
  routeLabel?: string;
  title?: string;
}

export function RouteRecoveryFallback({
  description,
  mode = "failed",
  routeLabel,
  title,
}: RouteRecoveryFallbackProps) {
  const [isRecovering, setIsRecovering] = useState(mode === "recovering");
  const [showManualHelp, setShowManualHelp] = useState(false);

  const resolvedTitle =
    title ??
    (mode === "recovering" ? "Loading the latest version…" : "We hit a loading problem");

  const resolvedDescription =
    description ??
    (mode === "recovering"
      ? `Refreshing ${routeLabel ?? "this page"} so the newest files load correctly.`
      : `${routeLabel ?? "This page"} could not load correctly. A quick refresh usually fixes this after an update.`);

  const handleFixNow = async () => {
    setIsRecovering(true);
    setShowManualHelp(false);

    try {
      await clearAllCaches();
      resetRecoveryAttempts();
      forceCacheBustingReload("route_recovery_manual");
    } catch (error) {
      console.error("[RouteRecovery] Manual recovery failed:", error);
      setIsRecovering(false);
      setShowManualHelp(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background/95 px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            {isRecovering ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{resolvedTitle}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">{resolvedDescription}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={handleFixNow} disabled={isRecovering} className="sm:min-w-40">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? "animate-spin" : ""}`} />
              {isRecovering ? "Refreshing…" : "Fix Now"}
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.assign("/")}
              className="sm:min-w-40"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {showManualHelp && (
            <p className="text-sm text-muted-foreground">
              If this still does not load, open the page in a fresh tab once more so the newest build can fully replace the stale one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}