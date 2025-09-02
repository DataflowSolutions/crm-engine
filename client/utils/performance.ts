// utils/performance.ts
// Utility functions for performance optimization and session management

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
  permissions: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
} as const;

// Types for session storage
interface UserPermissions {
  role: string;
  isOrgCreator: boolean;
  canCreateLeads: boolean;
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canViewLeads: boolean;
  canCreateTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteTemplates: boolean;
  canViewTemplates: boolean;
  canInviteMembers: boolean;
  canManageMembers: boolean;
  canManageOrganization: boolean;
  canViewMembers: boolean;
  canImportLeads: boolean;
  canExportLeads: boolean;
}

interface SessionData {
  permissions: Record<string, UserPermissions>; // orgId -> permissions
  lastUpdated: number;
  userId: string;
}

// Session storage utilities
const SESSION_KEY = 'crm_user_session';
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Server-side cache (simple in-memory for development)
const serverCache = new Map<string, { permissions: UserPermissions; timestamp: number }>();
const SERVER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const SessionCache = {
  // Get permissions for a specific org from session storage (client) or memory cache (server)
  getPermissions(orgId: string): UserPermissions | null {
    // Server-side: use in-memory cache
    if (typeof window === 'undefined') {
      const cached = serverCache.get(orgId);
      if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL) {
        return cached.permissions;
      }
      return null;
    }
    
    // Client-side: use sessionStorage
    try {
      const sessionData = sessionStorage.getItem(SESSION_KEY);
      if (!sessionData) return null;

      const session: SessionData = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() - session.lastUpdated > SESSION_TTL) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session.permissions[orgId] || null;
    } catch {
      return null;
    }
  },

  // Store permissions for an org
  setPermissions(orgId: string, permissions: UserPermissions, userId: string): void {
    // Server-side: use in-memory cache
    if (typeof window === 'undefined') {
      serverCache.set(orgId, {
        permissions,
        timestamp: Date.now()
      });
      return;
    }
    
    // Client-side: use sessionStorage
    try {
      let session: SessionData;
      const existing = sessionStorage.getItem(SESSION_KEY);
      
      if (existing) {
        session = JSON.parse(existing);
        session.permissions[orgId] = permissions;
        session.lastUpdated = Date.now();
      } else {
        session = {
          permissions: { [orgId]: permissions },
          lastUpdated: Date.now(),
          userId
        };
      }

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.warn('Failed to cache permissions:', error);
    }
  },

  // Clear all cached permissions
  clearSession(): void {
    // Server-side: clear memory cache
    if (typeof window === 'undefined') {
      serverCache.clear();
      return;
    }
    
    // Client-side: clear sessionStorage
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Check if we have valid permissions for an org
  hasValidPermissions(orgId: string): boolean {
    const permissions = this.getPermissions(orgId);
    return permissions !== null;
  }
};

// Optimized data fetching with built-in caching
export const DataCache = {
  cache: new Map<string, { data: unknown; timestamp: number; ttl: number }>(),

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  },

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  },

  clear(): void {
    this.cache.clear();
  },

  // Smart cache keys
  keys: {
    dashboard: (orgId: string) => `dashboard:${orgId}`,
    leads: (orgId: string, page = 1, search = '', status = '') => 
      `leads:${orgId}:${page}:${search}:${status}`,
    leadDetail: (leadId: string) => `lead:${leadId}`,
    templates: (orgId: string) => `templates:${orgId}`,
    members: (orgId: string) => `members:${orgId}`,
  }
};

// Prefetch function for hover states
export const prefetchLeadData = async (leadId: string, _orgId?: string) => {
  const cacheKey = DataCache.keys.leadDetail(leadId);
  if (DataCache.get(cacheKey)) return; // Already cached
  
  // This would be implemented to prefetch lead data on hover
  // Future implementation would use _orgId for context
};

// Utility to batch multiple RPC calls
export const batchRPCCalls = async <T>(
  supabase: { rpc: (name: string, params: Record<string, unknown>) => { single: () => Promise<{ data: T }> } },
  calls: Array<{ name: string; params: Record<string, unknown> }>
): Promise<T[]> => {
  try {
    const promises = calls.map(call => 
      supabase.rpc(call.name, call.params).single()
    );
    
    const results = await Promise.all(promises);
    return results.map(r => r.data);
  } catch (error) {
    console.error('Batch RPC calls failed:', error);
    throw error;
  }
};
