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

// Add a response interceptor to extract the custom backend error message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the error has a response from our backend and it contains our error envelope
    if (error.response?.data?.error?.message) {
      // Throw a standard Error with our friendly backend message
      throw new Error(error.response.data.error.message);
    }
    // Fallback to the default axios error if it's a network error or missing our envelope
    throw error;
  }
);

export default api;
