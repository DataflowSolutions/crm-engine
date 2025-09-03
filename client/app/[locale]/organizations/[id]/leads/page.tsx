// Optimized Leads Page with Performance Improvements

import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import OptimizedLeadsClient from './OptimizedLeadsClient';
import { getUserPermissions } from "@/utils/permissions";
import { unstable_noStore as noStore } from 'next/cache';

// Type for raw Supabase query result which might have arrays
type RawLeadFieldValue = {
  value: string;
  lead_fields: {
    label: string;
    field_type: string;
  }[] | {
    label: string;
    field_type: string;
  } | null;
};

type RawLead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: RawLeadFieldValue[];
};

type PageProps = { 
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ 
    page?: string; 
    limit?: string; 
    search?: string; 
    status?: string; 
  }>;
};

type OrganizationInfoResponse = {
  role: string;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
};

// Get auth user
async function getAuthUser() {
  const sb = await createClient();
  return await sb.auth.getUser();
}

// Get organization info
async function getOrgInfo(orgId: string, userId: string) {
  const sb = await createClient();
  const { data: orgInfo, error } = await sb
    .rpc('get_user_permissions_fast', {
      p_user_id: userId,
      p_org_id: orgId
    })
    .single() as { data: OrganizationInfoResponse | null; error: unknown };
  
  return { orgInfo, error };
}

// Get leads data with pagination - disable caching for dynamic data
async function getLeadsData(
  orgId: string, 
  page: number = 1, 
  limit: number = 10,
  search?: string,
  status?: string
) {
  // Disable caching for dynamic pagination data
  noStore();
  
  const sb = await createClient();
  
  // Calculate offset for pagination
  const offset = (page - 1) * limit;
  
  try {
    if (search && search.trim()) {
      // For search, we need to get all results first, then paginate client-side
      const { data: allLeads, error } = await sb
        .rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: 1000, // Get more results for client-side filtering
          p_offset: 0,
          p_status_filter: status || null
        }) as { data: unknown[] | null; error: unknown };

      if (error) {
        console.error('Error fetching leads for search:', error);
        return { leads: [], error, totalCount: 0, hasMore: false };
      }

      // Transform results first
      const transformedLeads = (allLeads || []).map((item: unknown) => {
        const lead = item as Record<string, unknown>;
        return {
          id: lead.lead_id as string,
          template_id: lead.template_id as string | null,
          created_by: lead.created_by as string,
          created_at: lead.created_at as string,
          updated_at: lead.updated_at as string,
          status: lead.status as string,
          lead_field_values: Array.isArray(lead.field_data) ? 
            (lead.field_data as Record<string, unknown>[]).map((fieldItem: unknown) => {
              const field = fieldItem as Record<string, unknown>;
              return {
                value: (field.value as string) || '',
                lead_fields: {
                  label: (field.label as string) || 'Unknown',
                  field_type: (field.field_type as string) || 'text'
                }
              };
            }) : []
        };
      });

      // Client-side search filtering
      const searchTerm = search.trim().toLowerCase();
      const filteredLeads = transformedLeads.filter(lead => {
        // Search in status
        if (lead.status.toLowerCase().includes(searchTerm)) {
          return true;
        }
        // Search in field values
        return lead.lead_field_values.some(fieldValue => 
          fieldValue.value.toLowerCase().includes(searchTerm)
        );
      });

      // Apply pagination to search results
      const searchStartIndex = (page - 1) * limit;
      const paginatedSearchResults = filteredLeads.slice(searchStartIndex, searchStartIndex + limit);

      return { 
        leads: paginatedSearchResults, 
        error: null, 
        totalCount: filteredLeads.length,
        hasMore: filteredLeads.length > searchStartIndex + limit,
        isSearch: true
      };
    } else {
      // Use pagination function for regular browsing
      const { data: leadsData, error } = await sb
        .rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: limit,
          p_offset: offset,
          p_status_filter: status || null
        }) as { data: unknown[] | null; error: unknown };

      if (error) {
        console.error('Pagination error:', error);
        return { leads: [], error, totalCount: 0, hasMore: false };
      }

      // Transform the database function result to match client expectations
      const transformedLeads = (leadsData || []).map((item: unknown) => {
        const lead = item as Record<string, unknown>;
        return {
          id: lead.lead_id as string,
          template_id: lead.template_id as string | null,
          created_by: lead.created_by as string,
          created_at: lead.created_at as string,
          updated_at: lead.updated_at as string,
          status: lead.status as string,
          lead_field_values: Array.isArray(lead.field_data) ? 
            (lead.field_data as Record<string, unknown>[]).map((fieldItem: unknown) => {
              const field = fieldItem as Record<string, unknown>;
              return {
                value: (field.value as string) || '',
                lead_fields: {
                  label: (field.label as string) || 'Unknown',
                  field_type: (field.field_type as string) || 'text'
                }
              };
            }) : []
        };
      });

      // Get total count for pagination
      const { count } = await sb
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq(status ? 'status' : 'organization_id', status || orgId);

      return { 
        leads: transformedLeads, 
        error: null, 
        totalCount: count || 0,
        hasMore: count ? count > offset + limit : false,
        isSearch: false
      };
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    return { leads: [], error, totalCount: 0, hasMore: false, isSearch: !!(search && search.trim()) };
  }
}

export default async function LeadsPageOptimized({ params, searchParams }: PageProps) {
  const { id: orgId, locale } = await params;
  const urlParams = await searchParams;
  const { 
    page = '1', 
    limit = '10', 
    search = '', 
    status = '' 
  } = urlParams;
  
  const currentPage = parseInt(page, 10) || 1;
  const pageLimit = parseInt(limit, 10) || 10;

  // Check auth with request deduplication
  const { data: auth } = await getAuthUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization info with per-request caching
  const { orgInfo, error: orgError } = await getOrgInfo(orgId, auth.user.id);

  if (orgError || !orgInfo) {
    redirect(`/${locale}/organizations`);
  }

  // Get user permissions using optimized function
  const permissions = await getUserPermissions(orgId, auth.user.id);

  // Get leads data with pagination and search
  const { leads, error: leadsError, totalCount, isSearch } = await getLeadsData(
    orgId, 
    currentPage, 
    pageLimit,
    search || undefined,
    status || undefined
  );

  if (leadsError) {
    console.error('Error loading leads:', leadsError);
  }

  return (
    <OptimizedLeadsClient 
      leads={leads as RawLead[]}
      orgId={orgId} 
      orgName={orgInfo.org_name || 'Organization'} 
      locale={locale}
      permissions={permissions}
      initialPage={currentPage}
      totalCount={totalCount}
      initialSearch={search || ''}
      initialStatus={status || ''}
      isSearch={isSearch || false}
    />
  );
}
