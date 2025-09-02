// Optimized Leads Page
// /app/[locale]/organizations/[id]/leads/page-optimized.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import LeadsClient from './LeadsClient';
import { getUserPermissions } from "@/utils/permissions";

type PageProps = { params: Promise<{ id: string; locale: string }> };

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
};

type OrganizationInfoResponse = {
  role: string;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
};

export default async function LeadsPageOptimized({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

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

  // Get leads using optimized function
  const { data: leads, error: leadsError } = await sb
    .rpc('get_leads_with_fields', {
      p_org_id: orgId,
      p_limit: 100,
      p_offset: 0,
      p_status_filter: null
    }) as { data: OptimizedLead[] | null; error: unknown };

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
  }

  // Convert optimized leads to the format expected by LeadsClient
  const formattedLeads = (leads || []).map(lead => ({
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
    }))
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
