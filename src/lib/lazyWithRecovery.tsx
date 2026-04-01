import { lazy, type ComponentType, type LazyExoticComponent } from "react";

import { RouteRecoveryFallback } from "@/components/RouteRecoveryFallback";
import {
  clearAllCaches,
  forceCacheBustingReload,
  hasExceededRecoveryAttempts,
  incrementRecoveryAttempts,
  shouldThrottleRecovery,
} from "@/lib/cacheManager";

type LazyModule<T extends ComponentType<any>> = {
  default: T;
};

interface LazyWithRecoveryOptions {
  label?: string;
  recoveryReason?: string;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

function isRecoverableLazyError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("import") ||
    message.includes("module") ||
    message.includes("chunk") ||
    message.includes("fetch") ||
    message.includes("load failed") ||
    message.includes("default export")
  );
}

function createFallbackModule<T extends ComponentType<any>>(
  mode: "failed" | "recovering",
  label?: string,
): LazyModule<T> {
  const FallbackComponent = () => (
    <RouteRecoveryFallback mode={mode} routeLabel={label} />
  );

  return {
    default: FallbackComponent as unknown as T,
  };
}

export function lazyWithRecovery<T extends ComponentType<any>>(
  importer: () => Promise<LazyModule<T>>,
  options: LazyWithRecoveryOptions = {},
): LazyExoticComponent<T> {
  const { label, recoveryReason = "lazy_route_failure" } = options;

  return lazy(async () => {
    try {
      const module = await importer();

      if (!module?.default) {
        throw new Error(`Lazy module missing default export${label ? ` for ${label}` : ""}`);
      }

      return module;
    } catch (error) {
      console.error(`[LazyRecovery] Failed to load ${label ?? "lazy route"}:`, error);

      if (!isRecoverableLazyError(error)) {
        throw error;
      }

      if (!hasExceededRecoveryAttempts() && !shouldThrottleRecovery()) {
        const attempt = incrementRecoveryAttempts();
        console.info(`[LazyRecovery] Attempt ${attempt} for ${label ?? "route"}; refreshing latest build`);

        void clearAllCaches()
          .catch((cacheError) => {
            console.warn(`[LazyRecovery] Cache clear failed for ${label ?? "route"}:`, cacheError);
          })
          .finally(() => {
            forceCacheBustingReload(recoveryReason);
          });

        return createFallbackModule<T>("recovering", label);
      }

      return createFallbackModule<T>("failed", label);
    }
  });
}