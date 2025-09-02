import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Mail, Phone, Building, FileText } from "lucide-react";
import InteractiveStatusBadge from "../../InteractiveStatusBadge";
import { StatusType } from "@/app/types/status";
import { getLeadDisplayName } from "@/utils/leadHelpers";

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
          field_type,
          is_required,
          sort_order
        )
      )
    `)
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .single();

  // Get template information separately
  const { data: template } = await sb
    .from("lead_templates")
    .select("id, name, description")
    .eq("id", lead?.template_id)
    .single();

  // Debug logging  
  console.log("🔍 [Lead Detail] Debug info:", { lead, leadError, leadId, orgId });
  console.log("🔍 [Lead Detail] Field values:", lead?.lead_field_values);

  if (!lead) {
    console.log("🔍 [Lead Detail] Lead not found, redirecting to leads page");
    redirect(`/${locale}/organizations/${orgId}/leads`);
  }

  // Group fields by type for better organization
  const fieldsByType = lead.lead_field_values?.reduce((acc, fieldValue) => {
    const field = fieldValue.lead_fields;
    console.log("🔍 [Lead Detail] Processing field:", { fieldValue, field });
    if (!field) return acc;
    
    // lead_fields is a single object, not an array
    const fieldData = Array.isArray(field) ? field[0] : field;
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

  // Sort fields by sort_order within each type
  Object.keys(fieldsByType || {}).forEach(type => {
    fieldsByType[type].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  });

  const getFieldIcon = (fieldType: string) => {
    switch (fieldType.toLowerCase()) {
      case 'email': return Mail;
      case 'phone': return Phone;
      case 'company': return Building;
      case 'text':
      case 'textarea': return FileText;
      default: return User;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/organizations/${orgId}/leads`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getLeadDisplayName(lead)}
              </h1>
              <p className="text-gray-600">{template?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InteractiveStatusBadge 
              status={lead.status as StatusType}
              onStatusChange={async (newStatus) => {
                // Handle status update for individual lead page
                console.log(`Updating lead ${lead.id} to status ${newStatus}`);
                // You may want to add proper status update logic here
              }}
              isUpdating={false}
            />
          </div>
        </div>

        {/* Lead Information Cards */}
        <div className="space-y-6">
          {/* Template Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Template</label>
                <p className="text-gray-900">{template?.name}</p>
              </div>
              {template?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{template.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lead Fields */}
          {(() => {
            console.log('🎯 [Lead Detail] Rendering condition check:');
            console.log('  fieldsByType:', fieldsByType);
            console.log('  fieldsByType exists:', !!fieldsByType);
            console.log('  Object.keys(fieldsByType).length:', fieldsByType ? Object.keys(fieldsByType).length : 'N/A');
            console.log('  Should render fields:', fieldsByType && Object.keys(fieldsByType).length > 0);
            return null;
          })()}
          {fieldsByType && Object.keys(fieldsByType).length > 0 ? (
            Object.entries(fieldsByType).map(([fieldType, fields]) => (
              <div key={fieldType} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                  {fieldType} Fields
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fields.map((field) => {
                    const Icon = getFieldIcon(field.field_type);
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <label className="text-sm font-medium text-gray-500">
                            {field.label}
                            {field.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                        <div className="bg-gray-50 rounded-md p-3">
                          {field.value ? (
                            <p className="text-gray-900 break-words">
                              {field.field_type === 'email' && field.value ? (
                                <a 
                                  href={`mailto:${field.value}`} 
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  {field.value}
                                </a>
                              ) : field.field_type === 'phone' && field.value ? (
                                <a 
                                  href={`tel:${field.value}`} 
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  {field.value}
                                </a>
                              ) : (
                                field.value
                              )}
                            </p>
                          ) : (
                            <p className="text-gray-500 italic">No value provided</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-center">No field data available for this lead.</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-gray-900">
                    {new Date(lead.created_at).toLocaleDateString()} at{' '}
                    {new Date(lead.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">
                    {new Date(lead.updated_at).toLocaleDateString()} at{' '}
                    {new Date(lead.updated_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Lead ID</label>
                  <p className="text-gray-900 font-mono text-sm">{lead.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
