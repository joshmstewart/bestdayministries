import { useState, useCallback, useRef } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Hook for managing async operations with loading/error states
 */
export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState({
      data: null,
      error: null,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      const data = await asyncFn();
      setState({
        data,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });
      return data;
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
        isSuccess: false,
        isError: true,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return { ...state, execute, reset };
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Hook for async operations with automatic retry
 */
export function useAsyncRetry<T>(options: RetryOptions = {}) {
  const { maxRetries = 3, retryDelay = 1000, backoff = true, onRetry } = options;
  const [attempt, setAttempt] = useState(0);
  const asyncState = useAsync<T>();

  const executeWithRetry = useCallback(
    async (asyncFn: () => Promise<T>) => {
      let currentAttempt = 0;
      let lastError: Error | null = null;

      while (currentAttempt <= maxRetries) {
        try {
          setAttempt(currentAttempt);
          const result = await asyncState.execute(asyncFn);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (currentAttempt < maxRetries) {
            onRetry?.(currentAttempt + 1, lastError);
            const delay = backoff 
              ? retryDelay * Math.pow(2, currentAttempt) 
              : retryDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          currentAttempt++;
        }
      }

      throw lastError;
    },
    [asyncState, maxRetries, retryDelay, backoff, onRetry]
  );

  return { ...asyncState, execute: executeWithRetry, attempt };
}

/**
 * Hook for managing form submission state
 */
export function useFormState<T>() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const submit = useCallback(async (submitFn: () => Promise<T>) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setIsSuccess(false);

    try {
      const result = await submitFn();
      setIsSuccess(true);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed";
      setSubmitError(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setSubmitError(null);
    setIsSuccess(false);
  }, []);

  return { isSubmitting, submitError, isSuccess, submit, reset };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(
  currentValue: T,
  onUpdate: (newValue: T) => Promise<void>
) {
  const [optimisticValue, setOptimisticValue] = useState<T | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousValueRef = useRef<T>(currentValue);

  const update = useCallback(
    async (newValue: T) => {
      previousValueRef.current = currentValue;
      setOptimisticValue(newValue);
      setIsUpdating(true);
      setError(null);

      try {
        await onUpdate(newValue);
        setOptimisticValue(null);
      } catch (err) {
        setOptimisticValue(null);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsUpdating(false);
      }
    },
    [currentValue, onUpdate]
  );

  const displayValue = optimisticValue ?? currentValue;

  return { value: displayValue, update, isUpdating, error };
}

/**
 * Hook for polling data
 */
export function usePoll<T>(
  fetchFn: () => Promise<T>,
  interval: number,
  options: { enabled?: boolean; immediate?: boolean } = {}
) {
  const { enabled = true, immediate = true } = options;
  const asyncState = useAsync<T>();
  const intervalRef = useRef<NodeJS.Timeout>();

  const startPolling = useCallback(() => {
    if (immediate) {
      asyncState.execute(fetchFn);
    }

    intervalRef.current = setInterval(() => {
      asyncState.execute(fetchFn);
    }, interval);
  }, [fetchFn, interval, immediate, asyncState]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Auto start/stop based on enabled
  useState(() => {
    if (enabled) {
      startPolling();
    }
    return () => stopPolling();
  });

  return { ...asyncState, startPolling, stopPolling };
}

/**
 * Hook for managing undo/redo
 */
export function useUndoRedo<T>(initialState: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const update = useCallback((newState: T) => {
    setPast(prev => [...prev, present]);
    setPresent(newState);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [canUndo, past, present, future]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast([...past, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [canRedo, past, present, future]);

  const reset = useCallback((newState: T) => {
    setPast([]);
    setPresent(newState);
    setFuture([]);
  }, []);

  return { value: present, update, undo, redo, canUndo, canRedo, reset };
}
