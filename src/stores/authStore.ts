import { create } from 'zustand';
import type { AppUser } from '../types';

interface AuthState {
  appUser: AppUser | null;
  isLoading: boolean;
  error: string | null;
  setAppUser: (user: AppUser | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  appUser: null,
  isLoading: true,
  error: null,
  setAppUser: (user) => set({ appUser: user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearAuth: () => set({ appUser: null, isLoading: false, error: null }),
}));
