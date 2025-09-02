// utils/performance.ts
// Utility functions for performance optimization

export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

// Cache configuration for different types of data
export const CACHE_CONFIG = {
  leadDetail: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  leadsList: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
  templates: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
} as const;

// Function to prefetch related data
//export const prefetchLeadData = async (_leadId: string, _orgId: string) => {
  // Prefetch organization data, templates, etc.
  // This can be called when hovering over lead links
  // Implementation would go here
//};
