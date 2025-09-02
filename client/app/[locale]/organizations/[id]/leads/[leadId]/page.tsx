import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import LeadDetailClient from "./LeadDetailClient";

type PageProps = { 
  params: Promise<{ 
    id: string; 
    locale: string; 
    leadId: string; 
  }> 
};

type LeadDetailResponse = {
  lead_id: string;
  template_id: string;
  template_name: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  status: string;
  field_values: Record<string, string>;
  template_fields: Array<{
    id: string;
    field_key: string;
    label: string;
    field_type: string;
    is_required: boolean;
    sort_order: number;
  }>;
  has_access: boolean;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id: orgId, locale, leadId } = await params;
  
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  try {
    // Use optimized database function to get all lead data in one query
    const { data: leadDetail, error } = await sb
      .rpc('get_lead_with_details', {
        p_lead_id: leadId,
        p_org_id: orgId,
        p_user_id: auth.user.id
      })
      .single() as { data: LeadDetailResponse | null; error: unknown };

    if (error) {
      console.error('Error fetching lead details:', error);
      redirect(`/${locale}/organizations/${orgId}/leads`);
    }

    if (!leadDetail) {
      redirect(`/${locale}/organizations/${orgId}/leads`);
    }

    if (!leadDetail.has_access) {
      redirect(`/${locale}/organizations/${orgId}/access-denied`);
    }

    // Transform the optimized response to match the client component expectations
    const transformedLead = {
      id: leadDetail.lead_id,
      template_id: leadDetail.template_id,
      created_by: leadDetail.created_by,
      created_at: leadDetail.created_at,
      updated_at: leadDetail.updated_at,
      status: leadDetail.status,
      lead_field_values: Object.entries(leadDetail.field_values || {}).map(([fieldId, value]) => {
        const templateField = leadDetail.template_fields.find(f => f.id === fieldId);
        return {
          value: value,
          lead_fields: templateField ? [{
            id: templateField.id,
            label: templateField.label,
            field_type: templateField.field_type,
            is_required: templateField.is_required,
            sort_order: templateField.sort_order
          }] : []
        };
      }).filter(fv => fv.lead_fields.length > 0)
    };

    const transformedTemplate = {
      id: leadDetail.template_id,
      name: leadDetail.template_name,
      description: undefined,
      lead_fields: leadDetail.template_fields
    };

    // Transform field_values object into the expected format and group by type
    const fieldsByType: Record<string, Array<{
      id: string;
      label: string;
      field_type: string;
      is_required: boolean;
      sort_order: number;
      value: string;
    }>> = {};

    const existingFieldIds = new Set<string>();

    // Process existing field values
    Object.entries(leadDetail.field_values || {}).forEach(([fieldId, value]) => {
      const templateField = leadDetail.template_fields.find(f => f.id === fieldId);
      if (templateField) {
        existingFieldIds.add(fieldId);
        const type = templateField.field_type;
        if (!fieldsByType[type]) fieldsByType[type] = [];
        fieldsByType[type].push({
          id: templateField.id,
          label: templateField.label,
          field_type: templateField.field_type,
          is_required: templateField.is_required,
          sort_order: templateField.sort_order,
          value: value
        });
      }
    });

    // Identify missing template fields
    const missingFields = leadDetail.template_fields.filter(
      (templateField) => !existingFieldIds.has(templateField.id)
    );

    // Sort fields by sort_order within each type
    Object.keys(fieldsByType).forEach(type => {
      fieldsByType[type].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    return (
      <LeadDetailClient 
        lead={transformedLead}
        template={transformedTemplate}
        fieldsByType={fieldsByType}
        missingFields={missingFields}
        orgId={orgId}
        locale={locale}
      />
    );
  } catch (error) {
    console.error('Error in lead detail page:', error);
    redirect(`/${locale}/organizations/${orgId}/leads`);
  }
}
