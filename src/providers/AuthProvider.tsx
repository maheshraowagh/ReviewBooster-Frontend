import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import api, { type ApiResponse } from '../lib/api';
import type { AppUser } from '../types';

interface AuthContextType {
  appUser: AppUser | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  appUser: null,
  isLoading: true,
  error: null,
  refetchUser: async () => {},
});

/**
 * AuthProvider — wraps the app to provide:
 * 1. Clerk auth token injection on every API request
 * 2. User sync (POST /api/auth/sync) after Clerk sign-in
 * 3. AppUser state accessible via useAppAuth()
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Attach Clerk token to every API request via axios interceptor
  // -------------------------------------------------------------------------
  useEffect(() => {
    const interceptorId = api.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Token fetch failed — request will proceed without auth header.
        // Protected endpoints will return 401, handled by the caller.
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptorId);
    };
  }, [getToken]);

  // -------------------------------------------------------------------------
  // Sync user with backend after sign-in
  // -------------------------------------------------------------------------
  const syncUser = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setAppUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await api.post<ApiResponse<AppUser>>('/auth/sync', {
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        firstName: clerkUser.firstName || '',
        lastName: clerkUser.lastName || '',
      });

      if (res.data.success && res.data.data) {
        setAppUser(res.data.data);
      } else {
        setError(res.data.error?.message || 'Failed to sync user');
      }
    } catch (err) {
      console.error('User sync failed:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, clerkUser]);

  useEffect(() => {
    if (isAuthLoaded && isUserLoaded) {
      syncUser();
    }
  }, [isAuthLoaded, isUserLoaded, syncUser]);

  return (
    <AuthContext.Provider value={{ appUser, isLoading, error, refetchUser: syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the current app user and auth state.
 */
export function useAppAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAppAuth must be used within an AuthProvider');
  }
  return context;
}
