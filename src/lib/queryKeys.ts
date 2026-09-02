/**
 * Centralized React Query key factory.
 *
 * Every query key used in the app should be produced by this factory
 * so invalidation, prefetching, and caching stay consistent.
 */
export const queryKeys = {
  // ---- Dashboard ----
  dashboard: {
    all: ['dashboard'] as const,
    overview: (period: string, startDate?: string, endDate?: string) =>
      ['dashboard', 'overview', period, startDate, endDate] as const,
  },

  // ---- Business ----
  business: {
    all: ['business'] as const,
    detail: (id: string) => ['business', id] as const,
  },

  // ---- Inbox / Feedback ----
  inbox: {
    all: ['inbox'] as const,
    list: (page: number, limit: number, filters?: Record<string, unknown>) =>
      ['inbox', 'list', { page, limit, ...filters }] as const,
  },

  // ---- Insights ----
  insights: {
    all: ['insights'] as const,
    stats: (period: string, startDate?: string, endDate?: string) =>
      ['insights', 'stats', period, startDate, endDate] as const,
  },

  // ---- Campaigns ----
  campaigns: {
    all: ['campaigns'] as const,
    list: (page: number, limit: number, status?: string) =>
      ['campaigns', 'list', { page, limit, status }] as const,
  },

  // ---- WhatsApp ----
  whatsapp: {
    all: ['whatsapp'] as const,
    status: () => ['whatsapp', 'status'] as const,
  },

  // ---- Billing ----
  billing: {
    all: ['billing'] as const,
    current: () => ['billing', 'current'] as const,
  },

  // ---- Admin ----
  admin: {
    all: ['admin'] as const,
    dashboard: () => ['admin', 'dashboard'] as const,
    businesses: (page: number, limit: number, search?: string) =>
      ['admin', 'businesses', { page, limit, search }] as const,
    users: (page: number, limit: number) =>
      ['admin', 'users', { page, limit }] as const,
    activity: (page: number, limit: number) =>
      ['admin', 'activity', { page, limit }] as const,
  },

  // ---- GBP Health Audit ----
  gbpAudit: {
    all: ['gbp-audit'] as const,
    current: () => ['gbp-audit', 'current'] as const,
    history: () => ['gbp-audit', 'history'] as const,
    toneProfile: () => ['gbp-audit', 'tone-profile'] as const,
  },

  // ---- Google Auth ----
  googleAuth: {
    all: ['google-auth'] as const,
    status: () => ['google-auth', 'status'] as const,
  },

  // ---- Feature Requests ----
  featureRequests: {
    all: ['feature-requests'] as const,
    mine: () => ['feature-requests', 'mine'] as const,
  },
} as const;
