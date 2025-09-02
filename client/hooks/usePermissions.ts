"use client";

import { useState, useEffect, useCallback } from 'react';
import { SessionCache } from '../utils/performance';
import type { UserPermissions } from '../utils/permissions';

// Client-side hook for getting cached permissions
export function usePermissions(orgId: string): {
  permissions: UserPermissions | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    setIsLoading(true);
    
    // First try to get from session storage
    const cached = SessionCache.getPermissions(orgId);
    if (cached) {
      setPermissions(cached as UserPermissions);
      setIsLoading(false);
      return;
    }

    // If not cached, we need to fetch from server
    // This would typically happen on first load or after cache expires
    try {
      const response = await fetch(`/api/organizations/${orgId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
        
        // Cache the result
        if (data.userId) {
          SessionCache.setPermissions(orgId, data, data.userId);
        }
      }
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch permissions:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId && orgId.trim()) {
      loadPermissions();
    } else {
      setIsLoading(false);
      setPermissions(null);
    }
  }, [orgId, loadPermissions]);

  const refetch = useCallback(async () => {
    // Clear cache and refetch
    SessionCache.clearSession();
    await loadPermissions();
  }, [loadPermissions]);

  return {
    permissions,
    isLoading,
    refetch
  };
}

// Hook for checking specific permissions
export function usePermission(orgId: string, permission: keyof UserPermissions): boolean {
  const { permissions } = usePermissions(orgId);
  return permissions ? permissions[permission] as boolean : false;
}

// Hook for getting user role
export function useUserRole(orgId: string): string | null {
  const { permissions } = usePermissions(orgId);
  return permissions?.role || null;
}
