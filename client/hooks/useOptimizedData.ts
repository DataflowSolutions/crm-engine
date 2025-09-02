// Unified data fetching hooks to replace multiple scattered API calls
// This consolidates data fetching and reduces redundant network requests

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';

// Types
interface Lead {
  lead_id: string;
  template_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  field_data: Array<{
    value: string;
    label: string;
    field_type: string;
  }>;
  relevance_score?: number;
}

interface LeadsResponse {
  leads: Lead[];
  totalCount: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface OrganizationContext {
  hasAccess: boolean;
  role: string;
  isOrgCreator: boolean;
  orgName: string;
  orgSlug: string;
  permissions: {
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
  };
}

// Fetcher function with error handling
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

// Unified organization context hook - replaces multiple permission/org info calls
export function useOrganizationContext(orgId: string) {
  const { data, error, isLoading, mutate } = useSWR<OrganizationContext>(
    orgId ? `/api/organizations/${orgId}/context` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes - permissions don't change often
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  const permissions = useMemo(() => data?.permissions || {}, [data?.permissions]);
  
  return {
    context: data,
    permissions,
    orgName: data?.orgName,
    orgSlug: data?.orgSlug,
    role: data?.role,
    isOrgCreator: data?.isOrgCreator,
    hasAccess: data?.hasAccess ?? false,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Unified leads data hook - replaces separate search, pagination, and filter calls
export function useLeadsData(
  orgId: string,
  options: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    search = '',
    status = '',
    limit = 50,
    offset = 0,
    enabled = true,
  } = options;

  // Create cache key that includes all parameters
  const cacheKey = useMemo(() => {
    if (!orgId || !enabled) return null;
    
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    
    return `/api/organizations/${orgId}/leads?${params.toString()}`;
  }, [orgId, search, status, limit, offset, enabled]);

  const { data, error, isLoading, mutate } = useSWR<LeadsResponse>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds for leads data
      errorRetryCount: 3,
      errorRetryInterval: 1000,
      keepPreviousData: true, // Smooth pagination experience
    }
  );

  // Optimistic update function for bulk operations
  const optimisticUpdate = useCallback(
    (updateFn: (current: LeadsResponse) => LeadsResponse) => {
      if (data) {
        mutate(updateFn(data), false); // Update immediately without revalidation
      }
    },
    [data, mutate]
  );

  // Bulk operations with optimistic updates
  const bulkDelete = useCallback(
    async (leadIds: string[]) => {
      // Optimistic update - remove leads immediately
      optimisticUpdate((current) => ({
        ...current,
        leads: current.leads.filter(lead => !leadIds.includes(lead.lead_id)),
        totalCount: current.totalCount - leadIds.length,
      }));

      try {
        const response = await fetch(`/api/organizations/${orgId}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bulk_delete',
            leadIds,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete leads');
        }

        const result = await response.json();
        
        // Revalidate to get accurate data
        mutate();
        
        return result;
      } catch (error) {
        // Revert optimistic update on error
        mutate();
        throw error;
      }
    },
    [orgId, optimisticUpdate, mutate]
  );

  const bulkStatusUpdate = useCallback(
    async (leadIds: string[], newStatus: string) => {
      // Optimistic update - change status immediately
      optimisticUpdate((current) => ({
        ...current,
        leads: current.leads.map(lead => 
          leadIds.includes(lead.lead_id) 
            ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
            : lead
        ),
      }));

      try {
        const response = await fetch(`/api/organizations/${orgId}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bulk_status_update',
            leadIds,
            newStatus,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update lead status');
        }

        const result = await response.json();
        
        // Revalidate to get accurate data
        mutate();
        
        return result;
      } catch (error) {
        // Revert optimistic update on error
        mutate();
        throw error;
      }
    },
    [orgId, optimisticUpdate, mutate]
  );

  return {
    leads: data?.leads || [],
    totalCount: data?.totalCount || 0,
    hasMore: data?.hasMore || false,
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: mutate,
    bulkDelete,
    bulkStatusUpdate,
  };
}

// Dashboard data hook - consolidates multiple dashboard API calls
export function useDashboardData(orgId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `/api/organizations/${orgId}/dashboard` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute for dashboard data
      errorRetryCount: 2,
      errorRetryInterval: 2000,
    }
  );

  return {
    dashboard: data,
    totalLeads: data?.totalLeads || 0,
    leadsByStatus: data?.leadsByStatus || {},
    recentLeads: data?.recentLeads || [],
    totalTemplates: data?.totalTemplates || 0,
    totalMembers: data?.totalMembers || 0,
    recentActivity: data?.recentActivity || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

// Templates data hook with caching
export function useTemplatesData(orgId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `/api/organizations/${orgId}/templates` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 120000, // 2 minutes - templates don't change often
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  return {
    templates: data?.templates || [],
    totalTemplates: data?.totalTemplates || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Members data hook
export function useMembersData(orgId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    orgId ? `/api/organizations/${orgId}/members` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute for members data
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  );

  return {
    members: data?.members || [],
    totalMembers: data?.totalMembers || 0,
    isLoading,
    error,
    refetch: mutate,
  };
}

// Utility hook for invalidating all organization-related cache
export function useInvalidateOrgCache() {
  return useCallback(
    (orgId: string) => {
      // Invalidate all organization-related cache keys by re-fetching
      // This is a simplified approach - in production you'd want to use mutate from useSWRConfig
      console.log(`Invalidating cache for organization: ${orgId}`);
      // Note: This should be implemented with useSWRConfig for proper cache invalidation
    },
    []
  );
}

// Combined hook for organization page - gets all necessary data in optimal way
export function useOrganizationPage(orgId: string) {
  const context = useOrganizationContext(orgId);
  const dashboard = useDashboardData(orgId);
  const invalidateCache = useInvalidateOrgCache();

  // Only fetch dashboard if user has access
  const shouldFetchDashboard = context.hasAccess && !context.isLoading;

  return {
    context,
    dashboard: shouldFetchDashboard ? dashboard : { 
      dashboard: null, 
      isLoading: false, 
      error: null 
    },
    isLoading: context.isLoading,
    error: context.error || dashboard.error,
    invalidateCache: () => invalidateCache(orgId),
  };
}

const optimizedDataHooks = {
  useOrganizationContext,
  useLeadsData,
  useDashboardData,
  useTemplatesData,
  useMembersData,
  useInvalidateOrgCache,
  useOrganizationPage,
};

export default optimizedDataHooks;
