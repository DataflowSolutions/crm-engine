// Optimized Leads Page with Search
// /app/[locale]/organizations/[id]/leads/page-optimized.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import LeadsClient from './LeadsClient';
import { getUserPermissions } from "@/utils/permissions";

type PageProps = { 
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
};

// Optimized type for leads with pre-processed field data
type OptimizedLead = {
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
};

type OrganizationInfoResponse = {
  role: string;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
};

export default async function LeadsPageOptimized({ params, searchParams }: PageProps) {
  const { id: orgId, locale } = await params;
  const { search = '', status = '', page = '1' } = await searchParams;
  
  const sb = await createClient();
  const currentPage = parseInt(page);
  const itemsPerPage = 50;
  const offset = (currentPage - 1) * itemsPerPage;

  // Check auth and access
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization info and permissions in one optimized call
  const { data: orgInfo, error: orgError } = await sb
    .rpc('get_user_permissions_fast', {
      p_user_id: auth.user.id,
      p_org_id: orgId
    })
    .single() as { data: OrganizationInfoResponse | null; error: unknown };

  if (orgError || !orgInfo) {
    redirect(`/${locale}/organizations`);
  }

  let leads: OptimizedLead[] = [];

  try {
    if (search.trim()) {
      // Use search function when there's a search term
      const { data: searchResults, error: searchError } = await sb
        .rpc('search_leads', {
          p_org_id: orgId,
          p_search_term: search.trim(),
          p_status_filter: status || null,
          p_limit: itemsPerPage,
          p_offset: offset
        }) as { data: OptimizedLead[] | null; error: unknown };

      if (searchError) {
        console.error('Error searching leads:', searchError);
      } else {
        leads = searchResults || [];
      }
    } else {
      // Use regular get_leads_with_fields function
      const { data: leadsResults, error: leadsError } = await sb
        .rpc('get_leads_with_fields', {
          p_org_id: orgId,
          p_limit: itemsPerPage,
          p_offset: offset,
          p_status_filter: status || null
        }) as { data: OptimizedLead[] | null; error: unknown };

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
      } else {
        leads = leadsResults || [];
      }
    }
  } catch (error) {
    console.error('Error in leads page:', error);
    
    // Fallback to basic query if optimized functions fail
    const { data: fallbackLeads, error: fallbackError } = await sb
      .from('leads')
      .select(`
        id,
        template_id,
        created_by,
        created_at,
        updated_at,
        status,
        lead_field_values (
          value,
          lead_fields (
            label,
            field_type
          )
        )
      `)
      .eq('organization_id', orgId)
      .eq(status ? 'status' : 'organization_id', status || orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + itemsPerPage - 1);

    if (!fallbackError && fallbackLeads) {
      leads = fallbackLeads.map(lead => ({
        lead_id: lead.id,
        template_id: lead.template_id || '',
        created_by: lead.created_by,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        status: lead.status,
        field_data: (lead.lead_field_values || []).map((lfv: { value: string; lead_fields: { label: string; field_type: string }[] }) => ({
          value: lfv.value,
          label: lfv.lead_fields?.[0]?.label || 'Unknown',
          field_type: lfv.lead_fields?.[0]?.field_type || 'text'
        }))
      }));
    }
  }

  // Convert optimized leads to the format expected by LeadsClient
  const formattedLeads = leads.map(lead => ({
    id: lead.lead_id,
    template_id: lead.template_id || null,
    created_by: lead.created_by,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    status: lead.status,
    lead_field_values: lead.field_data.map(field => ({
      value: field.value,
      lead_fields: {
        label: field.label,
        field_type: field.field_type
      }
    })),
    relevance_score: lead.relevance_score
  }));

  // Get user permissions using optimized function
  const permissions = await getUserPermissions(orgId, auth.user.id);

  return (
    <LeadsClient 
      leads={formattedLeads} 
      orgId={orgId} 
      orgName={orgInfo.org_name || 'Organization'} 
      locale={locale}
      permissions={permissions}
    />
  );
}
