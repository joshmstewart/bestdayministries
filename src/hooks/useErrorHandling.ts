import { useState, useEffect, useCallback } from "react";

/**
 * Hook for detecting online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for handling errors with recovery
 */
export function useErrorRecovery<T>(
  asyncFn: () => Promise<T>,
  options: { 
    onError?: (error: Error) => void;
    fallback?: T;
    autoRetry?: boolean;
    retryDelay?: number;
  } = {}
) {
  const { onError, fallback, autoRetry = false, retryDelay = 3000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isOnline = useOnlineStatus();

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      setRetryCount(0);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      
      if (fallback !== undefined) {
        setData(fallback);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, onError, fallback]);

  // Auto-retry when back online
  useEffect(() => {
    if (autoRetry && error && isOnline && retryCount < 3) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        execute().catch(() => {});
      }, retryDelay);
      return () => clearTimeout(timer);
    }
  }, [autoRetry, error, isOnline, retryCount, retryDelay, execute]);

  return { data, error, isLoading, execute, isOnline, retryCount };
}

/**
 * Hook for timeout handling
 */
export function useTimeout<T>(
  asyncFn: () => Promise<T>,
  timeout: number = 30000
) {
  const [isTimedOut, setIsTimedOut] = useState(false);

  const executeWithTimeout = useCallback(async (): Promise<T> => {
    setIsTimedOut(false);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        setIsTimedOut(true);
        reject(new Error("Request timed out"));
      }, timeout);
    });

    return Promise.race([asyncFn(), timeoutPromise]);
  }, [asyncFn, timeout]);

  return { execute: executeWithTimeout, isTimedOut };
}

/**
 * Hook for graceful degradation
 */
export function useGracefulDegradation<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>
) {
  const [usedFallback, setUsedFallback] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setUsedFallback(false);

    try {
      const result = await primaryFn();
      setData(result);
      return result;
    } catch {
      console.warn("Primary function failed, using fallback");
      setUsedFallback(true);
      
      try {
        const fallbackResult = await Promise.resolve(fallbackFn());
        setData(fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw fallbackError;
      }
    } finally {
      setIsLoading(false);
    }
  }, [primaryFn, fallbackFn]);

  return { data, isLoading, usedFallback, execute };
}

/**
 * Error tracking and aggregation
 */
interface TrackedError {
  error: Error;
  timestamp: number;
  count: number;
  context?: string;
}

export function useErrorTracking(maxErrors: number = 10) {
  const [errors, setErrors] = useState<TrackedError[]>([]);

  const trackError = useCallback((error: Error, context?: string) => {
    setErrors(prev => {
      // Check if we already have this error
      const existing = prev.find(e => e.error.message === error.message);
      
      if (existing) {
        return prev.map(e => 
          e.error.message === error.message 
            ? { ...e, count: e.count + 1, timestamp: Date.now() }
            : e
        );
      }

      // Add new error, keep only last N
      const newErrors = [
        { error, timestamp: Date.now(), count: 1, context },
        ...prev,
      ].slice(0, maxErrors);

      return newErrors;
    });
  }, [maxErrors]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const hasErrors = errors.length > 0;
  const latestError = errors[0] ?? null;
  const errorCount = errors.reduce((sum, e) => sum + e.count, 0);

  return { errors, trackError, clearErrors, hasErrors, latestError, errorCount };
}

/**
 * Hook for handling API errors specifically
 */
export function useApiError() {
  const [error, setError] = useState<{
    status?: number;
    message: string;
    isNetworkError: boolean;
    isServerError: boolean;
    isClientError: boolean;
  } | null>(null);

  const handleError = useCallback((err: unknown) => {
    if (!err) {
      setError(null);
      return;
    }

    // Check for network errors
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      setError({
        message: "Network error. Please check your connection.",
        isNetworkError: true,
        isServerError: false,
        isClientError: false,
      });
      return;
    }

    // Check for Supabase errors
    if (typeof err === "object" && err !== null && "code" in err) {
      const supabaseError = err as { code: string; message: string; status?: number };
      const status = supabaseError.status || 500;
      
      setError({
        status,
        message: supabaseError.message,
        isNetworkError: false,
        isServerError: status >= 500,
        isClientError: status >= 400 && status < 500,
      });
      return;
    }

    // Generic error
    setError({
      message: err instanceof Error ? err.message : "An error occurred",
      isNetworkError: false,
      isServerError: false,
      isClientError: false,
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
