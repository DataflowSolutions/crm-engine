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

export default async function LeadDetailPage({ params }: PageProps) {
  const { id: orgId, locale, leadId } = await params;
  
  // Debug parameters
  console.log("🔍 [Lead Detail] Debug params:", { orgId, locale, leadId });
  
  const sb = await createClient();

  // Check auth and access
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization
  const { data: org } = await sb
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    redirect(`/${locale}/organizations`);
  }

  // Get lead with all field values and template information
  const { data: lead, error: leadError } = await sb
    .from("leads")
    .select(`
      id, 
      template_id, 
      created_by, 
      created_at, 
      updated_at, 
      status,
      lead_field_values!lead_field_values_lead_id_fkey (
        value,
        lead_fields!lead_field_values_field_id_fkey (
          id,
          label,
          field_key,
          field_type,
          is_required,
          sort_order
        )
      )
    `)
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .single();

  // Get template information with all fields
  const { data: template } = await sb
    .from("lead_templates")
    .select(`
      id, 
      name, 
      description,
      lead_fields!fld_tpl_fk (
        id,
        label,
        field_key,
        field_type,
        is_required,
        sort_order
      )
    `)
    .eq("id", lead?.template_id)
    .single();

  // Debug logging  
  console.log("🔍 [Lead Detail] Debug info:", { lead, leadError, leadId, orgId });
  console.log("🔍 [Lead Detail] Field values:", lead?.lead_field_values);
  console.log("🔍 [Lead Detail] Template fields:", template?.lead_fields);

  if (!lead) {
    console.log("🔍 [Lead Detail] Lead not found, redirecting to leads page");
    redirect(`/${locale}/organizations/${orgId}/leads`);
  }

  // Group fields by type for better organization
  const fieldsByType = lead.lead_field_values?.reduce((acc, fieldValue) => {
    const field = fieldValue.lead_fields;
    console.log("🔍 [Lead Detail] Processing field:", { fieldValue, field });
    if (!field) return acc;
    
    // lead_fields can be an array or single object depending on the query
    const fieldData = Array.isArray(field) ? field[0] : field;
    if (!fieldData) return acc;
    
    const type = fieldData.field_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push({
      id: fieldData.id,
      label: fieldData.label,
      field_type: fieldData.field_type,
      is_required: fieldData.is_required,
      sort_order: fieldData.sort_order,
      value: fieldValue.value
    });
    return acc;
  }, {} as Record<string, Array<{
    id: string;
    label: string;
    field_type: string;
    is_required: boolean;
    sort_order: number;
    value: string;
  }>>);

  console.log("🔍 [Lead Detail] Fields by type:", fieldsByType);

  // Identify missing template fields
  const existingFieldIds = new Set(
    lead.lead_field_values?.map(fv => {
      const field = Array.isArray(fv.lead_fields) ? fv.lead_fields[0] : fv.lead_fields;
      return field?.id;
    }).filter(Boolean) || []
  );

  const missingFields = template?.lead_fields?.filter(
    (templateField: { id: string; label: string; field_key: string; field_type: string; is_required: boolean; sort_order: number }) => 
      !existingFieldIds.has(templateField.id)
  ) || [];

  console.log("🔍 [Lead Detail] Missing fields:", missingFields);
  console.log("🔍 [Lead Detail] Existing field IDs:", Array.from(existingFieldIds));
  console.log("🔍 [Lead Detail] Template field IDs:", template?.lead_fields?.map(f => f.id));

  // Sort fields by sort_order within each type
  Object.keys(fieldsByType || {}).forEach(type => {
    fieldsByType[type].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  return (
    <LeadDetailClient 
      lead={lead}
      template={template}
      fieldsByType={fieldsByType}
      missingFields={missingFields}
      orgId={orgId}
      locale={locale}
    />
  );
}
