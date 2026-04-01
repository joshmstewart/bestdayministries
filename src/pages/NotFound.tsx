import { useEffect, useState } from "react";
import { Home, RefreshCw, SearchX } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  clearAllCaches,
  forceCacheBustingReload,
  getCurrentBuildVersion,
  hasExceededRecoveryAttempts,
  incrementRecoveryAttempts,
  resetRecoveryAttempts,
  shouldThrottleRecovery,
} from "@/lib/cacheManager";

const NotFound = () => {
  const location = useLocation();
  const [isCheckingLatestBuild, setIsCheckingLatestBuild] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [newerBuildDetected, setNewerBuildDetected] = useState(false);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    let cancelled = false;

    const checkForStaleRoute = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Version check failed with status ${response.status}`);
        }

        const payload = await response.json();
        const latestVersion = typeof payload?.version === "string" ? payload.version : null;
        const isStaleRoute = Boolean(latestVersion && latestVersion !== getCurrentBuildVersion());

        if (cancelled) return;

        setNewerBuildDetected(isStaleRoute);

        if (isStaleRoute && !hasExceededRecoveryAttempts() && !shouldThrottleRecovery()) {
          setIsRecovering(true);
          incrementRecoveryAttempts();
          await clearAllCaches();
          forceCacheBustingReload("stale_not_found_route");
          return;
        }
      } catch (error) {
        console.warn("[NotFound] Failed to check latest build version:", error);
      } finally {
        if (!cancelled) {
          setIsCheckingLatestBuild(false);
        }
      }
    };

    void checkForStaleRoute();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleRefresh = async () => {
    setIsRecovering(true);

    try {
      await clearAllCaches();
      resetRecoveryAttempts();
      forceCacheBustingReload("not_found_manual_refresh");
    } catch (error) {
      console.error("[NotFound] Manual refresh failed:", error);
      setIsRecovering(false);
    }
  };

  const title = isRecovering
    ? "Loading the latest version…"
    : newerBuildDetected
      ? "A newer version is available"
      : "Page not found";

  const description = newerBuildDetected
    ? "This link appears to be hitting an older cached version of the app. Refreshing should load the newest page." 
    : "We couldn’t find that page. If the site was just updated, a refresh may pull in the newest version.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-8 shadow-lg">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
            {isRecovering || isCheckingLatestBuild ? (
              <RefreshCw className="h-7 w-7 animate-spin" />
            ) : (
              <SearchX className="h-7 w-7" />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">404</p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
            <p className="mx-auto max-w-md text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={handleRefresh} disabled={isRecovering} className="sm:min-w-40">
              <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? "animate-spin" : ""}`} />
              {isRecovering ? "Refreshing…" : "Refresh App"}
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

          <p className="text-xs text-muted-foreground">
            Requested path: <span className="font-mono">{location.pathname}</span>
          </p>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
