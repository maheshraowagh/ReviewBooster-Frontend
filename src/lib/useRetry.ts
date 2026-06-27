import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

interface UseRetryResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isNetworkError: boolean;
  retry: () => void;
  execute: (...args: unknown[]) => Promise<T | null>;
}

/**
 * useRetry — wraps an async function with:
 * 1. One automatic retry after 2 seconds on network failure
 * 2. A manual retry() callback for the UI's retry button
 *
 * Distinguishes network errors (connection lost) from API errors (validation, 404, etc.)
 */
export function useRetry<T>(
  asyncFn: (...args: unknown[]) => Promise<T>
): UseRetryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const lastArgsRef = useRef<unknown[]>([]);

  const isNetworkErr = (err: unknown): boolean => {
    if (axios.isAxiosError(err)) {
      return !err.response; // No response = network failure
    }
    return false;
  };

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      lastArgsRef.current = args;
      setIsLoading(true);
      setError(null);
      setIsNetworkError(false);

      try {
        const result = await asyncFn(...args);
        setData(result);
        setIsLoading(false);
        return result;
      } catch (err) {
        if (isNetworkErr(err)) {
          // Auto-retry once after 2 seconds
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const result = await asyncFn(...args);
            setData(result);
            setIsLoading(false);
            return result;
          } catch (retryErr) {
            setIsNetworkError(true);
            setError('Connection lost');
            setIsLoading(false);
            return null;
          }
        } else {
          // API error (validation, 404, etc.) — don't auto-retry
          const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
          setError(
            axiosErr.response?.data?.error?.message || 'Something went wrong'
          );
          setIsLoading(false);
          return null;
        }
      }
    },
    [asyncFn]
  );

  const retry = useCallback(() => {
    execute(...lastArgsRef.current);
  }, [execute]);

  return { data, error, isLoading, isNetworkError, retry, execute };
}
