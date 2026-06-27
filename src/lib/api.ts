import axios from 'axios';

/**
 * Axios instance pre-configured for the ReviewBoost API.
 *
 * - Base URL points to the backend API (proxied through Vite in dev)
 * - The Clerk auth token is attached dynamically via an interceptor
 *   set up in AuthProvider (see providers/AuthProvider.tsx)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Type for the standard API response envelope from the backend.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export default api;
