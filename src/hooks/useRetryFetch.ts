import { useState, useCallback } from 'react';

interface UseRetryFetchOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

export function useRetryFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseRetryFetchOptions = {}
) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await fetchFn();
        setIsRetrying(false);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          setIsRetrying(true);
          // Exponential backoff with jitter
          const delay = Math.min(
            initialDelay * Math.pow(2, attempt) + Math.random() * 1000,
            maxDelay
          );
          
          console.warn(
            `Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
            error
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setIsRetrying(false);
    throw lastError || new Error('All retry attempts failed');
  }, [fetchFn, maxRetries, initialDelay, maxDelay]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    fetchWithRetry,
    retryCount,
    isRetrying,
    reset,
  };
}
