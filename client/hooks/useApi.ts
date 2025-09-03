import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/app/utils/supabase/client';

// Key factories for consistent query key management
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (orgId: string, filters?: Record<string, unknown>) => [...leadKeys.lists(), orgId, filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

export const orgKeys = {
  all: ['organizations'] as const,
  lists: () => [...orgKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...orgKeys.lists(), filters] as const,
  details: () => [...orgKeys.all, 'detail'] as const,
  detail: (id: string) => [...orgKeys.details(), id] as const,
  members: (id: string) => [...orgKeys.detail(id), 'members'] as const,
  permissions: (id: string, userId: string) => [...orgKeys.detail(id), 'permissions', userId] as const,
};

// Optimized leads fetching hook
export function useLeads(
  orgId: string, 
  options: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const { search = '', status = '', page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: leadKeys.list(orgId, { search, status, page, limit }),
    queryFn: async () => {
      const sb = createClient();
      
      let query;
      if (search.trim()) {
        // For search, get all results first then paginate client-side
        query = sb.rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: 1000, // Get more results for client-side filtering
          p_offset: 0,
          p_status_filter: status || null
        });
      } else {
        // Use regular leads RPC function
        query = sb.rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: limit,
          p_offset: offset,
          p_status_filter: status || null
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let results = data || [];
      
      // Apply client-side search filtering and pagination if search term exists
      if (search.trim()) {
        const searchTermLower = search.trim().toLowerCase();
        
        // Filter results
        const filteredResults = results.filter((lead: { status?: string; field_data?: Array<{ value?: string }> }) => {
          // Search in status
          if (lead.status?.toLowerCase().includes(searchTermLower)) {
            return true;
          }
          // Search in field data
          if (Array.isArray(lead.field_data)) {
            return lead.field_data.some((field: { value?: string }) => 
              field.value?.toLowerCase().includes(searchTermLower)
            );
          }
          return false;
        });
        
        // Apply pagination to filtered results
        const searchStartIndex = offset;
        results = filteredResults.slice(searchStartIndex, searchStartIndex + limit);
      }
      
      return results;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!orgId, // Only run if orgId exists
  });
}

// Lead detail hook
export function useLead(leadId: string) {
  return useQuery({
    queryKey: leadKeys.detail(leadId),
    queryFn: async () => {
      const sb = createClient();
      const { data, error } = await sb
        .from('leads')
        .select(`
          *,
          lead_field_values (
            value,
            lead_fields (
              label,
              field_type,
              required
            )
          )
        `)
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!leadId,
  });
}

// Organization members hook
export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: async () => {
      const sb = createClient();
      const { data, error } = await sb
        .rpc('get_organization_members', { p_org_id: orgId });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!orgId,
  });
}

// User permissions hook
export function useUserPermissions(orgId: string, userId: string) {
  return useQuery({
    queryKey: orgKeys.permissions(orgId, userId),
    queryFn: async () => {
      const sb = createClient();
      const { data, error } = await sb
        .rpc('get_user_permissions_fast', {
          p_user_id: userId,
          p_org_id: orgId
        })
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - permissions don't change often
    enabled: !!(orgId && userId),
  });
}

// Lead status update mutation
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      status 
    }: { 
      leadId: string; 
      status: string; 
      orgId: string; 
    }) => {
      const sb = createClient();
      const { error } = await sb
        .from('leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;
      return { leadId, status };
    },
    onSuccess: (data) => {
      // Invalidate and refetch leads lists
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      // Update the specific lead cache
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(data.leadId) });
    },
    onError: (error) => {
      console.error('Failed to update lead status:', error);
    },
  });
}

// Bulk lead operations
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leadIds, 
      orgId 
    }: { 
      leadIds: string[]; 
      orgId: string; 
    }) => {
      const response = await fetch(`/api/organizations/${orgId}/leads/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete leads');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all leads queries
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete leads:', error);
    },
  });
}

// Member management mutations
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      membershipId,
      newRole
    }: {
      orgId: string;
      membershipId: string;
      newRole: string;
    }) => {
      const { updateMemberRole } = await import('@/app/[locale]/organizations/[id]/members/actions');
      return await updateMemberRole(orgId, membershipId, newRole as 'owner' | 'admin' | 'member' | 'viewer');
    },
    onSuccess: (_, variables) => {
      // Invalidate members list
      queryClient.invalidateQueries({ queryKey: orgKeys.members(variables.orgId) });
    },
    onError: (error) => {
      console.error('Failed to update member role:', error);
    },
  });
}
